// constants/api.js
// Professional API configuration with fallbacks

// Get the API URL from environment or use default
const getApiUrl = () => {
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

// Configure with fallbacks
const API_BASE_URL = getApiUrl();

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