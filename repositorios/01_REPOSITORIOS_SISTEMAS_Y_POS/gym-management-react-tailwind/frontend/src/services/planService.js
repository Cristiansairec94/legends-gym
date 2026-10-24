import api from './api';

export const planService = {
  list: (params) => api.get('/plans', { params }).then((r) => r.data),
  get: (id) => api.get(`/plans/${id}`).then((r) => r.data),
  create: (payload) => api.post('/plans', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/plans/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/plans/${id}`).then((r) => r.data),
};

export const membershipService = {
  list: (params) => api.get('/memberships', { params }).then((r) => r.data),
  create: (payload) => api.post('/memberships', payload).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/memberships/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/memberships/${id}`).then((r) => r.data),
};

export const paymentService = {
  list: (params) => api.get('/payments', { params }).then((r) => r.data),
  create: (payload) => api.post('/payments', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/payments/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/payments/${id}`).then((r) => r.data),
};
