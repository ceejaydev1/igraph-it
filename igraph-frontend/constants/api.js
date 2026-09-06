const getAbsoluteApiUrl = () => {
  // Explicit environment variable always wins — set this in your .env when
  // you genuinely want to point at a local backend for same-machine testing.
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // No override supplied — default to the real deployed backend instead of
  // localhost. Testing cross-device collaboration (two different physical
  // machines/browsers) requires a URL every device can actually reach;
  // "localhost" resolves to each device's own machine, not your dev
  // machine, which is what silently broke the WebSocket connection (and
  // therefore all live collaboration) on any device other than the one
  // actually running the backend. REST calls kept working because
  // API_BASE_URL (the separate, relative export below) doesn't share this
  // fallback in production. If you need genuine same-machine local dev
  // against a locally-running backend, set EXPO_PUBLIC_API_URL explicitly
  // instead of relying on this fallback.
  return 'https://igraph-backend.onrender.com';
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
const API_BASE_URL =
  typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
    ? ''
    : getAbsoluteApiUrl();

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