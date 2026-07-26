import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Custom root HTML document (Expo Router convention). Matches the native/PWA
// launch screen (manifest.json's background_color, #ffffff) so the document
// paints the same color the OS launch screen already showed, before the JS
// bundle runs and before the splash component (which is its own dark navy)
// mounts on top of it.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { background-color: #ffffff; overscroll-behavior: none; }
              /* ScrollViewStyleReset (above) already sets body{overflow:hidden}, but
                 that alone doesn't stop iOS Safari's elastic page bounce — iOS treats
                 a touch-drag starting on ANY non-scrollable area as an attempt to
                 overscroll the viewport itself and rubber-bands the whole document,
                 overflow:hidden or not. Pinning body with position:fixed removes
                 the page from that gesture entirely (a fixed element can't be
                 scrolled/bounced by touch), while leaving descendant overflow:auto
                 elements — our ScrollViews inside the Shapes/Properties bottom sheets
                 — completely unaffected and still scrollable on their own.
                 inset:0 alone (no width/height) is deliberate: mobile Chrome/Android
                 resolves height:100% against the LARGEST possible viewport (address
                 bar hidden), which is taller than what's actually visible while the
                 address bar is showing — pairing that with top/bottom:0 here would
                 make 'bottom' get overridden by that oversized computed height (see
                 CSS2.1 10.6.4), leaving a real gap of blank, scrollable page below
                 the docked mobile toolbar. inset:0 with height/width left unset pins
                 all four edges directly to the live viewport with no percentage math
                 involved, so it can't drift from what's actually on screen. */
              html { overflow: hidden; }
              body { position: fixed; inset: 0; overflow: hidden; }
            `,
          }}
        />
        {/* PWA tags (manifest link, apple-touch-icon, register-sw script,
            etc.) are NOT added here — Expo's static export of this file
            silently drops <link>/<script> tags and extra <meta> tags added
            here (verified: they're present in this source but absent from
            the built dist/index.html). scripts/inject-pwa-head.js patches
            them into dist/index.html directly after `npm run build`
            instead. */}
      </head>
      <body>{children}</body>
    </html>
  );
}
