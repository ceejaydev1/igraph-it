// app/index.tsx
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as authService from '../services/authService';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 App initializing...');
      
      try {
        const token = await authService.getAccessToken();
        if (token) {
          const result = await authService.verifyToken();
          setIsAuthenticated(result.success);
          if (result.success) {
            console.log('✅ User is authenticated');
          } else {
            console.log('⚠️ Token invalid, redirecting to sign in');
          }
        } else {
          console.log('🔑 No token found, redirecting to sign in');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4c6fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/home' : '/(auth)/signin'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4a5568',
  },
});