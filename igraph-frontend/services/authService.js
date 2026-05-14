// services/authService.js
// Handles all authentication API calls to backend

import axios from 'axios';
import { Platform } from 'react-native';
import API_BASE_URL from '../constants/api';

// Conditional storage - works on both Web and Native
const storage = {
  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.log('SecureStore error (falling back to AsyncStorage):', error);
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
      }
    }
  },
  getItem: async (key) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.log('SecureStore error (falling back to AsyncStorage):', error);
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      }
    }
  },
  removeItem: async (key) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.log('SecureStore error (falling back to AsyncStorage):', error);
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
      }
    }
  },
};

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token management
export const storeTokens = async (accessToken, refreshToken) => {
  await storage.setItem('accessToken', accessToken);
  await storage.setItem('refreshToken', refreshToken);
};

export const clearTokens = async () => {
  await storage.removeItem('accessToken');
  await storage.removeItem('refreshToken');
};

export const getAccessToken = async () => {
  return await storage.getItem('accessToken');
};

export const getRefreshToken = async () => {
  return await storage.getItem('refreshToken');
};

// Auth API calls
export const signUp = async (userData) => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

export const verifyOTP = async (email, otp) => {
  const response = await api.post('/auth/verify-otp', { email, otp });
  return response.data;
};

export const resendOTP = async (email) => {
  const response = await api.post('/auth/resend-otp', { email });
  return response.data;
};

export const signIn = async (email, password) => {
  const response = await api.post('/auth/signin', { email, password });
  if (response.data.success && response.data.data?.tokens) {
    await storeTokens(
      response.data.data.tokens.accessToken,
      response.data.data.tokens.refreshToken
    );
  }
  return response.data;
};

export const googleAuth = async (idToken) => {
  try {
    const response = await api.post('/auth/google', { idToken });
    if (response.data.success && response.data.data?.tokens) {
      await storeTokens(
        response.data.data.tokens.accessToken,
        response.data.data.tokens.refreshToken
      );
    }
    return response.data;
  } catch (error) {
    console.error('Google auth error:', error.response?.data || error.message);
    // ✅ THROW the error so the frontend can catch it properly
    throw error;
  }
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

// Add these methods if not present or update them:

export const verifyResetOTP = async (email, otp) => {
  try {
    const response = await api.post('/auth/verify-reset-otp', { email, otp });
    console.log('Verify reset OTP response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Verify reset OTP error:', error.response?.data || error.message);
    throw error;
  }
};

export const resetPassword = async (email, otp, newPassword) => {
  try {
    const response = await api.post('/auth/reset-password', { 
      email, 
      otp, 
      newPassword 
    });
    console.log('Reset password response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Reset password error:', error.response?.data || error.message);
    throw error;
  }
};

export const refreshToken = async () => {
  const refresh = await getRefreshToken();
  if (!refresh) throw new Error('No refresh token');
  
  const response = await api.post('/auth/refresh-token', { refreshToken: refresh });
  if (response.data.success && response.data.data?.accessToken) {
    await storage.setItem('accessToken', response.data.data.accessToken);
  }
  return response.data;
};

export const logout = async () => {
  const refresh = await getRefreshToken();
  if (refresh) {
    try {
      await api.post('/auth/logout', { refreshToken: refresh });
    } catch (e) {
      console.log('Logout error:', e);
    }
  }
  await clearTokens();
};

export const checkAuthStatus = async () => {
  const token = await getAccessToken();
  return !!token;
};

export default api;