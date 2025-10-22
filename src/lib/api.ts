// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// SUPER_ADMIN bypass configuration
const SUPER_ADMIN_BYPASS = true; // Set to false in production

console.log('🔓 SUPER_ADMIN Bypass:', SUPER_ADMIN_BYPASS ? 'ENABLED' : 'DISABLED');

// Request interceptor - SIMPLIFIED (no retry logic)
api.interceptors.request.use(
  (config) => {
    // Add SUPER_ADMIN bypass header for all requests
    if (SUPER_ADMIN_BYPASS) {
      config.headers['x-super-admin'] = 'true';
    }
    
    // Still include JWT token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - SIMPLIFIED (no retry logic)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ Request failed:', error.config?.url, error.response?.status);
    
    if (error.response?.status === 401) {
      console.log('🔄 401 Unauthorized');
      
      // Don't redirect if bypass is enabled (let the component handle it)
      if (!SUPER_ADMIN_BYPASS) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export { SUPER_ADMIN_BYPASS };
export default api;