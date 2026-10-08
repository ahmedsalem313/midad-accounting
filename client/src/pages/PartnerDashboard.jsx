import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, LogOut, TrendingUp, Wallet, DollarSign, Percent,
  CheckCircle, Clock, AlertCircle, Building2, Phone, Mail,
  Eye, User, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function PartnerDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [schoolName, setSchoolName] = useState('مداد المحاسبي')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // جلب بيانات الشريك المرتبط بحساب المستخدم
      const res = await api.get('/partners/me')
      setData(res.data.data)

      // اسم المدرسة
      try {
        const s = await api.get('/settings')
        if (s.data.data.school_name) setSchoolName(s.data.data.school_name)
      } catch (e) {}
    } catch (e) {
      if (e.response?.status === 404) {
        toast.error('حسابك غير مرتبط بشريك. تواصل مع المدير.')
      } else {
        toast.error('فشل تحميل البيانات')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('تسجيل الخروج؟')) return
    await logout()
    navigate('/login')
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-10 text-center max-w-md">
          <AlertCircle size={64} className="mx-auto mb-4 text-amber-500" />
          <h2 className="text-2xl font-bold mb-3">حسابك غير مرتبط</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            لم يُعثر على ملف شريك مرتبط بحسابك. تواصل مع مدير المدرسة.
          </p>
          <button onClick={handleLogout} className="btn-ghost">
            <LogOut size={16} className="inline me-1" />
            تسجيل خروج
          </button>
        </div>
      </div>
    )
  }

  const { partner, capital, distributions, totals } = data

  return (
    <div className="min-h-screen p-4 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-card p-5 flex flex-wrap items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
          {partner.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold">{partner.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Briefcase size={14} className="inline me-1" />
            شريك في {schoolName}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#4338CA', fontSize: '14px', padding: '8px 16px', fontWeight: 'bold' }}>
            {partner.share_percentage}%
          </span>
          <button onClick={handleLogout}
                  className="btn-ghost !py-2 !px-3 text-sm text-red-500 flex items-center gap-1">
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </div>

      {/* إحصائيات رئيسية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <Wallet size={20} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>رأس المال</p>
          </div>
          <p className="text-xl font-bold">{fmt(capital.balance)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <TrendingUp size={20} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الأرباح</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">{fmt(totals.totalEarned)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <CheckCircle size={20} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مصروف</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">{fmt(totals.totalPaid)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              <Clock size={20} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>قيد الانتظار</p>
          </div>
          <p className="text-xl font-bold text-amber-500">{fmt(totals.pending)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>
      </div>

      {/* معلومات الشريك */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* رأس المال */}
        <div className="glass-card p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Wallet size={18} style={{ color: '#6366F1' }} />
            رأس المال
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl"
                 style={{ background: 'rgba(16,185,129,0.08)' }}>
              <span className="text-sm">إجمالي الإيداعات</span>
              <strong className="text-emerald-600">{fmt(capital.deposits)} د.ع</strong>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl"
                 style={{ background: 'rgba(239,68,68,0.08)' }}>
              <span className="text-sm">إجمالي السحوبات</span>
              <strong className="text-red-500">{fmt(capital.withdrawals)} د.ع</strong>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl"
                 style={{ background: 'rgba(99,102,241,0.1)' }}>
              <span className="text-sm font-bold">الرصيد الحالي</span>
              <strong className="text-primary-500 text-lg">{fmt(capital.balance)} د.ع</strong>
            </div>
          </div>
        </div>

        {/* النسبة والحصة */}
        <div className="glass-card p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Percent size={18} style={{ color: '#8B5CF6' }} />
            نسبة الربح
          </h3>
          <div className="text-center py-4">
            <p className="text-6xl font-bold" style={{ color: '#8B5CF6' }}>
              {partner.share_percentage}%
            </p>
            <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
              من إجمالي الأرباح الشهرية
            </p>
          </div>
        </div>
      </div>

      {/* التوزيعات */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp size={18} style={{ color: '#10B981' }} />
            سجل التوزيعات ({distributions.length})
          </h3>
        </div>

        {distributions.length === 0 ? (
          <div className="p-10 text-center">
            <TrendingUp size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد توزيعات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">الشهر</th>
                  <th className="p-3 text-start">صافي الربح</th>
                  <th className="p-3 text-start">النسبة</th>
                  <th className="p-3 text-start">حصتك</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-3 font-semibold">{MONTHS[d.month - 1]} {d.year}</td>
                    <td className="p-3 text-xs">{fmt(d.gross_profit)}</td>
                    <td className="p-3">{d.share_percentage}%</td>
                    <td className="p-3 font-bold text-emerald-600">{fmt(d.partner_share)} د.ع</td>
                    <td className="p-3">
                      {d.status === 'paid' ? (
                        <span className="badge-success">✓ مصروف</span>
                      ) : (
                        <span className="badge-warning">⏳ قيد الانتظار</span>
                      )}
                    </td>
                    <td className="p-3 text-xs" dir="ltr">
                      {d.paid_at ? new Date(d.paid_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        🖋️ {schoolName} — بوابة الشركاء
      </div>
    </div>
  )
}