// register-sw.js
// Place this in igraph-frontend/public/register-sw.js
// Registers the service worker for PWA functionality

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] Install prompt ready');

  // Dispatch custom event so React can show install button
  window.dispatchEvent(new CustomEvent('pwaInstallReady'));
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] iGraph IT installed successfully!');
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('pwaInstalled'));
});

// Export trigger function for React components
window.triggerPWAInstall = async () => {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] User choice:', outcome);
  deferredPrompt = null;
  return outcome === 'accepted';
};