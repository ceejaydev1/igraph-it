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
            __html: `html, body, #root { background-color: #ffffff; }`,
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
