import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// إضافة التوكن تلقائياً حسب المسار
api.interceptors.request.use(
  (config) => {
    const isParentRoute = window.location.pathname.startsWith('/parent')
    const token = isParentRoute
      ? localStorage.getItem('parent_token')
      : localStorage.getItem('midad_token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// معالجة الأخطاء
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isParentRoute = window.location.pathname.startsWith('/parent')

      if (isParentRoute) {
        localStorage.removeItem('parent_token')
        localStorage.removeItem('parent_phone')
        localStorage.removeItem('parent_students')
        window.location.href = '/parent-login'
      } else {
        localStorage.removeItem('midad_token')
        localStorage.removeItem('midad_user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api