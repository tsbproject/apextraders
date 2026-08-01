import axios, { InternalAxiosRequestConfig } from 'axios';

// Dynamically determine the API base URL
const getBaseUrl = (): string => {
  // If explicitly provided via environment variables (Vite)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Production check on Vercel
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://apextraders-api.onrender.com/api'; // Replace with your production backend domain
  }

  // Fallback to local development port
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getBaseUrl().replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Inject JWT Token & Fix Relative Slashes
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('apex_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ensure leading slash doesn't strip subpaths when URL is relative
    if (config.url && config.url.startsWith('/') && API_BASE_URL.endsWith('/api')) {
      config.url = config.url.substring(1);
    }

    return config;
  },
  (error: unknown) => Promise.reject(error)
);

export default api;