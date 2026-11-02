// Runs after `expo export --platform web`. Expo's static export of
// app/+html.tsx does not preserve every hand-written <head> tag we add
// there (verified: <link rel="manifest">, <link rel="apple-touch-icon">,
// the apple-mobile-web-app-* <meta> tags, and a <script src="/register-sw.js">
// tag all silently disappear from dist/index.html even though they're
// present in the +html.tsx source — so instead of fighting that pipeline,
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
  console.error(
    `[inject-pwa-head] ${indexPath} not found — did the export step run?`
  );
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
let patchCount = 0;

// --------------------------------------------------
// HEAD TAGS: PWA + Google AdSense
// --------------------------------------------------

const headTags = [
  '<link rel="manifest" href="/manifest.json">',
  '<link rel="apple-touch-icon" href="/icon-192.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="iGraph IT">',
];

// Inject missing PWA tags only
const missingHeadTags = headTags.filter((tag) => !html.includes(tag));

if (missingHeadTags.length > 0) {
  html = html.replace(
    '</head>',
    `${missingHeadTags.join('\n')}\n</head>`
  );

  patchCount += missingHeadTags.length;
}

// --------------------------------------------------
// GOOGLE ADSENSE VERIFICATION CODE
// --------------------------------------------------

// Your Google AdSense publisher ID
const adsensePublisherId = 'ca-pub-5506180025884454';

// Correct AdSense verification script
const adsenseScript = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}" crossorigin="anonymous"></script>`;

// Inject only if AdSense is not already present
if (!html.includes('adsbygoogle.js')) {
  if (html.includes('</head>')) {
    html = html.replace(
      '</head>',
      `${adsenseScript}\n</head>`
    );

    patchCount += 1;

    console.log('[inject-pwa-head] Google AdSense code injected.');
  } else {
    console.error(
      '[inject-pwa-head] Could not inject AdSense: </head> not found.'
    );
    process.exit(1);
  }
} else {
  console.log(
    '[inject-pwa-head] Google AdSense code already exists. Skipping.'
  );
}

// --------------------------------------------------
// SERVICE WORKER REGISTRATION
// --------------------------------------------------

const bodyTags = [
  '<script src="/register-sw.js" defer></script>',
].filter((tag) => !html.includes(tag));

if (bodyTags.length > 0) {
  if (html.includes('</body>')) {
    html = html.replace(
      '</body>',
      `${bodyTags.join('\n')}\n</body>`
    );

    patchCount += bodyTags.length;
  } else {
    console.error(
      '[inject-pwa-head] Could not inject service worker: </body> not found.'
    );
    process.exit(1);
  }
}

// --------------------------------------------------
// MOBILE VIEWPORT FIX
// --------------------------------------------------

// Disables native page zoom while preserving the diagram editor's
// dedicated pinch-to-zoom functionality.
//
// viewport-fit=cover enables proper safe-area inset handling.
// Keep in sync with app/+html.tsx.

const desiredViewport =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover';

const viewportRegex = /<meta name="viewport" content="[^"]*"\s*\/?>/;

if (viewportRegex.test(html)) {
  const replaced = html.replace(
    viewportRegex,
    `<meta name="viewport" content="${desiredViewport}">`
  );

  if (replaced !== html) {
    html = replaced;
    patchCount += 1;
  }
} else {
  console.warn(
    '[inject-pwa-head] No <meta name="viewport"> tag found to patch — check dist/index.html structure.'
  );
}

// --------------------------------------------------
// MOBILE SCROLL / VIEWPORT BOUNCE FIX
// --------------------------------------------------

// Mirrors the style block documented in app/+html.tsx.
//
// Pinning body prevents iOS Safari's elastic page bounce.
// Dynamic viewport units (dvh/dvw) handle browser chrome
// collapsing on mobile devices.

const mobileScrollFixStyle = `
<style id="igraph-mobile-scroll-fix">
html {
  overflow: hidden;
}

body {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  overscroll-behavior: none;
}

@supports (height: 100dvh) {
  body {
    height: 100dvh;
  }
}

@supports (width: 100dvw) {
  body {
    width: 100dvw;
  }
}

#root {
  overscroll-behavior: none;
}
</style>
`;

if (!html.includes('id="igraph-mobile-scroll-fix"')) {
  if (html.includes('</head>')) {
    html = html.replace(
      '</head>',
      `${mobileScrollFixStyle}\n</head>`
    );

    patchCount += 1;
  } else {
    console.error(
      '[inject-pwa-head] Could not inject mobile scroll fix: </head> not found.'
    );
    process.exit(1);
  }
}

// --------------------------------------------------
// WRITE UPDATED HTML
// --------------------------------------------------

fs.writeFileSync(indexPath, html, 'utf8');

console.log(
  `[inject-pwa-head] Patched ${patchCount} tag(s)/fix(es) into dist/index.html`
);