import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight, User, Briefcase, TrendingUp, Wallet, DollarSign,
  Percent, CheckCircle, Clock, AlertCircle, Calendar, Building2, Phone, Mail
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function PartnerReport() {
  const { partnerId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [partnerId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/partners/report/${partnerId}`)
      setData(res.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
        <p>الشريك غير موجود</p>
      </div>
    )
  }

  const { partner, capital, distributions, totals } = data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/partners')} className="btn-ghost !p-2">
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <User className="text-primary-500" size={26} />
              تقرير الشريك
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              تقرير شامل عن الشريك والأرباح
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => navigate(`/partners/${partnerId}/capital`)}
                  className="btn-ghost border-2 flex items-center gap-2"
                  style={{ borderColor: 'var(--border-color)' }}>
            <Wallet size={18} />
            رأس المال
          </button>
        </div>
      </div>

      {/* بطاقة الشريك */}
      <div className="glass-card p-6"
           style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))' }}>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
               style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
            {partner.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="text-2xl font-bold mb-2">{partner.name}</h3>
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {partner.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={14} /> <span dir="ltr">{partner.phone}</span>
                </span>
              )}
              {partner.email && (
                <span className="flex items-center gap-1">
                  <Mail size={14} /> <span dir="ltr">{partner.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={14} /> انضم: {partner.joined_at || '—'}
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>نسبة الربح</p>
            <p className="text-4xl font-bold" style={{ color: '#6366F1' }}>
              {partner.share_percentage}%
            </p>
            {partner.is_active === 1 ? (
              <span className="badge-success mt-2 inline-block">✓ نشط</span>
            ) : (
              <span className="badge mt-2 inline-block"
                    style={{ background: 'rgba(100,116,139,0.15)', color: '#64748B' }}>
                موقوف
              </span>
            )}
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} style={{ color: '#6366F1' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>رأس المال</p>
          </div>
          <p className="text-lg font-bold">{fmt(capital.balance)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} style={{ color: '#10B981' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الأرباح</p>
          </div>
          <p className="text-lg font-bold text-emerald-600">{fmt(totals.totalEarned)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} style={{ color: '#10B981' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مصروف</p>
          </div>
          <p className="text-lg font-bold text-emerald-600">{fmt(totals.totalPaid)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} style={{ color: '#F59E0B' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>قيد الانتظار</p>
          </div>
          <p className="text-lg font-bold text-amber-500">{fmt(totals.pending)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>
      </div>

      {/* رأس المال التفصيلي */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          💰 ملخص رأس المال
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي الإيداعات</p>
            <p className="text-lg font-bold text-emerald-600">{fmt(capital.deposits)}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي السحوبات</p>
            <p className="text-lg font-bold text-red-500">{fmt(capital.withdrawals)}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>الرصيد الحالي</p>
            <p className="text-lg font-bold text-primary-500">{fmt(capital.balance)}</p>
          </div>
        </div>
      </div>

      {/* سجل التوزيعات */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-bold">📊 سجل التوزيعات ({distributions.length})</h3>
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
                  <th className="p-3 text-start">النسبة</th>
                  <th className="p-3 text-start">صافي الربح</th>
                  <th className="p-3 text-start">الحصة</th>
                  <th className="p-3 text-start">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-3 font-semibold">
                      {MONTHS[d.month - 1]} {d.year}
                    </td>
                    <td className="p-3">{d.share_percentage}%</td>
                    <td className="p-3 text-xs">{fmt(d.gross_profit)}</td>
                    <td className="p-3 font-bold text-emerald-600">
                      {fmt(d.partner_share)} د.ع
                    </td>
                    <td className="p-3">
                      {d.status === 'paid' ? (
                        <span className="badge-success">✓ مصروف</span>
                      ) : (
                        <span className="badge-warning">⏳ قيد الانتظار</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}