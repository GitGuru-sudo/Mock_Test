import api from './axiosInstance'

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
}
