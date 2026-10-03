import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('midad_token')

      if (!token) {
        setLoading(false)
        return
      }

      // 1) اقرأ من localStorage فوراً
      const savedUser = localStorage.getItem('midad_user')
      const savedPerms = localStorage.getItem('midad_permissions')

      if (savedUser) {
        setUser(JSON.parse(savedUser))
        setPermissions(JSON.parse(savedPerms || '[]'))
      }

      // 🔌 ربط Socket.io
      connectSocket(token)

      // 2) ثم حدّث من السيرفر
      try {
        const res = await api.get('/auth/me')
        const { user: userData, permissions: perms } = res.data.data

        localStorage.setItem('midad_user', JSON.stringify(userData))
        localStorage.setItem('midad_permissions', JSON.stringify(perms))

        setUser(userData)
        setPermissions(perms)
      } catch (e) {
        // فشل الجلب — استخدم localStorage
      }

      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { token, user: userData, permissions: perms } = res.data.data

    localStorage.setItem('midad_token', token)
    localStorage.setItem('midad_user', JSON.stringify(userData))
    localStorage.setItem('midad_permissions', JSON.stringify(perms))

    // 🔌 ربط Socket.io بعد تسجيل الدخول
    connectSocket(token)

    setUser(userData)
    setPermissions(perms)
    return userData
  }

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me')
      const { user: userData, permissions: perms } = res.data.data

      localStorage.setItem('midad_user', JSON.stringify(userData))
      localStorage.setItem('midad_permissions', JSON.stringify(perms))

      setUser(userData)
      setPermissions(perms)
      return userData
    } catch (e) {
      console.error('Failed to refresh user:', e)
    }
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch (e) {}
    localStorage.removeItem('midad_token')
    localStorage.removeItem('midad_user')
    localStorage.removeItem('midad_permissions')

    // 🔌 فصل Socket.io
    disconnectSocket()

    setUser(null)
    setPermissions([])
  }

  const hasPermission = (code) => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (permissions.includes('*')) return true
    return permissions.includes(code)
  }

  return (
    <AuthContext.Provider value={{
      user, permissions, loading,
      login, logout, hasPermission, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}