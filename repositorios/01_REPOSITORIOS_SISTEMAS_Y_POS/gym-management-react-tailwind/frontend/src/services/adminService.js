import api from './api';

export const dashboardService = {
  stats: () => api.get('/dashboard').then((r) => r.data),
};

export const reviewService = {
  list: (params) => api.get('/reviews', { params }).then((r) => r.data),
  submit: (payload) => api.post('/reviews', payload).then((r) => r.data),
  setApproval: (id, is_approved) => api.patch(`/reviews/${id}/approve`, { is_approved }).then((r) => r.data),
  update: (id, payload) => api.put(`/reviews/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/reviews/${id}`).then((r) => r.data),
};

export const enquiryService = {
  submit: (payload) => api.post('/enquiries', payload).then((r) => r.data),
  list: (params) => api.get('/enquiries', { params }).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/enquiries/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/enquiries/${id}`).then((r) => r.data),
};

export const contentService = {
  get: () => api.get('/content').then((r) => r.data),
  update: (payload) => api.put('/content', payload).then((r) => r.data),
};

export const uploadService = {
  image: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
};
