import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Phone, LogIn, Users, GraduationCap, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function ParentLogin() {
  const [searchParams] = useSearchParams()
  const phoneFromUrl = searchParams.get('phone') || ''

  const [phone, setPhone] = useState(phoneFromUrl)
  const [loading, setLoading] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)
  const navigate = useNavigate()

  // ============================================
  // دخول تلقائي إذا جاء من QR
  // ============================================
  useEffect(() => {
    if (phoneFromUrl && phoneFromUrl.length >= 8 && !autoLogin) {
      setAutoLogin(true)
      // انتظر قليلاً حتى يرى المستخدم الرقم
      setTimeout(() => {
        handleAutoLogin()
      }, 800)
    }
  }, [phoneFromUrl])

  const handleAutoLogin = async () => {
    setLoading(true)
    try {
      const res = await api.post('/parent/login', { phone: phoneFromUrl })
      const { token, students, phone: cleanPhone } = res.data.data

      localStorage.setItem('parent_token', token)
      localStorage.setItem('parent_phone', cleanPhone)
      localStorage.setItem('parent_students', JSON.stringify(students))

      toast.success(`مرحباً، لديك ${students.length} طالب`)
      navigate('/parent')
    } catch (error) {
      // إذا فشل الدخول التلقائي → نُظهر الحقل يدوياً
      toast.error(error.response?.data?.error || 'فشل الدخول التلقائي')
      setLoading(false)
      setAutoLogin(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!phone || phone.length < 8) {
      toast.error('يرجى إدخال رقم هاتف صحيح')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/parent/login', { phone })
      const { token, students, phone: cleanPhone } = res.data.data

      localStorage.setItem('parent_token', token)
      localStorage.setItem('parent_phone', cleanPhone)
      localStorage.setItem('parent_students', JSON.stringify(students))

      toast.success(`مرحباً، لديك ${students.length} طالب`)
      navigate('/parent')
    } catch (error) {
      toast.error(error.response?.data?.error || 'فشل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const clearPhone = () => {
    setPhone('')
    setAutoLogin(false)
  }

  // ============================================
  // شاشة "جاري الدخول التلقائي"
  // ============================================
  if (autoLogin && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 text-center animate-slide-up">
          <div
            className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-white text-4xl mb-6"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            👨‍👩‍👧
          </div>
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">جاري تسجيل الدخول...</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }} dir="ltr">
            📱 {phoneFromUrl}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 animate-slide-up">
        {/* الشعار */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-white text-4xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            👨‍👩‍👧
          </div>
          <h1 className="text-3xl font-bold mb-1">بوابة أولياء الأمور</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            لمتابعة أبنائكم في المدرسة
          </p>
        </div>

        {/* تنبيه QR */}
        {phoneFromUrl && (
          <div className="mb-5 p-3 rounded-xl flex items-center gap-2"
               style={{ background: 'rgba(16,185,129,0.1)' }}>
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-700">
                تم مسح الرمز بنجاح
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                الرقم: <strong dir="ltr">{phoneFromUrl}</strong>
              </p>
            </div>
            <button
              onClick={clearPhone}
              className="btn-ghost !p-1 text-red-500"
              title="مسح الرقم"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              رقم هاتف ولي الأمر
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute top-1/2 -translate-y-1/2 start-3"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                className="input-modern ps-10 text-lg"
                placeholder="07XXXXXXXXX"
                dir="ltr"
                disabled={loading}
                autoFocus
                maxLength={15}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              💡 أدخل الرقم الذي سجلته في المدرسة
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 8}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 !text-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري البحث...
              </>
            ) : (
              <>
                <LogIn size={20} />
                دخول
              </>
            )}
          </button>
        </form>

        {/* معلومات */}
        <div className="mt-6 pt-5 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-start gap-2 text-xs">
            <Users size={14} className="text-primary-500 flex-shrink-0 mt-0.5" />
            <p style={{ color: 'var(--text-secondary)' }}>
              إذا كان لديك أكثر من ابن في المدرسة، ستظهر لك قائمة للاختيار.
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <GraduationCap size={14} className="text-primary-500 flex-shrink-0 mt-0.5" />
            <p style={{ color: 'var(--text-secondary)' }}>
              ستستطيع رؤية: الدرجات، الحضور، الأقساط، وتقييم السلوك.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}