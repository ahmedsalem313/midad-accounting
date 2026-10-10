import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { connectSocket } from '../lib/socket';
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }

    setLoading(true)
    try {
      const user = await login(username, password)
      toast.success(`أهلاً ${user.full_name}`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (u, p) => {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 animate-slide-up">
        {/* الشعار */}
        <div className="text-center mb-8">
          <img
  src="/logo.png"
  alt="مداد المحاسبي"
  className="w-50 h-50 object-contain mx-auto mb-4"
/>
          <h1 className="text-3xl font-bold mb-1">مداد المحاسبي</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            نظام إدارة مدرسية متكامل
          </p>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <User size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                    style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-modern ps-10"
                placeholder="admin"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                    style={{ color: 'var(--text-secondary)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern ps-10"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري الدخول...
              </>
            ) : (
              <>
                <LogIn size={18} />
                تسجيل الدخول
              </>
            )}
          </button>
        </form>

        {/* حسابات تجريبية */}
        <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs text-center mb-3" style={{ color: 'var(--text-secondary)' }}>
            حسابات تجريبية (انقر للتعبئة)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('admin', 'admin123')}
              className="text-xs p-2 rounded-lg border transition-all hover:bg-primary-50"
              style={{ borderColor: 'var(--border-color)' }}
            >
              👑 مدير
            </button>
            <button
              type="button"
              onClick={() => quickLogin('accountant', 'accountant123')}
              className="text-xs p-2 rounded-lg border transition-all hover:bg-primary-50"
              style={{ borderColor: 'var(--border-color)' }}
            >
              💰 محاسب
            </button>
            <button
              type="button"
              onClick={() => quickLogin('teacher', 'teacher123')}
              className="text-xs p-2 rounded-lg border transition-all hover:bg-primary-50"
              style={{ borderColor: 'var(--border-color)' }}
            >
              👨‍🏫 معلم
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}