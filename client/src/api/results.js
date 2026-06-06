import api from './axiosInstance'

export const resultsAPI = {
  record: (data) => api.post('/results', data),
  getBySession: (sessionId) => api.get(`/results/session/${sessionId}`),
  getByStudent: (studentId) => api.get(`/results/student/${studentId}`),
  update: (id, data) => api.put(`/results/${id}`, data),
}
