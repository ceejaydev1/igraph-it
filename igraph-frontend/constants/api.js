// constants/api.js
// Base URL configuration for iGraph IT backend
// Change this to your deployed backend URL when in production
 
const API_BASE_URL = __DEV__
  ? 'http://localhost:5000'        // Local development
  : 'https://igraph-backend.onrender.com'; // Production (change this)
 
export default API_BASE_URL;
 