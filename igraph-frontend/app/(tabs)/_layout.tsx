import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import * as authService from '../../services/authService';
import Navbar from '../../components/Navbar';
import { SaveProvider } from '../../contexts/SaveContext'; // ✅ Add this import

const CreateDiagram = lazy(() => import('./create'));
const Reference = lazy(() => import('./reference'));
const AboutUs = lazy(() => import('./aboutUs'));
const SavedDiagrams = lazy(() => import('./savedDiagrams'));

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    profilePicture: null as string | null,
  });
  const [isReady, setIsReady] = useState(false);

  const isCreateScreen = pathname === '/(tabs)/create';

  useEffect(() => {
    const applyUser = (user: any) => {
      // Leave fullName as whatever the server/cache actually has (including
      // '') rather than forcing the literal word 'User' in here — Navbar's
      // own getDisplayName already falls back fullName -> email prefix ->
      // 'User', and hardcoding 'User' at this layer short-circuited that
      // email-prefix step even when a perfectly good email was available.
      setUserData({
        fullName: user?.fullName || '',
        email: user?.email || '',
        profilePicture: user?.profilePicture || null,
      });
    };

    const loadUserData = async () => {
      try {
        const token = await authService.getAccessToken();
        if (!token) {
          router.replace('/(auth)/signin');
          setIsReady(true);
          return;
        }

        // verifyToken() goes through the shared axios instance, which
        // auto-refreshes an expired access token (15 min TTL) and retries.
        // The previous raw fetch() here had no such retry — an expired
        // token on a fresh page load (when the old in-memory-only cache is
        // always empty) silently failed and left the navbar stuck on the
        // generic "User" placeholder for the rest of the session.
        const result = await authService.verifyToken();
        if (result.success && result.data?.user) {
          authService.setCachedUser(result.data.user);
          applyUser(result.data.user);
        } else {
          const cached = await authService.getCachedUser();
          if (cached) applyUser(cached);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        const cached = await authService.getCachedUser();
        if (cached) applyUser(cached);
      } finally {
        setIsReady(true);
      }
    };

    loadUserData();
  }, []);

  if (!isReady) {
    return <View style={styles.transparent} />;
  }

  return (
    <SaveProvider> {/* ✅ Wrap with SaveProvider */}
      <View style={styles.container}>
        <Navbar 
          fullName={userData.fullName} 
          userEmail={userData.email} 
          profilePicture={userData.profilePicture}
          showSave={isCreateScreen}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 200,
          }}
        >
          <Stack.Screen 
            name="home" 
            options={{ 
              title: 'Dashboard',
              freezeOnBlur: true,
            }} 
          />
          <Stack.Screen 
            name="create" 
            options={{ 
              title: 'Create Diagram',
              freezeOnBlur: true,
            }} 
          />
          <Stack.Screen 
            name="reference" 
            options={{ 
              title: 'Learning Reference',
              freezeOnBlur: true,
            }} 
          />
          <Stack.Screen 
            name="userAccount" 
            options={{ 
              title: 'Profile',
              freezeOnBlur: true,
            }} 
          />
          <Stack.Screen 
            name="savedDiagrams" 
            options={{ 
              title: 'Saved Diagrams',
              freezeOnBlur: true,
            }} 
          />
          <Stack.Screen 
            name="aboutUs" 
            options={{ 
              title: 'About Us',
              freezeOnBlur: true,
            }} 
          />
          <Stack.Screen 
            name="privacy" 
            options={{ 
              title: 'Privacy & Terms',
              freezeOnBlur: true,
            }} 
          />
          <Stack.Screen 
            name="diagram/[id]" 
            options={{ 
              title: 'Diagram Detail',
              freezeOnBlur: true,
            }} 
          />
        </Stack>
      </View>
    </SaveProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  transparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});