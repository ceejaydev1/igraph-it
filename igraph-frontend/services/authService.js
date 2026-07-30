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

// CSRF TOKEN (web only)
//
// Double-submit pattern: the backend sets a small, non-httpOnly `csrf_token`
// cookie (it's a nonce, not a credential — meant to be read) and expects it
// echoed back as X-CSRF-Token on every state-changing request. This is the
// compensating control for the auth cookies needing SameSite=None (a genuine
// cross-site deployment — frontend and backend live on different domains),
// which otherwise weakens the CSRF protection SameSite would normally give.
// Cached in memory only; a fresh tab/reload just fetches it again.
let csrfToken = null;

const ensureCsrfToken = async () => {
  if (Platform.OS !== 'web') return null; // native has no ambient cookie, nothing to protect
  if (csrfToken) return csrfToken;
  try {
    const response = await api.get('/auth/csrf-token');
    csrfToken = response.data?.data?.csrfToken || null;
  } catch (e) {
    console.log('Failed to fetch CSRF token:', e.message);
  }
  return csrfToken;
};

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Web has no client-readable token (httpOnly cookie carries the real
    // credential via withCredentials above) but does need the CSRF nonce
    // attached on every state-changing request — the compensating control
    // for the cookie needing SameSite=None across the cross-site frontend/
    // backend deployment. Native never sends an Origin header, so the
    // backend's CSRF check already exempts it; skip the extra round trip.
    if (Platform.OS === 'web') {
      const method = (config.method || 'get').toUpperCase();
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const csrf = await ensureCsrfToken();
        if (csrf) config.headers['X-CSRF-Token'] = csrf;
      }
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
                        originalRequest.url?.includes('/auth/reset-password') ||
                        // /auth/refresh-token: excluded so a failed refresh doesn't
                        // recursively call refreshToken() again from inside itself
                        // (this same interceptor wraps that request too).
                        originalRequest.url?.includes('/auth/refresh-token') ||
                        // /auth/me: this is verifyToken()'s routine "am I logged
                        // in?" probe, called on every page load including public
                        // ones (see app/index.tsx). A 401 here just means "not
                        // signed in" — verifyToken() already handles that itself —
                        // not "an active session just died". Letting it fall
                        // through to the hard redirect below caused an infinite
                        // reload loop: load signin -> probe -> 401 -> redirect to
                        // signin -> reload -> probe -> 401 -> ...
                        originalRequest.url?.includes('/auth/me');

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
          // Group segments like "(auth)" are only ever stripped from the URL
          // for client-side (SPA) navigation, never from a hard `location.href`
          // assignment — so this always landed on the literal, non-canonical
          // "/(auth)/signin". Guarding on the current path (not just fixing the
          // href) also stops this from ever firing a self-triggering reload
          // loop again if some other public-page request ever 401s here.
          const authPaths = ['/signin', '/signup', '/forgot-password', '/verify-otp', '/reset-password'];
          if (!authPaths.includes(window.location.pathname)) {
            window.location.href = '/signin';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    // Mirrors the 401→refresh→retry dance above: a CSRF token can go stale
    // (cleared on a previous sign-out, or just expired) without the session
    // itself being invalid, so re-fetch and retry once rather than surfacing
    // a confusing 403 to the user.
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'CSRF_INVALID' &&
      !originalRequest._csrfRetry &&
      Platform.OS === 'web'
    ) {
      originalRequest._csrfRetry = true;
      csrfToken = null;
      const freshCsrf = await ensureCsrfToken();
      if (freshCsrf) {
        originalRequest.headers['X-CSRF-Token'] = freshCsrf;
        return api(originalRequest);
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
  if (Platform.OS === 'web') {
    // Nothing to do — the backend already set the real credential as an
    // httpOnly cookie in the same response these tokens came from. Never
    // persist the raw JWTs client-side on web; that's the exact XSS-exposed
    // surface this refactor removes.
    return;
  }

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
  await storage.removeItem('lastRoute');
  await storage.removeItem(CACHED_USER_KEY);
  cachedUserData = null;
  cacheTimestamp = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem('user');
    localStorage.removeItem(AUTH_PERSIST_KEY);
  }
};

export const getAccessToken = async () => {
  if (Platform.OS === 'web') return null; // httpOnly — JS was never meant to read this
  return await storage.getItem('accessToken');
};

export const getRefreshToken = async () => {
  if (Platform.OS === 'web') return null;
  return await storage.getItem('refreshToken');
};

// Cheap, non-authoritative "probably signed in" check for UI gates before
// attempting an action (e.g. showing a save button) — not a security
// boundary, the action's own API call remains the real source of truth via
// the 401→refresh→retry interceptor either way. Native keeps its exact
// original zero-network-call behavior; web substitutes the user cache
// (populated by the tab layout's own verifyToken() call on mount) since
// there's no client-readable token to check anymore.
export const hasActiveSession = async () => {
  if (Platform.OS !== 'web') return !!(await getAccessToken());
  const cached = await getCachedUser();
  return !!cached;
};

// LAST VISITED ROUTE
//
// So closing the tab/browser without signing out and reopening it resumes
// wherever the user actually was (e.g. mid-edit on a diagram) instead of
// always bouncing back to Home. Reuses the same `storage` object tokens go
// through, so it lives/dies with the token: persists as long as the session
// does (respecting the "Remember me" choice) and is wiped on sign-out via
// clearTokens above, so a stale route never outlives its session.

export const saveLastRoute = async (path) => {
  if (!path) return;
  await storage.setItem('lastRoute', path);
};

export const getLastRoute = async () => {
  return await storage.getItem('lastRoute');
};

// CACHING LAYER
//
// `cachedUserData` alone is an in-memory module variable, which starts out
// null on every fresh page load/app launch — so on a cold start it can never
// actually serve as the fallback callers reach for when a live fetch fails.
// (That's exactly what was happening: an expired access token right after
// reload → the "get real data" call fails → falls back to this cache → cache
// is empty because nothing's had a chance to populate it yet → name shows as
// the generic "User" placeholder instead of the real name.) Backing it with
// the same durable `storage` tokens already use means a fallback read after
// reload can find what the *previous* session cached, not just this one.
const CACHED_USER_KEY = 'cachedUser';

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
  try {
    const stored = await storage.getItem(CACHED_USER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cachedUserData = parsed;
      cacheTimestamp = Date.now();
      return parsed;
    }
  } catch (_) {
    // Corrupt/unparseable cache — ignore and fall through to null.
  }
  return null;
};

export const setCachedUser = (data) => {
  cachedUserData = data;
  cacheTimestamp = Date.now();
  storage.setItem(CACHED_USER_KEY, JSON.stringify(data)).catch(() => {});
};

// Same idea for the saved-diagrams list: userAccount.tsx and savedDiagrams.tsx
// both start from an empty array and fetch on mount/focus, so switching to
// another tab and back (a remount, since neither screen persists this list
// itself) showed "0 saved diagrams" for a moment before the real count came
// back in. In-memory only (not worth persisting across app restarts the way
// the user cache is) — just enough to survive a same-session remount.
let cachedDiagrams = null;

export const getCachedDiagrams = () => cachedDiagrams;

export const setCachedDiagrams = (diagrams) => {
  cachedDiagrams = diagrams;
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
  if (Platform.OS === 'web') {
    // No client-readable token to decode anymore (httpOnly cookie) — the
    // uid comes from the same user cache every sign-in/verifyToken() call
    // already populates.
    const cached = await getCachedUser();
    return cached?.uid || null;
  }
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
      ? { email, password, consentTimestamp, rememberMe }
      : { email, password, rememberMe };

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
      ? { idToken, consentTimestamp, rememberMe }
      : { idToken, rememberMe };

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
    const response = await api.post('/auth/link-google', { idToken, password, rememberMe });
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
  let refresh = null;
  if (Platform.OS !== 'web') {
    refresh = await getRefreshToken();
    if (!refresh) throw new Error('No refresh token');
  }
  // Web sends no body at all — the refresh_token cookie carries the
  // credential automatically, and the backend reissues access_token as a
  // fresh cookie in its response.

  try {
    const body = Platform.OS === 'web' ? {} : { refreshToken: refresh };
    const response = await api.post('/auth/refresh-token', body);
    if (response.data.success && response.data.data?.accessToken) {
      if (Platform.OS !== 'web') {
        await storage.setItem('accessToken', response.data.data.accessToken);
      }
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
  const attempt = async (accessToken) => {
    const headers = { ...(options.headers || {}) };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    if (Platform.OS === 'web') {
      const method = (options.method || 'GET').toUpperCase();
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const csrf = await ensureCsrfToken();
        if (csrf) headers['X-CSRF-Token'] = csrf;
      }
    }

    return fetch(url, {
      ...options,
      headers,
      // Without this, the httpOnly session cookie never attaches to a raw
      // fetch() call — this is what actually makes save/load/delete/rename
      // work on web under the cookie model; native ignores it.
      credentials: Platform.OS === 'web' ? 'include' : options.credentials,
    });
  };

  const token = await getAccessToken(); // null on web (harmless), real value on native (unchanged)
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
    if (Platform.OS !== 'web') {
      // Native still has a client-readable token, so this remains a cheap
      // fast-path that skips the network call entirely when there's clearly
      // no session. Web has nothing to check client-side anymore (httpOnly
      // cookie) — the request itself, riding on withCredentials, is the only
      // way to find out.
      const token = await getAccessToken();
      if (!token) {
        return { success: false };
      }
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
  try {
    if (Platform.OS === 'web') {
      // No body token to send (nothing client-readable) — the refresh_token
      // cookie carries the credential automatically, and the backend clears
      // both cookies in its response.
      await api.post('/auth/logout');
    } else {
      const refresh = await getRefreshToken();
      if (refresh) {
        await api.post('/auth/logout', { refreshToken: refresh });
      }
    }
  } catch (e) {
    console.log('Logout error:', e);
  }
  await clearTokens();
  cachedUserData = null;
  cacheTimestamp = null;
};

export const checkAuthStatus = async () => {
  // verifyToken() already applies the right fast-path per platform (native:
  // skip the network call if there's no token; web: always ask the server,
  // since there's nothing client-readable to pre-check).
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

    const signedIn = await hasActiveSession();
    if (!signedIn) {
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
    if (response.data?.success && response.data?.data) {
      setCachedDiagrams(response.data.data);
    }
    return response.data;
  } catch (error) {
    console.error('Get user diagrams error:', error.response?.data || error.message);
    throw error;
  }
};

export default api;