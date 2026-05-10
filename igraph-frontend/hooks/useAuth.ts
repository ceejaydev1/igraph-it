// hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as authService from '../services/authService';

interface User {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  profilePicture?: string | null;
  authProvider: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const token = await authService.getAccessToken();
      setState(prev => ({
        ...prev,
        isAuthenticated: !!token,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
      }));
    }
  }, []);

  const setUser = useCallback((user: User | null) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
    }));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.log('Logout error:', error);
    }
    // Clear user state
    setUser(null);
    // Clear auth state
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
    }));
  }, [setUser]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    setUser,
    signOut,
    checkAuth,
  };
};