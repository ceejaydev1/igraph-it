const getAbsoluteApiUrl = () => {
  // Explicit environment variable always wins.
  // Set EXPO_PUBLIC_API_URL in your frontend .env file.
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // Fallback backend.
  return 'https://rosybrown-fox-855047.hostingersite.com';
};

// Always use the real backend origin.
// Used for REST API requests and Socket.IO.
export const API_BASE_URL_ABSOLUTE = getAbsoluteApiUrl();

// Production and development both use the configured backend.
const API_BASE_URL = getAbsoluteApiUrl();

// Log configuration
console.log('🔗 API Configuration:');
console.log(`   📡 URL: ${API_BASE_URL}`);
console.log(
  `   📱 Platform: ${typeof window !== 'undefined' ? 'Web' : 'Native'}`
);
console.log(
  `   🌍 Environment: ${process.env.NODE_ENV || 'development'}`
);

// Health check with timeout and retry
export const checkBackendHealth = async (retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `🔄 Health check attempt ${attempt + 1}/${retries + 1} at:`,
        API_BASE_URL
      );

      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000);

      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        console.log('✅ Backend is online:', data);

        return true;
      }

      console.warn(
        `⚠️ Backend returned status: ${response.status}`
      );
    } catch (error) {
      console.warn(
        `⚠️ Health check attempt ${attempt + 1} failed:`,
        error?.message || error
      );

      if (attempt === retries) {
        console.error('❌ All health check attempts failed');
        console.error(
          '   💡 Please ensure the backend is running and accessible'
        );

        return false;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return false;
};

export default API_BASE_URL;