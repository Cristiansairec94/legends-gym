import api from './api';

const make = (base) => ({
  list: (params) => api.get(`/${base}`, { params }).then((r) => r.data),
  get: (id) => api.get(`/${base}/${id}`).then((r) => r.data),
  create: (payload) => api.post(`/${base}`, payload).then((r) => r.data),
  update: (id, payload) => api.put(`/${base}/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/${base}/${id}`).then((r) => r.data),
});

export const trainerService = make('trainers');
export const serviceService = make('services');
export const facilityService = make('facilities');
export const categoryService = make('categories');
export const galleryService = make('gallery');
export const bannerService = make('banners');
