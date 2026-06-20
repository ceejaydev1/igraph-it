import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as authService from '../services/authService';

interface User {
  uid: string;
  fullName: string;
  username: string;
  email: string;
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

  // ============================================================================
  // ✅ UPDATE PROFILE - Name only (no profile picture)
  // ============================================================================

  const updateProfile = useCallback(async (data: { fullName: string }) => {
    try {
      console.log('📤 useAuth.updateProfile called with:', { fullName: data.fullName });
      
      const result = await authService.updateProfile(data);
      
      if (result.success && result.data?.user) {
        // Update user state with new data
        const updatedUser: User = {
          uid: result.data.user.uid || state.user?.uid || '',
          fullName: result.data.user.fullName || data.fullName,
          username: result.data.user.username || state.user?.username || '',
          email: result.data.user.email || state.user?.email || '',
          authProvider: result.data.user.authProvider || 'email',
        };
        
        setState(prev => ({
          ...prev,
          user: updatedUser,
        }));
        
        return { success: true, data: result.data };
      }
      
      return { success: false, message: result.message || 'Update failed' };
    } catch (error: any) {
      console.error('❌ useAuth.updateProfile error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to update profile' 
      };
    }
  }, [state.user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    setUser,
    signOut,
    checkAuth,
    updateProfile,
  };
};