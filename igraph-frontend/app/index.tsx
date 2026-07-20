import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as authService from '../services/authService';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Where an authenticated user resumes to — the screen they were last on,
  // or Home if nothing was recorded (e.g. first-ever sign-in this session).
  const [lastRoute, setLastRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await authService.getAccessToken();
        if (token) {
          const [result, savedRoute] = await Promise.all([
            authService.verifyToken(),
            authService.getLastRoute(),
          ]);
          setIsAuthenticated(result.success);
          setLastRoute(savedRoute);
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
  return (
    <Redirect href={(isAuthenticated ? (lastRoute || '/(tabs)/home') : '/(auth)/signin') as any} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
});