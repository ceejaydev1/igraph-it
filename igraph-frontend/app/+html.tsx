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
        {/* maximum-scale=1/user-scalable=no disables the browser's own native
            pinch-zoom-the-page gesture. That's deliberate, not an
            accessibility oversight: this app is a canvas editor with its own
            dedicated pinch-to-zoom for the diagram content (see
            DiagramCanvas.tsx) — the same tradeoff Figma, draw.io and Miro all
            make on mobile. Without this, pinching anywhere off the canvas
            (top bar, toolbar, empty chrome) still triggers the OS's native
            page zoom, and once zoomed in, panning the zoomed page is
            indistinguishable from "the screen scrolling" — a compositor-level
            browser behavior that no amount of CSS overflow/position:fixed on
            body can touch, since it happens beneath the layout/CSS layer
            entirely. */}
        {/* viewport-fit=cover is what lets the page render behind system UI
            (notches, home indicators, on-screen nav bars) in the first
            place — without it, env(safe-area-inset-*) (what
            useSafeAreaInsets() reads on web) can never report anything but
            0, no matter what a component does with the value. See
            Navbar.tsx's bottomNavCard for the fix this enables: the docked
            mobile bottom bar was using a hardcoded, platform-guessed
            padding instead of the device's actual inset, so it rendered
            underneath (not above) 3-button Android nav bars taller than
            that guess. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover" />
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

                 An earlier version of this rule used 'inset: 0' (no explicit width/
                 height) specifically to avoid the classic height:100%-resolves-
                 against-the-largest-viewport bug. That held on initial load, but
                 verified live on a real device: Chrome for Android collapses its own
                 address bar on the first scroll/touch (to give the page more room),
                 and a position:fixed box sized purely via inset's implicit top+bottom
                 does NOT reflow to fill the newly revealed space — it stays pinned to
                 whatever the small (address-bar-visible) viewport was at first paint,
                 leaving a real gap of exposed background below the docked mobile
                 toolbar the moment the address bar hides. 'dvh'/'dvw' (dynamic
                 viewport units) exist specifically for this — spec'd to track the
                 live viewport as browser chrome shows/hides, unlike vh/%, which lock
                 to a fixed size on first computation. Explicit width/height here
                 (not inset's implicit ones) is what lets the @supports override
                 below actually take hold; vh/vw are the fallback for browsers
                 without dvh/dvw support. */
              html { overflow: hidden; }
              body {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                overflow: hidden;
              }
              @supports (height: 100dvh) {
                body { height: 100dvh; }
              }
              @supports (width: 100dvw) {
                body { width: 100dvw; }
              }
            `,
          }}
        />
        {/* PWA tags (manifest link, apple-touch-icon, register-sw script,
            etc.) are NOT added here — Expo's static export of this file
            silently drops <link>/<script> tags and extra <meta> tags added
            here (verified: they're present in this source but absent from
            the built dist/index.html). scripts/inject-pwa-head.js patches
            them into dist/index.html directly after `npm run build`
            instead.

            The same export step ALSO ignores edits to the viewport <meta>'s
            content and drops the <style> block above entirely — confirmed by
            diffing a real `expo export --platform web` output against this
            source (build/deploy earlier today shipped none of the
            position:fixed/overscroll-behavior/maximum-scale changes despite
            them being right here). Dev server (`expo start --web`) renders
            this file correctly; only the static export path is affected.
            scripts/inject-pwa-head.js patches both of those into
            dist/index.html too, so this source stays the single place that
            documents intent, and the script is what makes it real in the
            build that actually gets deployed. Keep the two in sync. */}
      </head>
      <body>{children}</body>
    </html>
  );
}
