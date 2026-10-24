import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ibbc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors + handle expired sessions
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Network error. Please try again.';
    if (status === 401 && localStorage.getItem('ibbc_token')) {
      localStorage.removeItem('ibbc_token');
      localStorage.removeItem('ibbc_user');
      // let the app react; a hard redirect avoids stale protected views
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject({ ...error, message });
  }
);

export default api;
