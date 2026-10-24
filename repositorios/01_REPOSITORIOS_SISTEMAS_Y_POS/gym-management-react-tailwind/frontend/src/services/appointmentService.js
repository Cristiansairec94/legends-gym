import api from './api';

export const appointmentService = {
  book: (payload) => api.post('/appointments', payload).then((r) => r.data),
  list: (params) => api.get('/appointments', { params }).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/appointments/${id}`).then((r) => r.data),
};
