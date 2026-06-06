import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

let isRefreshing = false
let redirecting = false

axiosInstance.interceptors.request.use(
  (config) => {
    const skipAuth = config.url === '/auth/refresh' || config.url === '/auth/login'
    if (!skipAuth) {
      const token = localStorage.getItem('accessToken')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

const plainAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest) return Promise.reject(error)

    const isAuthRoute = originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login'
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        try {
          await new Promise((resolve) => { const id = setInterval(() => { if (!isRefreshing) { clearInterval(id); resolve() } }, 100) })
        } catch { return Promise.reject(error) }
        const token = localStorage.getItem('accessToken')
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return axiosInstance(originalRequest)
        }
        return Promise.reject(error)
      }

      originalRequest._retry = true
      isRefreshing = true
      try {
        const { data } = await plainAxios.post('/auth/refresh')
        const newToken = data.data.accessToken
        localStorage.setItem('accessToken', newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        isRefreshing = false
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        localStorage.removeItem('accessToken')
        if (!redirecting) {
          redirecting = true
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
