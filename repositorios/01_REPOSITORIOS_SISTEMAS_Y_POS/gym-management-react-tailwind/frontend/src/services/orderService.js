import api from './api';

export const orderService = {
  checkout: (payload) => api.post('/orders', payload).then((r) => r.data),
  list: (params) => api.get('/orders', { params }).then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
};
