// app/(tabs)/_layout.tsx

import React, { lazy, Suspense } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as authService from '../../services/authService';
import Navbar from '../../components/Navbar';

// 🚀 FIX: Lazy load heavy screens
const CreateDiagram = lazy(() => import('./create'));
const Reference = lazy(() => import('./reference'));
const AboutUs = lazy(() => import('./aboutUs'));
const SavedDiagrams = lazy(() => import('./savedDiagrams'));

// Loading fallback
const LoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4c6fff" />
  </View>
);

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [userData, setUserData] = useState({
    fullName: 'User',
    email: '',
    profilePicture: null as string | null,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkAuthAndLoadUser();
  }, []);

  const checkAuthAndLoadUser = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        router.replace('/(auth)/signin');
        return;
      }

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success && data.data.user) {
        setUserData({
          fullName: data.data.user.fullName,
          email: data.data.user.email,
          profilePicture: data.data.user.profilePicture,
        });
        setIsReady(true);
      } else {
        await authService.clearTokens();
        router.replace('/(auth)/signin');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/(auth)/signin');
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Navbar 
        fullName={userData.fullName} 
        userEmail={userData.email} 
        profilePicture={userData.profilePicture}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 200, // 🚀 FIX: Faster animation
        }}
      >
        <Stack.Screen 
          name="home" 
          options={{ 
            title: 'Dashboard',
            freezeOnBlur: true, // 🚀 FIX: Keep in memory
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
          name="diagram/[id]" 
          options={{ 
            title: 'Diagram Detail',
            freezeOnBlur: true,
          }} 
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faff',
  },
});