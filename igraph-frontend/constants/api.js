const getAbsoluteApiUrl = () => {
  // Check environment variable first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Check if running in production
  if (process.env.NODE_ENV === 'production') {
    return 'https://igraph-backend.onrender.com';
  }

  // Development - try to detect the best URL
  if (typeof window !== 'undefined') {
    // Check if we're on a mobile device (Expo Go)
    const isMobile = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      // On mobile, we need the network IP
      // Try to get it from environment or use localhost
      return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000';
    }

    // On desktop web
    return 'http://localhost:5000';
  }

  // Fallback
  return 'http://localhost:5000';
};

// Always the backend's own real origin, regardless of platform/deployment —
// for anything that can't go through vercel.json's /api/* proxy (see below),
// namely Socket.IO's realtime connection: it isn't a plain HTTP request the
// proxy can forward the same way, so collabSocketClient.js deliberately
// imports this instead of the default export.
export const API_BASE_URL_ABSOLUTE = getAbsoluteApiUrl();

// REST calls, by contrast, DO go relative on a Vercel web deployment — '' so
// callers' own `${API_BASE_URL}/api/...` collapses to same-origin `/api/...`,
// which vercel.json rewrites through to the real backend server-side. The
// browser itself never contacts the backend's own domain directly, so the
// session + CSRF cookies it gets back can be scoped SameSite=Lax (same-site)
// instead of the None (cross-site) a genuine two-domain split would force.
// That matters because in-app browsers (Messenger, Instagram, TikTok) block
// exactly that kind of cross-site cookie — which was breaking sign-in and
// every CSRF-protected request for anyone opening a shared link inside one
// of those. Local dev has no such proxy (only the deployed site does), so
// this only kicks in once actually running on the real *.vercel.app host —
// everywhere else (localhost, native) keeps using the real absolute URL,
// same as before.
const API_BASE_URL = (
  typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
) ? '' : getAbsoluteApiUrl();

// Log configuration
console.log('🔗 API Configuration:');
console.log(`   📡 URL: ${API_BASE_URL}`);
console.log(`   📱 Platform: ${typeof window !== 'undefined' ? 'Web' : 'Native'}`);
console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Health check with timeout and retry
export const checkBackendHealth = async (retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Health check attempt ${attempt + 1}/${retries + 1} at:`, API_BASE_URL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend is online:', data);
        return true;
      }
      
      console.warn(`⚠️ Backend returned status: ${response.status}`);
    } catch (error) {
      console.warn(`⚠️ Health check attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === retries) {
        console.error('❌ All health check attempts failed');
        console.error('   💡 Please ensure backend is running and accessible');
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return false;
};

export default API_BASE_URL;