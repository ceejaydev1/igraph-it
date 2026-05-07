// constants/api.js
// Base URL configuration for iGraph IT backend
// Change this to your deployed backend URL when in production
 
const API_BASE_URL = __DEV__
  ? 'http://localhost:5000/api'        // Local development
  : 'https://your-backend.vercel.app/api'; // Production (change this)
 
export default API_BASE_URL;
 