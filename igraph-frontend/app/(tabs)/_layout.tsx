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
    fullName: 'User',
    email: '',
    profilePicture: null as string | null,
  });
  const [isReady, setIsReady] = useState(false);

  const isCreateScreen = pathname === '/(tabs)/create';

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await authService.getAccessToken();
        if (!token) {
          router.replace('/(auth)/signin');
          setIsReady(true);
          return;
        }
        let user = await authService.getCachedUser();
        
        if (user) {
          setUserData({
            fullName: user.fullName || 'User',
            email: user.email || '',
            profilePicture: user.profilePicture || null,
          });
        } else {
          // Only fetch if cache is empty (shouldn't happen since we pre-loaded)
          const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.user) {
              user = data.data.user;
              authService.setCachedUser(user);
              setUserData({
                fullName: user.fullName || 'User',
                email: user.email || '',
                profilePicture: user.profilePicture || null,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
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