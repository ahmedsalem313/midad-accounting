import axios from 'axios'

// نستخدم مسار نسبي — المتصفح يستخدم نفس عنوان الصفحة تلقائياً
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// إضافة التوكن تلقائياً
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('midad_token')
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
      localStorage.removeItem('midad_token')
      localStorage.removeItem('midad_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api