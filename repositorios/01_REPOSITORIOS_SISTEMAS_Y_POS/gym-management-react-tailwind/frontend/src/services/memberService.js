import api from './api';

export const memberService = {
  registerMembership: (payload) => api.post('/members/register', payload).then((r) => r.data),
  list: (params) => api.get('/members', { params }).then((r) => r.data),
  get: (id) => api.get(`/members/${id}`).then((r) => r.data),
  create: (payload) => api.post('/members', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/members/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/members/${id}`).then((r) => r.data),
  refreshStatuses: () => api.post('/members/refresh-status').then((r) => r.data),
};
