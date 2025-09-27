import { createContext, useContext, useEffect, useState } from 'react'
import { request } from '../lib/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      setInitialized(true)
      return
    }

    try {
      const response = await request('/auth/profile')
      setUser(response.data?.user || null)
    } catch (error) {
      console.error('Auth initialization error:', error)
      // Clear invalid tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }

  const login = (userData) => {
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_name')
    setUser(null)
  }

  const value = {
    user,
    setUser,
    loading,
    initialized,
    login,
    logout,
    initializeAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
