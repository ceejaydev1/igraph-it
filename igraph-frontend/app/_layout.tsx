// app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import InstallBanner from '@/components/InstallBanner';
import * as authService from '../services/authService';
import CreativeSplashScreen from './(auth)/splash';

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

// 🚀 FIX: FAST SPLASH - Always 1.2 seconds
const calculateLoadingSpeed = (): number => {
  return 1200; // Fast and consistent
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showBanner, setShowBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const progressInterval = useRef<any>(null);
  const startTime = useRef(Date.now());
  const targetDuration = useRef(1200);
  const isCompleted = useRef(false);
  const [showSplash, setShowSplash] = useState(true);

  const startProgressAnimation = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    const startTimestamp = Date.now();
    
    progressInterval.current = setInterval(() => {
      if (isCompleted.current) return;
      
      const elapsed = Date.now() - startTimestamp;
      let newProgress = Math.min(elapsed / targetDuration.current, 0.95);
      
      if (newProgress < 0 && elapsed > 0) {
        newProgress = 0;
      }
      
      setLoadingProgress(newProgress);
      
      if (elapsed >= targetDuration.current) {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
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
      
      if (splashShown) {
        console.log('[Splash] Already shown, skipping');
        setIsLoading(false);
        setShowSplash(false);
        return;
      }

      console.log('[Splash] First load - showing');
      
      startTime.current = Date.now();
      isCompleted.current = false;
      setLoadingProgress(0);
      setShowSplash(true);
      
      // 🚀 FIX: Use fixed duration
      targetDuration.current = calculateLoadingSpeed();
      
      console.log(`[Splash] Target duration: ${targetDuration.current}ms`);
      
      startProgressAnimation();
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // 🚀 FIX: LOAD EVERYTHING IN PARALLEL
      const [tokenResult, authResult] = await Promise.all([
        authService.getAccessToken(),
        authService.verifyToken(),
      ]);
      
      let isValidToken = false;
      if (tokenResult) {
        isValidToken = authResult.success;
        if (!isValidToken) {
          await authService.clearTokens();
        }
      }
      
      // Load user data in background if authenticated
      if (tokenResult && isValidToken) {
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
        try {
          // Non-blocking - don't wait for this to complete
          fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${tokenResult}` },
          }).catch(() => {});
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      }
      
      // Mark splash as shown
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
      
      // 🚀 FIX: Complete immediately after parallel loading
      completeProgress();
      
      setTimeout(() => {
        setIsLoading(false);
        setShowSplash(false);
      }, 500);
    };
    
    initializeApp();
  }, []);

  const handleSplashFinish = () => {
    setIsLoading(false);
    setShowSplash(false);
  };

  // PWA Setup
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

  // PWA Install Banner
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
        meta.content = '#3b5bdb';
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

  if (isLoading && showSplash) {
    return (
      <CreativeSplashScreen 
        onFinish={handleSplashFinish}
        progress={loadingProgress}
      />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.flex}>
        {Platform.OS === 'web' && isMobile && (
          <InstallBanner
            visible={showBanner}
            onDismiss={() => setShowBanner(false)}
          />
        )}

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