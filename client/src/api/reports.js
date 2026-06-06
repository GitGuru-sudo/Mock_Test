import api from './axiosInstance'

export const reportsAPI = {
  get: (params) => api.get('/reports', { params }),
}
