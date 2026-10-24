import api from './api';

export const authService = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  adminLogin: (payload) => api.post('/auth/admin/login', payload).then((r) => r.data),
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};
