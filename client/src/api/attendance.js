import api from './axiosInstance'

export const attendanceAPI = {
  bulkMark: (data) => api.post('/attendance/bulk', data),
  getBySession: (sessionId) => api.get(`/attendance/session/${sessionId}`),
  update: (id, status) => api.patch(`/attendance/${id}`, { status }),
}
