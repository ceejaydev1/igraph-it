// constants/api.js
// Base URL configuration for iGraph IT backend

const API_BASE_URL = __DEV__
  ? 'http://localhost:5000'
  : 'https://igraph-backend.onrender.com';

// Helper to check if backend is reachable
export const checkBackendHealth = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('[Health Check] Backend unreachable:', error.message);
    return false;
  }
};

export default API_BASE_URL;