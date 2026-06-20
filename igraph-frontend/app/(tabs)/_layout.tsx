// app/(tabs)/_layout.tsx

import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as authService from '../../services/authService';
import Navbar from '../../components/Navbar';

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

  // Return null while loading - splash screen handles the loading state
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
        }}
      >
        <Stack.Screen name="home" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="create" options={{ title: 'Create Diagram' }} />
        <Stack.Screen name="reference" options={{ title: 'Learning Reference' }} />
        <Stack.Screen name="userAccount" options={{ title: 'Profile' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
});