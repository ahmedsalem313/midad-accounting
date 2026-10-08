import { useState, useEffect } from 'react'
import {
  TrendingUp, DollarSign, Calendar, Percent, AlertCircle,
  CheckCircle, Wallet, Users, ArrowLeft, Save, Coins, Receipt
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function PartnerProfits() {
  const { hasPermission } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [distributing, setDistributing] = useState(false)
  const [distributions, setDistributions] = useState([])

  useEffect(() => {
    fetchData()
    fetchDistributions()
  }, [year, month])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/partners/profits/${year}/${month}`)
      setData(res.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const fetchDistributions = async () => {
    try {
      const res = await api.get('/partners/distributions/all', { params: { year, month } })
      setDistributions(res.data.data)
    } catch (e) {}
  }

  const handleDistribute = async () => {
    if (!data) return
    if (data.netProfit <= 0) {
      toast.error('لا يوجد ربح لهذا الشهر')
      return
    }
    if (data.is_distributed) {
      toast.error('تم التوزيع لهذا الشهر مسبقًا')
      return
    }

    if (!confirm(
      `توزيع أرباح ${MONTHS[month - 1]} ${year}؟\n\n` +
      `صافي الربح: ${fmt(data.netProfit)} د.ع\n` +
      `عدد الشركاء: ${data.shares.length}\n\n` +
      `سيتم إنشاء ${data.shares.length} توزيع بحالة "قيد الانتظار".`
    )) return

    try {
      setDistributing(true)
      const res = await api.post('/partners/distribute', { year, month })
      toast.success(res.data.message)
      fetchData()
      fetchDistributions()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل التوزيع')
    } finally {
      setDistributing(false)
    }
  }

  const handlePay = async (dist) => {
    if (!confirm(`صرف ${fmt(dist.partner_share)} د.ع لـ ${dist.partner_name}؟`)) return
    try {
      await api.post(`/partners/distributions/${dist.id}/pay`, { paid_method: 'cash' })
      toast.success('تم الصرف')
      fetchDistributions()
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الصرف')
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  const years = [year - 1, year, year + 1]

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-primary-500" size={26} />
            الأرباح والتوزيع
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            حساب أرباح الشهر وتوزيعها على الشركاء
          </p>
        </div>

        {hasPermission('partners.distribute') && data && data.netProfit > 0 && !data.is_distributed && (
          <button onClick={handleDistribute} disabled={distributing}
                  className="btn-primary flex items-center gap-2">
            <Coins size={18} />
            {distributing ? 'جاري التوزيع...' : 'توزيع الأرباح'}
          </button>
        )}
      </div>

      {/* اختيار الفترة */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium">الفترة:</label>
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                className="input-modern !w-auto">
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
                className="input-modern !w-auto">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        {data?.is_distributed && (
          <span className="badge-success ms-auto">✓ تم التوزيع</span>
        )}
      </div>

      {/* بطاقات الأرباح */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} style={{ color: '#10B981' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الإيرادات</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">{fmt(data.income)}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={18} style={{ color: '#EF4444' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>المصاريف</p>
              </div>
              <p className="text-xl font-bold text-red-500">{fmt(data.expenses)}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} style={{ color: '#F59E0B' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>رواتب مدفوعة</p>
              </div>
              <p className="text-xl font-bold text-amber-500">{fmt(data.payrolls)}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
            </div>

            <div className="glass-card p-4"
                 style={{
                   background: data.netProfit > 0
                     ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(99,102,241,0.15))'
                     : 'rgba(239,68,68,0.1)',
                 }}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} style={{ color: data.netProfit > 0 ? '#10B981' : '#EF4444' }} />
                <p className="text-xs font-bold">صافي الربح</p>
              </div>
              <p className="text-2xl font-bold"
                 style={{ color: data.netProfit > 0 ? '#10B981' : '#EF4444' }}>
                {fmt(data.netProfit)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
            </div>
          </div>

          {/* حصص الشركاء */}
          <div className="glass-card p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users size={18} /> حصص الشركاء
            </h3>

            {data.shares.length === 0 ? (
              <p className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>
                لا يوجد شركاء نشطون
              </p>
            ) : data.netProfit <= 0 ? (
              <div className="p-6 text-center rounded-xl"
                   style={{ background: 'rgba(239,68,68,0.08)' }}>
                <AlertCircle size={48} className="mx-auto mb-3 text-red-500" />
                <p className="font-bold text-red-500 mb-2">لا يوجد ربح هذا الشهر</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {data.netProfit < 0 ? 'الخسارة' : 'صافي الربح صفر'}: {fmt(Math.abs(data.netProfit))} د.ع
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.shares.map((s) => (
                  <div key={s.partner_id}
                       className="p-4 rounded-xl flex items-center gap-4"
                       style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                      {s.partner_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{s.partner_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge-info">{s.share_percentage}%</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>حصة الشريك</p>
                      <p className="text-xl font-bold" style={{ color: '#10B981' }}>
                        {fmt(s.share_amount)} د.ع
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* التوزيعات المحفوظة */}
          {distributions.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="font-bold">توزيعات {MONTHS[month - 1]} {year}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="p-3 text-start">الشريك</th>
                    <th className="p-3 text-center">النسبة</th>
                    <th className="p-3 text-center">الحصة</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((d) => (
                    <tr key={d.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 font-semibold">{d.partner_name}</td>
                      <td className="p-3 text-center">{d.share_percentage}%</td>
                      <td className="p-3 text-center font-bold text-emerald-600">
                        {fmt(d.partner_share)} د.ع
                      </td>
                      <td className="p-3 text-center">
                        {d.status === 'paid' ? (
                          <span className="badge-success">
                            <CheckCircle size={12} /> مصروف
                          </span>
                        ) : (
                          <span className="badge-warning">⏳ قيد الانتظار</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {d.status !== 'paid' && hasPermission('partners.distribute') && (
                          <button onClick={() => handlePay(d)}
                                  className="btn-primary !py-1 !px-3 !text-xs">
                            <DollarSign size={12} />
                            صرف
                          </button>
                        )}
                        {d.status === 'paid' && d.paid_at && (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {new Date(d.paid_at).toLocaleDateString('ar-IQ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}