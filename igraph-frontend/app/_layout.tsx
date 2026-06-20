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

// Measure actual network speed
const measureNetworkSpeed = async (): Promise<number> => {
  try {
    const startTime = Date.now();
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    await fetch(`${API_URL}/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    return elapsed;
  } catch (error) {
    return 3000;
  }
};

// Calculate loading speed based on network performance
const calculateLoadingSpeed = (networkLatency: number): number => {
  const DEFAULT_SPEED = 3500;
  const MAX_SPEED = 5000;
  
  if (networkLatency < 500) {
    return DEFAULT_SPEED;
  } else if (networkLatency < 1000) {
    return Math.min(DEFAULT_SPEED + 200, MAX_SPEED);
  } else if (networkLatency < 2000) {
    return Math.min(DEFAULT_SPEED + 500, MAX_SPEED);
  } else {
    return MAX_SPEED;
  }
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showBanner, setShowBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const progressInterval = useRef<any>(null);
  const startTime = useRef(Date.now());
  const targetDuration = useRef(3500);
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
      // CHECK: Has splash already been shown in this session?
      let splashShown = false;
      
      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        splashShown = sessionStorage.getItem('splashShown') === 'true';
      } else if (Platform.OS !== 'web') {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          splashShown = await AsyncStorage.getItem('splashShown') === 'true';
        } catch (e) {
          // Fallback - if we can't check, we'll show splash
          splashShown = false;
        }
      }
      
      // If splash already shown, skip it completely
      if (splashShown) {
        console.log('[Splash] Already shown in this session, skipping');
        setIsLoading(false);
        setShowSplash(false);
        return;
      }

      console.log('[Splash] First load - showing splash screen');
      
      startTime.current = Date.now();
      isCompleted.current = false;
      setLoadingProgress(0);
      setShowSplash(true);
      
      // Step 1: Measure network speed
      const networkLatency = await measureNetworkSpeed();
      targetDuration.current = calculateLoadingSpeed(networkLatency);
      
      console.log(`[Splash] Network latency: ${networkLatency}ms`);
      console.log(`[Splash] Target duration: ${targetDuration.current}ms`);
      
      // Step 2: Start progress animation from 0%
      startProgressAnimation();
      
      // Step 3: Wait a bit before starting actual work
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Step 4: Check authentication
      const token = await authService.getAccessToken();
      
      // Step 5: Validate token if exists
      let isValidToken = false;
      if (token) {
        const result = await authService.verifyToken();
        isValidToken = result.success;
        if (!isValidToken) {
          await authService.clearTokens();
        }
      }
      
      // Step 6: Load user data if authenticated
      if (token && isValidToken) {
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
        try {
          await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      }
      
      // Step 7: Mark splash as shown for this session
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
      
      // Step 8: Wait for minimum duration if needed
      const elapsed = Date.now() - startTime.current;
      const remainingTime = targetDuration.current - elapsed;
      
      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }
      
      // Step 9: Complete progress to 100%
      completeProgress();
      
      // Step 10: Hide splash after a brief delay
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

  // Show splash screen only on first load
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