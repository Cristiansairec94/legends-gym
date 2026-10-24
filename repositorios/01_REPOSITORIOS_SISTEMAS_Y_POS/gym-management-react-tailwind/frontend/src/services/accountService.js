import api from './api';

export const accountService = {
  summary: () => api.get('/account/summary').then((r) => r.data),
  subscribe: (payload) => api.post('/account/subscribe', payload).then((r) => r.data),
  submitReview: (payload) => api.post('/account/reviews', payload).then((r) => r.data),

  photos: () => api.get('/account/photos').then((r) => r.data),
  uploadPhoto: (formData) =>
    api.post('/account/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  deletePhoto: (id) => api.delete(`/account/photos/${id}`).then((r) => r.data),

  getCart: () => api.get('/account/cart').then((r) => r.data),
  saveCart: (items) => api.put('/account/cart', { items }).then((r) => r.data),
};
