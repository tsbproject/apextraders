import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

// ==========================================
// API BASE URL
// ==========================================

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  // Explicit Vite environment configuration takes priority.
  if (envUrl) {
    return String(envUrl).replace(/\/+$/, '');
  }

  // Production fallback.
  if (
    typeof window !== 'undefined' &&
    window.location.hostname.includes('vercel.app')
  ) {
    return 'https://apextraders-api.onrender.com/api';
  }

  // Local development backend.
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getBaseUrl();

// ==========================================
// AXIOS INSTANCE
// ==========================================

export const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  timeout: 15_000,
});

// ==========================================
// REQUEST INTERCEPTOR
// ==========================================

api.interceptors.request.use(
  (
    config: InternalAxiosRequestConfig
  ): InternalAxiosRequestConfig => {
    const token =
      localStorage.getItem('apex_token');

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error: unknown) => {
    return Promise.reject(error);
  }
);

// ==========================================
// RESPONSE INTERCEPTOR
// ==========================================

api.interceptors.response.use(
  (response) => response,

  (error: AxiosError) => {
    /*
     * Do NOT automatically delete the JWT here.
     *
     * Authentication state is controlled by authSlice/useAuthInit.
     * This prevents an unrelated forbidden request from unexpectedly
     * logging the user out.
     */

    return Promise.reject(error);
  }
);

export default api;