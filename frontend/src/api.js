/**
 * Axios instance for API calls
 */
import axios from 'axios';

const PRODUCTION_HOSTS = new Set([
  'necftreausry.com',
  'www.necftreausry.com',
  '169.58.63.125',
]);

const normalizeApiUrl = (url) => {
  let normalized = url.replace(/\/$/, '');
  if (normalized && !/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
};

// Determine base URL priority:
// 1. Same-origin /api on known production hosts (Contabo / single-container deploy)
// 2. Explicit VITE_API_URL env var (if provided)
// 3. localhost in dev
// 4. window.location.origin + /api
const deriveBaseURL = () => {
  const host = window.location.hostname;

  if (PRODUCTION_HOSTS.has(host)) {
    return `${window.location.origin}/api`;
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return normalizeApiUrl(envUrl);
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api';
  }

  return `${window.location.origin}/api`;
};

const baseURL = deriveBaseURL();

const api = axios.create({
  baseURL,
});

const AUTH_OPTIONAL_PATHS = ['/login', '/receipts/upload'];

const isAuthOptionalRequest = (url = '') => {
  return AUTH_OPTIONAL_PATHS.some((path) => url.includes(path));
};

// Debug log (will be stripped in production minification but helpful if visible)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('[API] Using baseURL:', baseURL);
}

// Add token to requests if available (as Authorization header)
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    // Let the browser set multipart/form-data boundary
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[API] Token attached to ${config.method?.toUpperCase()} ${config.url}`);
    }
  } else if (import.meta.env.DEV && !isAuthOptionalRequest(config.url)) {
    // eslint-disable-next-line no-console
    console.warn(`[API] No token found for ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[API] Error Response:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
    }
    
    const requestUrl = error.config?.url || '';
    const isProtectedRoute = !isAuthOptionalRequest(requestUrl);
    const responseDetail = typeof error.response?.data?.detail === 'string' ? error.response.data.detail : '';
    const isJwtValidation422 =
      error.response?.status === 422 &&
      /jwt|token|authorization|auth/i.test(responseDetail);

    if (isProtectedRoute && (error.response?.status === 401 || isJwtValidation422)) {
      // Token expired or invalid - clear it and reload
      // eslint-disable-next-line no-console
      console.warn('[API] Authentication failed - clearing token and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('is_superuser');
      localStorage.removeItem('username');
      if (window.location.pathname === '/admin') {
        window.location.reload();
      } else {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
