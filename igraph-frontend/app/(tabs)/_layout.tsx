import React, { lazy, Suspense, useCallback, useState } from 'react';
import { Tabs, useRouter, usePathname, useFocusEffect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import * as authService from '../../services/authService';
import Navbar from '../../components/Navbar';
import { SaveProvider } from '../../contexts/SaveContext';
import { HomeGridSkeleton } from './home';

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

  // useFocusEffect (not useEffect) on purpose: `unstable_settings.anchor =
  // '(tabs)'` in the root layout keeps this group mounted in the background
  // at all times — including while landing unauthenticated on "/" — so it
  // can be the target of the native back gesture. A plain useEffect ran this
  // auth check on that background mount too, racing app/index.tsx's own
  // check with a second, competing `router.replace('/(auth)/signin')` and
  // producing a visible flash between "/signin" and "/(auth)/signin" in the
  // address bar. Gating on focus means this only runs once the tabs group is
  // actually the visible screen.
  useFocusEffect(
    useCallback(() => {
      const applyUser = (user: any) => {
        setUserData({
          fullName: user?.fullName || '',
          email: user?.email || '',
          profilePicture: user?.profilePicture || null,
        });
      };

      const loadUserData = async () => {
        try {
          // A failed verifyToken() — not an absent client-side token — is what
          // actually means "not signed in" now: web's session lives in an
          // httpOnly cookie this code can never read directly, so the old
          // token-presence check would always misfire as "signed out" here.
          const result = await authService.verifyToken();
          if (result.success && result.data?.user) {
            authService.setCachedUser(result.data.user);
            applyUser(result.data.user);
          } else {
            const cached = await authService.getCachedUser();
            if (cached) {
              applyUser(cached);
            } else {
              router.replace('/signin');
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          const cached = await authService.getCachedUser();
          if (cached) {
            applyUser(cached);
          } else {
            router.replace('/signin');
          }
        } finally {
          setIsReady(true);
        }
      };

      loadUserData();
    }, [router])
  );

  // Was a bare transparent View — nothing behind it but the raw page
  // background, i.e. a white flash — every time this group re-verifies the
  // session on focus (including right after a successful sign-in's
  // router.replace). A skeleton reads as "loading" instead of "broken".
  if (!isReady) {
    return <HomeGridSkeleton />;
  }

  return (
    <SaveProvider>
      <View style={styles.container}>
        <Navbar
          fullName={userData.fullName}
          userEmail={userData.email}
          profilePicture={userData.profilePicture}
          showSave={isCreateScreen}
        />
        <Tabs
          screenOptions={{
            headerShown: false,
            // You have a custom <Navbar> above — hide the default tab bar.
            tabBarStyle: { display: 'none' },
            // Keep inactive screens mounted (frozen) instead of unmounting
            // them, so the Create screen's diagram survives a tab switch.
            freezeOnBlur: true,
          }}
        >
          <Tabs.Screen name="home" options={{ title: 'Dashboard' }} />
          <Tabs.Screen name="create" options={{ title: 'Create Diagram' }} />
          <Tabs.Screen name="reference" options={{ title: 'Learning Reference' }} />
          <Tabs.Screen name="userAccount" options={{ title: 'Profile' }} />
          <Tabs.Screen name="savedDiagrams" options={{ title: 'Saved Diagrams' }} />
          <Tabs.Screen name="aboutUs" options={{ title: 'About Us' }} />
          <Tabs.Screen name="privacy" options={{ title: 'Privacy & Terms' }} />
          <Tabs.Screen name="diagram/[id]" options={{ title: 'Diagram Detail' }} />
        </Tabs>
      </View>
    </SaveProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
});