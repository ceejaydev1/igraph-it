// app/_layout.tsx
// iGraph IT — Root Layout
// Handles PWA manifest injection, service worker, install banner, and navigation

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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {

      // ✅ Inject manifest link into <head>
      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (!existingManifest) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }

      // ✅ Inject theme color meta
      const existingTheme = document.querySelector('meta[name="theme-color"]');
      if (!existingTheme) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#3b5bdb';
        document.head.appendChild(meta);
      }

      // ✅ Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((reg) => {
            console.log('[iGraph IT] Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.error('[iGraph IT] Service Worker failed:', err);
          });
      }

      // ✅ Listen for PWA install prompt
      let deferredPrompt: any = null;

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        deferredPrompt = e;
        setShowBanner(true); // Show custom install banner
      };

      const handleAppInstalled = () => {
        console.log('[iGraph IT] PWA installed successfully!');
        setShowBanner(false);
        deferredPrompt = null;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      // Expose install trigger for the banner component
      (window as any).triggerPWAInstall = async () => {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        return outcome === 'accepted';
      };

      // Don't show if already installed (standalone mode)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) setShowBanner(false);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.flex}>

        {/* ✅ PWA Install Banner — only shows on web when installable */}
        {Platform.OS === 'web' && (
          <InstallBanner
            visible={showBanner}
            onDismiss={() => setShowBanner(false)}
          />
        )}

        {/* ✅ Navigation Stack */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
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