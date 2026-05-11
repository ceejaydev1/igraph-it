// app/(tabs)/_layout.tsx

import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as authService from '../../services/authService';

export default function TabLayout() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await authService.getAccessToken();
    if (!token) {
      router.replace('/(auth)/signin');
    }
  };

  return (
    <Stack>
      <Stack.Screen 
        name="home" 
        options={{ 
          headerShown: false,
          title: 'Dashboard',
          headerBackVisible: false,
        }} 
      />
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="explore" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}