import { createContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api/auth'

export const AuthContext = createContext(null)

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'))
  const [isLoading, setIsLoading] = useState(true)

  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1]
      return JSON.parse(atob(payload))
    } catch {
      return null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      const decoded = decodeToken(token)
      if (decoded && decoded.exp) {
        const now = Math.floor(Date.now() / 1000)
        if (decoded.exp > now) {
          setUser({ userId: decoded.userId, role: decoded.role })
        } else {
          localStorage.removeItem('accessToken')
          setAccessToken(null)
          setUser(null)
        }
      } else {
        localStorage.removeItem('accessToken')
        setAccessToken(null)
        setUser(null)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    const token = data.data.accessToken
    const userData = data.data.user
    localStorage.setItem('accessToken', token)
    setAccessToken(token)
    setUser({ userId: userData._id, role: userData.role, name: userData.name, email: userData.email })
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('accessToken')
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
