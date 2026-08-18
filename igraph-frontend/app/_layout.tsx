import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState, useRef } from 'react';
import { Platform, View, StyleSheet, Animated } from 'react-native';
import InstallBanner from '@/components/InstallBanner';
import * as authService from '../services/authService';
import CreativeSplashScreen from './(auth)/splash';
import { NotesProvider } from '../contexts/NotesContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

const isMobileDevice = () => {
  if (Platform.OS !== 'web') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobile = /android|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  return isMobile || isTablet;
};

const calculateLoadingSpeed = (): number => {
  return 1800;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showBanner, setShowBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const progressInterval = useRef<any>(null);
  const isCompleted = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [authChecked, setAuthChecked] = useState(false);

  const startProgressAnimation = (targetDuration: number) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    const startTimestamp = Date.now();

    progressInterval.current = setInterval(() => {
      if (isCompleted.current) return;

      const elapsed = Date.now() - startTimestamp;
      let newProgress = Math.min(elapsed / targetDuration, 0.95);

      if (newProgress < 0 && elapsed > 0) {
        newProgress = 0;
      }

      setLoadingProgress(newProgress);

      if (elapsed >= targetDuration) {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
        setLoadingProgress(1);
      }
    }, 16);
  };

  const completeProgress = () => {
    if (isCompleted.current) return;
    isCompleted.current = true;

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setLoadingProgress(1);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await authService.verifyToken();
        setTargetRoute(result.success ? '/(tabs)/home' : '/(auth)/signin');
      } catch (error) {
        setTargetRoute('/(auth)/signin');
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      let splashShown = false;

      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        splashShown = sessionStorage.getItem('splashShown') === 'true';
      } else if (Platform.OS !== 'web') {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          splashShown = await AsyncStorage.getItem('splashShown') === 'true';
        } catch (e) {
          splashShown = false;
        }
      }

      if (splashShown && authChecked && targetRoute) {
        console.log('[Splash] Already shown, skipping');
        setShowSplash(false);
        return;
      }

      console.log('[Splash] First load - showing');

      isCompleted.current = false;
      setLoadingProgress(0);
      setShowSplash(true);

      const targetDuration = calculateLoadingSpeed();
      startProgressAnimation(targetDuration);

      const minDisplayTime = new Promise((resolve) =>
        setTimeout(resolve, targetDuration)
      );

      await Promise.all([
        new Promise((resolve) => {
          if (authChecked && targetRoute) {
            resolve(true);
          } else {
            const checkInterval = setInterval(() => {
              if (authChecked && targetRoute) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 50);
          }
        }),
        minDisplayTime
      ]);

      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('splashShown', 'true');
      } else if (Platform.OS !== 'web') {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('splashShown', 'true');
        } catch (e) {
          console.log('Failed to save splash state:', e);
        }
      }

      completeProgress();

      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, 400);
    };

    if (authChecked && targetRoute) {
      initializeApp();
    }
  }, [authChecked, targetRoute]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const cleanupAndRegisterSW = async () => {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            const isOldVersion = registration.active &&
              !registration.active.scriptURL.includes('v5');
            if (isOldVersion) {
              await registration.unregister();
            }
          }

          try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
              scope: '/',
              updateViaCache: 'none'
            });
            registration.update();
          } catch (err) {
            console.error('[PWA] Service Worker registration failed:', err);
          }
        }
      };
      cleanupAndRegisterSW();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const mobile = isMobileDevice();
      setIsMobile(mobile);

      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (!existingManifest) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }

      const existingTheme = document.querySelector('meta[name="theme-color"]');
      if (!existingTheme) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#ffffff';
        document.head.appendChild(meta);
      }

      let deferredPrompt: any = null;

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        deferredPrompt = e;
        if (mobile) setShowBanner(true);
      };

      const handleAppInstalled = () => {
        setShowBanner(false);
        deferredPrompt = null;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      (window as any).triggerPWAInstall = async () => {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        return outcome === 'accepted';
      };

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
        delete (window as any).triggerPWAInstall;
      };
    }
  }, []);

  const pathname = usePathname();
  const segments = useSegments();
  useEffect(() => {
    if (segments[0] !== '(tabs)' || !pathname) return;
    const routeWithGroup = pathname.startsWith('/(tabs)') ? pathname : `/(tabs)${pathname}`;
    authService.saveLastRoute(routeWithGroup);
  }, [pathname, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NotesProvider>
        <View style={styles.flex}>
          {Platform.OS === 'web' && isMobile && (
            <InstallBanner
              visible={showBanner}
              onDismiss={() => setShowBanner(false)}
            />
          )}

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

          {showSplash && pathname !== '/print' && (
            <Animated.View
              style={[styles.splashOverlay, { opacity: fadeAnim }]}
              pointerEvents="auto"
            >
              <CreativeSplashScreen
                onFinish={() => {}}
                progress={loadingProgress}
              />
            </Animated.View>
          )}
        </View>
      </NotesProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});