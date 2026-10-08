import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Wallet, Plus, Trash2, X, Save, TrendingUp, TrendingDown,
  DollarSign, User, Briefcase, AlertCircle, Calendar, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function PartnerCapital() {
  const { partnerId } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  function getEmptyForm() {
    return {
      type: 'deposit',
      amount: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      method: 'cash',
      notes: '',
    }
  }

  const [form, setForm] = useState(getEmptyForm())

  useEffect(() => {
    fetchData()
  }, [partnerId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/partners/${partnerId}/capital`)
      setData(res.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = (type) => {
    setForm({ ...getEmptyForm(), type })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || form.amount <= 0) {
      toast.error('المبلغ يجب أن يكون أكبر من صفر')
      return
    }

    try {
      await api.post(`/partners/${partnerId}/capital`, form)
      toast.success(form.type === 'deposit' ? 'تم الإيداع' : 'تم السحب')
      setShowModal(false)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل')
    }
  }

  const handleDelete = async (tx) => {
    if (!confirm('حذف هذه العملية؟')) return
    try {
      await api.delete(`/partners/capital/${tx.id}`)
      toast.success('تم الحذف')
      fetchData()
    } catch (e) {
      toast.error('فشل')
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
        <p>لا توجد بيانات</p>
      </div>
    )
  }

  const { transactions, totals } = data

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
              <Wallet className="text-primary-500" size={26} />
              رأس مال الشريك
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              إدارة الإيداعات والسحوبات
            </p>
          </div>
        </div>

        {hasPermission('partners.capital') && (
          <div className="flex gap-2">
            <button onClick={() => openAdd('deposit')}
                    className="btn-primary flex items-center gap-2">
              <ArrowUpCircle size={18} />
              إيداع
            </button>
            <button onClick={() => openAdd('withdrawal')}
                    className="btn-ghost border-2 flex items-center gap-2 text-red-500"
                    style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
              <ArrowDownCircle size={18} />
              سحب
            </button>
          </div>
        )}
      </div>

      {/* بطاقات ملخصة */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <ArrowUpCircle size={20} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الإيداعات</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totals.deposits)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              <ArrowDownCircle size={20} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي السحوبات</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{fmt(totals.withdrawals)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>

        <div className="glass-card p-5"
             style={{
               background: totals.balance > 0
                 ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))'
                 : 'rgba(148,163,184,0.1)',
             }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.2)', color: '#6366F1' }}>
              <DollarSign size={20} />
            </div>
            <p className="text-xs font-bold">الرصيد الحالي</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#6366F1' }}>{fmt(totals.balance)}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
        </div>
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-bold">📋 سجل العمليات ({transactions.length})</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد عمليات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">النوع</th>
                  <th className="p-3 text-start">المبلغ</th>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-start">الطريقة</th>
                  <th className="p-3 text-start">ملاحظات</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-3">
                      {tx.type === 'deposit' ? (
                        <span className="badge-success flex items-center gap-1 w-fit">
                          <ArrowUpCircle size={12} /> إيداع
                        </span>
                      ) : (
                        <span className="badge-danger flex items-center gap-1 w-fit">
                          <ArrowDownCircle size={12} /> سحب
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold"
                        style={{ color: tx.type === 'deposit' ? '#10B981' : '#EF4444' }}>
                      {tx.type === 'deposit' ? '+' : '-'}{fmt(tx.amount)} د.ع
                    </td>
                    <td className="p-3 text-xs" dir="ltr">{tx.transaction_date}</td>
                    <td className="p-3 text-xs">
                      {tx.method === 'cash' ? '💵 نقدي' :
                       tx.method === 'transfer' ? '🏦 تحويل' :
                       tx.method === 'check' ? '📝 شيك' : '💳 بطاقة'}
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {tx.notes || '—'}
                    </td>
                    <td className="p-3 text-center">
                      {hasPermission('partners.capital') && (
                        <button onClick={() => handleDelete(tx)}
                                className="btn-ghost !p-2 text-red-500"
                                title="حذف">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {form.type === 'deposit' ? (
                  <>
                    <ArrowUpCircle className="text-emerald-500" size={22} />
                    إيداع رأس مال
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="text-red-500" size={22} />
                    سحب من رأس المال
                  </>
                )}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  المبلغ (د.ع) <span className="text-red-500">*</span>
                </label>
                <input type="number"
                       value={form.amount}
                       onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                       className="input-modern"
                       min="1"
                       required
                       autoFocus />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">التاريخ</label>
                <input type="date"
                       value={form.transaction_date}
                       onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                       className="input-modern" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">طريقة الدفع</label>
                <select value={form.method}
                        onChange={(e) => setForm({ ...form, method: e.target.value })}
                        className="input-modern">
                  <option value="cash">💵 نقدي</option>
                  <option value="transfer">🏦 تحويل</option>
                  <option value="check">📝 شيك</option>
                  <option value="card">💳 بطاقة</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                <textarea value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          className="input-modern"
                          rows="2" />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {form.type === 'deposit' ? 'تسجيل الإيداع' : 'تسجيل السحب'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}