// app/index.tsx

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as authService from '../services/authService';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await authService.getAccessToken();
        if (token) {
          const result = await authService.verifyToken();
          setIsAuthenticated(result.success);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // Return nothing (just background) while checking
  if (isAuthenticated === null) {
    return <View style={styles.container} />;
  }

  // Instant redirect - NO SPINNER
  return <Redirect href={isAuthenticated ? '/(tabs)/home' : '/(auth)/signin'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
});