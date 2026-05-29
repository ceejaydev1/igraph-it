// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import InstallBanner from '@/components/InstallBanner';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Helper function to detect if device is mobile
const isMobileDevice = () => {
  if (Platform.OS !== 'web') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile devices
  const isMobile = /android|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile/i.test(userAgent);
  
  // Check for tablet (treat as mobile for PWA purposes)
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  
  return isMobile || isTablet;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showBanner, setShowBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ NEW: Service Worker cleanup and management
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Function to clean up old/broken service workers
      const cleanupAndRegisterSW = async () => {
        if ('serviceWorker' in navigator) {
          console.log('[PWA] Starting Service Worker cleanup...');
          
          // Get all registered service workers
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          // Unregister old/broken service workers
          for (const registration of registrations) {
            // Check if it's an old version (doesn't have v5 in the script URL)
            const isOldVersion = registration.active && 
              !registration.active.scriptURL.includes('v5');
            
            if (isOldVersion) {
              console.log('[PWA] Unregistering old service worker:', registration.active.scriptURL);
              await registration.unregister();
            } else if (registration.active) {
              console.log('[PWA] Found current service worker:', registration.active.scriptURL);
            }
          }
          
          // Small delay to ensure cleanup is complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Register fresh service worker
          try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
              scope: '/',
              updateViaCache: 'none' // Don't cache the SW itself
            });
            console.log('[PWA] ✅ Service Worker registered successfully:', registration.scope);
            
            // Check for updates immediately
            registration.update();
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                console.log('[PWA] New service worker found, updating...');
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New service worker installed, reloading to activate...');
                    // Optionally reload to activate new SW
                    // window.location.reload();
                  }
                });
              }
            });
            
          } catch (err) {
            console.error('[PWA] ❌ Service Worker registration failed:', err);
          }
        }
      };
      
      // Run cleanup and registration
      cleanupAndRegisterSW();
      
      // Check for updates every hour
      const updateInterval = setInterval(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.update();
            console.log('[PWA] Checking for service worker updates...');
          }).catch(err => {
            console.warn('[PWA] Failed to check for updates:', err);
          });
        }
      }, 60 * 60 * 1000); // Every hour
      
      return () => clearInterval(updateInterval);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const mobile = isMobileDevice();
      setIsMobile(mobile);

      // ✅ Inject manifest link into <head>
      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (!existingManifest) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
        console.log('[PWA] Manifest link injected');
      }

      // ✅ Inject theme color meta
      const existingTheme = document.querySelector('meta[name="theme-color"]');
      if (!existingTheme) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#3b5bdb';
        document.head.appendChild(meta);
        console.log('[PWA] Theme color meta injected');
      }

      // ✅ Listen for PWA install prompt
      let deferredPrompt: any = null;

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('[PWA] Install prompt ready');
        
        // Only show custom banner on mobile devices
        if (mobile) {
          setShowBanner(true);
        } else {
          // On desktop, we don't show the banner, but we keep the prompt
          console.log('[PWA] Desktop - native install icon available');
        }
      };

      const handleAppInstalled = () => {
        console.log('[PWA] ✅ App installed successfully!');
        setShowBanner(false);
        deferredPrompt = null;
        
        // Optional: Send analytics event
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'pwa_installed');
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      // Expose install trigger for the banner component
      (window as any).triggerPWAInstall = async () => {
        if (!deferredPrompt) {
          console.log('[PWA] No install prompt available');
          return false;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User install choice:', outcome);
        deferredPrompt = null;
        return outcome === 'accepted';
      };

      // Check if already installed (standalone mode)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        console.log('[PWA] Running in standalone mode (already installed)');
        setShowBanner(false);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
        delete (window as any).triggerPWAInstall;
      };
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.flex}>

        {/* ✅ PWA Install Banner — only shows on mobile web when installable */}
        {Platform.OS === 'web' && isMobile && (
          <InstallBanner
            visible={showBanner}
            onDismiss={() => setShowBanner(false)}
          />
        )}

        {/* ✅ Navigation Stack */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="landing" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Modal', headerShown: true }}
          />
        </Stack>

        <StatusBar style="auto" />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});