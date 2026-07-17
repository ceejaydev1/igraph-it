import axios from 'axios';
import { Platform } from 'react-native';
import API_BASE_URL from '../constants/api';

console.log('🔗 AuthService initialized with URL:', API_BASE_URL);

// STORAGE
//
// On web, tokens default to sessionStorage — cleared the moment the browser
// (or tab) closes — rather than localStorage, which would otherwise leave a
// 7-day-lived refresh token sitting on whatever machine the user signed in
// on. This matters most on shared/lab computers, where localStorage meant
// the next person to open the app could silently resume the previous
// person's session. Checking "Remember me" at sign-in opts into localStorage
// for users on their own device who don't want to re-authenticate every time.

const AUTH_PERSIST_KEY = 'authPersistent';

const isPersistentAuth = () => {
  if (Platform.OS !== 'web') return true;
  try {
    return localStorage.getItem(AUTH_PERSIST_KEY) === 'true';
  } catch {
    return false;
  }
};

// Call before storeTokens (i.e. at sign-in) to choose where this session's
// tokens land. Native platforms already use SecureStore, which is scoped to
// the device rather than a browser tab, so this only affects web.
export const setAuthPersistence = (remember) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(AUTH_PERSIST_KEY, remember ? 'true' : 'false');
  }
};

const storage = {
  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      (isPersistentAuth() ? localStorage : sessionStorage).setItem(key, value);
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
      // Tokens may be in either store depending on the persistence mode
      // active when they were written, so check both.
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
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
      sessionStorage.removeItem(key);
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

// AXIOS CLIENT

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('❌ NETWORK ERROR');
      const networkError = new Error('Cannot connect to server. Please ensure the backend is running.');
      networkError.code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    }

    const isAuthRoute = originalRequest.url?.includes('/auth/signin') ||
                        originalRequest.url?.includes('/auth/signup') ||
                        originalRequest.url?.includes('/auth/google') ||
                        originalRequest.url?.includes('/auth/verify-otp') ||
                        originalRequest.url?.includes('/auth/forgot-password') ||
                        originalRequest.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshToken();
        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        if (Platform.OS === 'web') {
          window.location.href = '/(auth)/signin';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response) {
      console.error(`❌ API Error ${error.response.status}:`, error.response.data?.message || error.message);
    }

    return Promise.reject(error);
  }
);

// TOKEN MANAGEMENT

export const storeTokens = async (accessToken, refreshToken) => {
  if (!accessToken || !refreshToken) {
    console.error('❌ Cannot store tokens: missing token');
    return;
  }
  
  console.log('💾 Storing tokens...');
  await storage.setItem('accessToken', accessToken);
  await storage.setItem('refreshToken', refreshToken);
  console.log('✅ Tokens stored successfully');
};

export const clearTokens = async () => {
  await storage.removeItem('accessToken');
  await storage.removeItem('refreshToken');
  if (Platform.OS === 'web') {
    localStorage.removeItem('user');
    localStorage.removeItem(AUTH_PERSIST_KEY);
  }
};

export const getAccessToken = async () => {
  return await storage.getItem('accessToken');
};

export const getRefreshToken = async () => {
  return await storage.getItem('refreshToken');
};

// 🚀 FIX: CACHING LAYER

let cachedUserData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedUser = async () => {
  if (cachedUserData && cacheTimestamp) {
    const elapsed = Date.now() - cacheTimestamp;
    if (elapsed < CACHE_DURATION) {
      return cachedUserData;
    }
  }
  return null;
};

export const setCachedUser = (data) => {
  cachedUserData = data;
  cacheTimestamp = Date.now();
};

// Decodes the uid claim out of the stored access token without a network
// call. No `atob` here — this runs on native too, where Hermes has no
// global atob/Buffer.
const base64UrlDecode = (input) => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '', buffer = 0, bits = 0;
  for (const char of base64) {
    const value = chars.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
};

export const getCurrentUserId = async () => {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(decodeURIComponent(escape(base64UrlDecode(token.split('.')[1]))));
    return payload.uid || null;
  } catch {
    return null;
  }
};

// AUTH API CALLS

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

let pendingRequest = null;

export const signIn = async (email, password, consentTimestamp = null, rememberMe = false) => {
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
        timeout: 10000
      }
    );
    pendingRequest = null;
    
    if (response.data.success && response.data.data?.tokens) {
      setAuthPersistence(rememberMe);
      const { accessToken, refreshToken } = response.data.data.tokens;
      await storeTokens(accessToken, refreshToken);

      if (Platform.OS === 'web' && response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      if (response.data.data.user) {
        setCachedUser(response.data.data.user);
      }
    }

    return response.data;
  } catch (error) {
    pendingRequest = null;
    console.error('❌ Sign in error:', error.response?.data || error.message);
    throw error;
  }
};

export const googleAuth = async (idToken, consentTimestamp = null, rememberMe = false) => {
  try {
    const payload = consentTimestamp
      ? { idToken, consentTimestamp }
      : { idToken };

    const response = await api.post('/auth/google', payload, {
      timeout: 45000, // Handles free-tier cold start (same as verifyResetOTP)
    });
    if (response.data.success && response.data.data?.tokens) {
      setAuthPersistence(rememberMe);
      await storeTokens(
        response.data.data.tokens.accessToken,
        response.data.data.tokens.refreshToken
      );
      if (Platform.OS === 'web' && response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      if (response.data.data.user) {
        setCachedUser(response.data.data.user);
      }
    }
    return response.data;
  } catch (error) {
    console.error('Google auth error:', error.response?.data || error.message);
    throw error;
  }
};

// Called when googleAuth comes back with code: 'LINK_PASSWORD_REQUIRED' —
// this email already has a password-based account. Confirming that
// password proves ownership before Google is allowed to sign into it.
export const linkGoogleAccount = async (idToken, password, rememberMe = false) => {
  try {
    const response = await api.post('/auth/link-google', { idToken, password });
    if (response.data.success && response.data.data?.tokens) {
      setAuthPersistence(rememberMe);
      await storeTokens(
        response.data.data.tokens.accessToken,
        response.data.data.tokens.refreshToken
      );
      if (Platform.OS === 'web' && response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      if (response.data.data.user) {
        setCachedUser(response.data.data.user);
      }
    }
    return response.data;
  } catch (error) {
    console.error('Link Google account error:', error.response?.data || error.message);
    throw error;
  }
};

// Lets a Google-only account (no password yet) add one, so it can also sign
// in with email/password afterward. idToken must be a freshly-verified
// Google credential (re-authenticated moments before this call), since
// there's no existing password to check instead.
export const setPassword = async (idToken, newPassword) => {
  const response = await api.post('/auth/set-password', { idToken, newPassword });
  return response.data;
};

// ⭐ FIXED: FORGOT PASSWORD - Returns error data instead of throwing

export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    console.error('Forgot password API error:', error);
    
    if (error.response) {
      const err = new Error(error.response.data?.message || 'Request failed');
      err.response = error.response;
      err.code = error.response.data?.code;
      throw err;
    }
    
    throw error;
  }
};

// 🏓 PING: Wake up free-tier backend before OTP verify

export const pingBackend = async () => {
  try {
    await api.get('/health', { timeout: 30000 });
    console.log('🏓 Backend ping successful');
  } catch (error) {
    console.log('🏓 Backend ping failed (ok):', error.message);
    // Silent fail — just warming up the server
  }
};

// OTP VERIFICATION

export const verifyResetOTP = async (email, otp) => {
  try {
    const response = await api.post('/auth/verify-reset-otp', { email, otp }, {
      timeout: 45000, // ⬆️ Increased from 15s — handles free-tier cold start
    });
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
    return response.data;
  } catch (error) {
    console.error('Reset password error:', error.response?.data || error.message);
    throw error;
  }
};

export const refreshToken = async () => {
  const refresh = await getRefreshToken();
  if (!refresh) throw new Error('No refresh token');
  
  try {
    const response = await api.post('/auth/refresh-token', { refreshToken: refresh });
    if (response.data.success && response.data.data?.accessToken) {
      await storage.setItem('accessToken', response.data.data.accessToken);
      return response.data.data.accessToken;
    }
    return null;
  } catch (error) {
    console.error('Refresh token error:', error);
    await clearTokens();
    throw error;
  }
};

// Wraps a raw fetch() call with an access token, and transparently retries
// once with a freshly-refreshed token on a 401 (e.g. "Token expired") instead
// of surfacing that raw backend error to the user. The axios `api` instance
// above already does this via an interceptor, but screens like create.tsx and
// savedDiagrams.tsx call fetch() directly (for streaming-friendly responses),
// which bypasses it entirely.
export const authFetch = async (url, options = {}) => {
  const attempt = async (accessToken) => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const token = await getAccessToken();
  let response = await attempt(token);

  if (response.status === 401) {
    try {
      const newToken = await refreshToken();
      if (newToken) {
        response = await attempt(newToken);
      }
    } catch {
      // Refresh failed (e.g. refresh token also expired) — fall through and
      // let the caller handle the still-401 response (e.g. prompt sign-in).
    }
  }

  return response;
};

export const verifyToken = async () => {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false };
    }
    
    const response = await api.get('/auth/me');
    
    if (response.data && response.data.success === true) {
      if (response.data.data?.user) {
        setCachedUser(response.data.data.user);
      }
      return {
        success: true,
        data: response.data.data || null
      };
    }
    
    return { success: false };
  } catch (error) {
    if (error.response?.status === 401) {
      await clearTokens();
    }
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
  cachedUserData = null;
  cacheTimestamp = null;
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

// USER ACCOUNT METHODS

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  } catch (error) {
    console.error('Change password error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || 'Invalid password format');
    }
    if (error.response?.status === 401) {
      throw new Error('Current password is incorrect');
    }
    if (error.response?.status === 404) {
      throw new Error('User not found');
    }
    throw new Error(error.response?.data?.message || 'Failed to change password');
  }
};

export const updateProfile = async (data) => {
  try {
    console.log('📤 Updating profile...');
    
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await api.put('/auth/update-profile', {
      fullName: data.fullName
    });
    
    console.log('📥 Update profile response:', response.data);
    
    if (response.data.success && response.data.data?.user) {
      const storedUser = await storage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        const updatedUser = {
          ...userData,
          ...response.data.data.user,
        };
        await storage.setItem('user', JSON.stringify(updatedUser));
        if (Platform.OS === 'web') {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        setCachedUser(updatedUser);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      throw new Error('Cannot connect to server. Please check your network connection.');
    }
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || 'Invalid request');
    }
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please sign in again.');
    }
    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    throw new Error(error.response?.data?.message || 'Failed to update profile');
  }
};

export const getUserDiagrams = async () => {
  try {
    const response = await api.get('/diagrams/user');
    return response.data;
  } catch (error) {
    console.error('Get user diagrams error:', error.response?.data || error.message);
    throw error;
  }
};

export default api;