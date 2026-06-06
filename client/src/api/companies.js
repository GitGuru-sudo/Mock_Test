import api from './axiosInstance'

export const companiesAPI = {
  list:   ()         => api.get('/companies'),
  getById:(id)       => api.get(`/companies/${id}`),
  create: (data)     => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  addRound:   (id, data)         => api.post(`/companies/${id}/rounds`, data),
  deleteRound:(id, roundNumber)  => api.delete(`/companies/${id}/rounds/${roundNumber}`),
  updateStatus: (id, status) => api.patch(`/companies/${id}/status`, { recruitmentStatus: status }),
}
