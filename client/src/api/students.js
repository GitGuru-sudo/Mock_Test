import api from './axiosInstance'

export const studentsAPI = {
  list: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  getTimeline: (id) => api.get(`/students/${id}/timeline`),
}
