// Runs after `expo export --platform web`. Expo's static export of
// app/+html.tsx does not preserve every hand-written <head> tag we add
// there (verified: <link rel="manifest">, <link rel="apple-touch-icon">,
// the apple-mobile-web-app-* <meta> tags, and a <script src="/register-sw.js">
// tag all silently disappear from dist/index.html even though they're
// present in the +html.tsx source) — so instead of fighting that pipeline,
// this patches the already-built dist/index.html directly, which is the
// file that's actually served/installed.
//
// It also ignores edits to the EXISTING viewport <meta> tag's content and
// drops the custom <style> block in +html.tsx entirely (same verification:
// present in source, absent from a real `expo export` build) — the mobile
// scroll/pinch-zoom/viewport-bounce fixes below mirror what +html.tsx
// documents for exactly that reason. Keep the two in sync.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`[inject-pwa-head] ${indexPath} not found — did the export step run?`);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
let patchCount = 0;

const headTags = [
  '<link rel="manifest" href="/manifest.json">',
  '<link rel="apple-touch-icon" href="/icon-192.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="iGraph IT">',
].filter((tag) => !html.includes(tag));

if (headTags.length > 0) {
  html = html.replace('</head>', `${headTags.join('')}</head>`);
  patchCount += headTags.length;
}

const bodyTags = ['<script src="/register-sw.js" defer></script>'].filter(
  (tag) => !html.includes(tag)
);

if (bodyTags.length > 0) {
  html = html.replace('</body>', `${bodyTags.join('')}</body>`);
  patchCount += bodyTags.length;
}

// Disables the browser's own native pinch-zoom-the-page gesture. Deliberate,
// not an accessibility oversight: this app is a canvas editor with its own
// dedicated pinch-to-zoom for the diagram content (DiagramCanvas.tsx) — same
// tradeoff Figma/draw.io/Miro make on mobile. Without this, pinching off the
// canvas (top bar, toolbar, empty chrome) still triggers native page zoom,
// and a zoomed page can be panned — indistinguishable from "the screen
// scrolling" and untouchable by any CSS overflow/position fix, since it's a
// compositor-level browser behavior beneath the layout layer entirely.
// viewport-fit=cover: without it, env(safe-area-inset-*) — what
// useSafeAreaInsets() reads on web — can never report anything but 0, which
// is what let Navbar.tsx's docked mobile bottom bar ship with a hardcoded
// padding guess instead of the device's real inset (see that file for the
// other half of this fix). Keep in sync with app/+html.tsx's own copy of
// this string.
const desiredViewport = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover';
const viewportRegex = /<meta name="viewport" content="[^"]*"\s*\/?>/;
if (viewportRegex.test(html)) {
  const replaced = html.replace(viewportRegex, `<meta name="viewport" content="${desiredViewport}">`);
  if (replaced !== html) {
    html = replaced;
    patchCount += 1;
  }
} else {
  console.warn('[inject-pwa-head] No <meta name="viewport"> tag found to patch — check dist/index.html structure.');
}

// Mirrors the <style> block documented in +html.tsx: iOS Safari's elastic
// page-bounce triggers on a touch-drag starting on ANY non-scrollable area
// (rubber-bands the whole document) regardless of body{overflow:hidden} —
// that's a separate, well-known Safari quirk overflow alone doesn't stop.
// Pinning body with position:fixed removes the page from that gesture
// entirely, while descendant overflow:auto elements (the ScrollViews inside
// the Shapes/Properties bottom sheets) keep scrolling normally on their own.
//
// An earlier version used inset:0 (no explicit width/height) to dodge the
// classic height:100%-resolves-against-the-largest-viewport bug. Verified
// live on a real device that this wasn't enough: Chrome for Android
// collapses its own address bar on the first scroll/touch, and a
// position:fixed box sized purely via inset's implicit top+bottom does NOT
// reflow to fill the newly revealed space — it stays pinned to whatever the
// small (address-bar-visible) viewport was at first paint, leaving a gap of
// exposed background below the docked mobile toolbar the moment the address
// bar hides. dvh/dvw (dynamic viewport units) exist specifically for this —
// spec'd to track the live viewport as browser chrome shows/hides, unlike
// vh/%, which lock to a fixed size on first computation. Explicit width/
// height (not inset's implicit ones) is what lets the @supports override
// take hold; plain vh/vw is the fallback for browsers without dvh/dvw.
const mobileScrollFixStyle = '<style id="igraph-mobile-scroll-fix">html{overflow:hidden}body{position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:hidden;overscroll-behavior:none}@supports (height: 100dvh){body{height:100dvh}}@supports (width: 100dvw){body{width:100dvw}}#root{overscroll-behavior:none}</style>';
if (!html.includes('id="igraph-mobile-scroll-fix"')) {
  html = html.replace('</head>', `${mobileScrollFixStyle}</head>`);
  patchCount += 1;
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`[inject-pwa-head] Patched ${patchCount} tag(s)/fix(es) into dist/index.html`);
