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

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newAccessToken = await refreshToken();
        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Redirect to login if refresh fails
        if (Platform.OS === 'web') {
          window.location.href = '/(auth)/signin';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Token management
export const storeTokens = async (accessToken, refreshToken) => {
  await storage.setItem('accessToken', accessToken);
  await storage.setItem('refreshToken', refreshToken);
};

export const clearTokens = async () => {
  await storage.removeItem('accessToken');
  await storage.removeItem('refreshToken');
  if (Platform.OS === 'web') {
    localStorage.removeItem('user');
  }
};

export const getAccessToken = async () => {
  return await storage.getItem('accessToken');
};

export const getRefreshToken = async () => {
  return await storage.getItem('refreshToken');
};

// Auth API calls
export const signUp = async (userData, consentTimestamp = null) => {
  const payload = consentTimestamp 
    ? { ...userData, consentTimestamp }
    : userData;
  const response = await api.post('/auth/signup', payload);
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

// Add AbortController for timeout
let pendingRequest = null;

export const signIn = async (email, password, consentTimestamp = null) => {
  // Cancel previous pending request
  if (pendingRequest) {
    pendingRequest.abort();
  }
  
  const controller = new AbortController();
  pendingRequest = controller;
  
  try {
    const payload = consentTimestamp 
      ? { email, password, consentTimestamp }
      : { email, password };
    
    const response = await api.post('/auth/signin', 
      payload,
      { 
        signal: controller.signal,
        timeout: 5000 // 5 second timeout
      }
    );
    pendingRequest = null;
    
    if (response.data.success && response.data.data?.tokens) {
      await storeTokens(
        response.data.data.tokens.accessToken,
        response.data.data.tokens.refreshToken
      );
      if (Platform.OS === 'web' && response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
    }
    return response.data;
  } catch (error) {
    pendingRequest = null;
    throw error;
  }
};

export const googleAuth = async (idToken, consentTimestamp = null) => {
  try {
    const payload = consentTimestamp 
      ? { idToken, consentTimestamp }
      : { idToken };
    
    const response = await api.post('/auth/google', payload);
    if (response.data.success && response.data.data?.tokens) {
      await storeTokens(
        response.data.data.tokens.accessToken,
        response.data.data.tokens.refreshToken
      );
      if (Platform.OS === 'web' && response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
    }
    return response.data;
  } catch (error) {
    console.error('Google auth error:', error.response?.data || error.message);
    throw error;
  }
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

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
    return response.data.data.accessToken;
  }
  return null;
};

export const verifyToken = async () => {
  try {
    const token = await getAccessToken();
    if (!token) return { success: false };
    
    const response = await api.get('/auth/verify');
    return response.data;
  } catch (error) {
    return { success: false };
  }
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
  if (!token) return false;
  
  try {
    const result = await verifyToken();
    return result.success;
  } catch {
    return false;
  }
};

export const recordConsent = async (consentTimestamp) => {
  try {
    const response = await api.post('/auth/record-consent', { consentTimestamp });
    return response.data;
  } catch (error) {
    console.error('Failed to record consent:', error);
    return { success: false };
  }
};

export default api;