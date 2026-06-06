import api from './axiosInstance'

export const sessionsAPI = {
  list:   (params)   => api.get('/sessions', { params }),
  getById:(id)       => api.get(`/sessions/${id}`),
  create: (data)     => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  updateStatus: (id, status) => api.patch(`/sessions/${id}/status`, { status }),
  getEligibleStudents: (id) => api.get(`/sessions/${id}/eligible-students`),
}
