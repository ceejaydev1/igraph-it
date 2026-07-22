// Runs after `expo export --platform web`. Expo's static export of
// app/+html.tsx does not preserve every hand-written <head> tag we add
// there (verified: <link rel="manifest">, <link rel="apple-touch-icon">,
// the apple-mobile-web-app-* <meta> tags, and a <script src="/register-sw.js">
// tag all silently disappear from dist/index.html even though they're
// present in the +html.tsx source) — so instead of fighting that pipeline,
// this patches the already-built dist/index.html directly, which is the
// file that's actually served/installed.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`[inject-pwa-head] ${indexPath} not found — did the export step run?`);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

const headTags = [
  '<link rel="manifest" href="/manifest.json">',
  '<link rel="apple-touch-icon" href="/icon-192.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="iGraph IT">',
].filter((tag) => !html.includes(tag));

if (headTags.length > 0) {
  html = html.replace('</head>', `${headTags.join('')}</head>`);
}

const bodyTags = ['<script src="/register-sw.js" defer></script>'].filter(
  (tag) => !html.includes(tag)
);

if (bodyTags.length > 0) {
  html = html.replace('</body>', `${bodyTags.join('')}</body>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`[inject-pwa-head] Patched ${headTags.length + bodyTags.length} tag(s) into dist/index.html`);
