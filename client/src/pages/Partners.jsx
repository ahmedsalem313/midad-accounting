import { useState, useEffect } from 'react'
import {
  Users, Plus, Edit, Trash2, X, Save, TrendingUp,
  DollarSign, Percent, AlertCircle, Briefcase, Eye, Wallet
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
export default function Partners() {
  const { hasPermission } = useAuth()
  const [partners, setPartners] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)

  function getEmptyForm() {
    return {
      name: '',
      phone: '',
      email: '',
      share_percentage: 0,
      username: '',
      password: '',
      notes: '',
      create_account: false,
    }
  }

  const [form, setForm] = useState(getEmptyForm())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [partnersRes, summaryRes] = await Promise.all([
        api.get('/partners'),
        api.get('/partners/summary'),
      ])
      setPartners(partnersRes.data.data)
      setSummary(summaryRes.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingPartner(null)
    setForm(getEmptyForm())
    setShowModal(true)
  }

  const openEdit = (partner) => {
    setEditingPartner(partner)
    setForm({
      name: partner.name,
      phone: partner.phone || '',
      email: partner.email || '',
      share_percentage: partner.share_percentage,
      username: '',
      password: '',
      notes: partner.notes || '',
      create_account: false,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.name || !form.share_percentage) {
      toast.error('الاسم والنسبة مطلوبان')
      return
    }

    try {
      if (editingPartner) {
        await api.put(`/partners/${editingPartner.id}`, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          share_percentage: form.share_percentage,
          notes: form.notes,
        })
        toast.success('تم التحديث')
      } else {
        const payload = {
          name: form.name,
          phone: form.phone,
          email: form.email,
          share_percentage: form.share_percentage,
          notes: form.notes,
        }
        if (form.create_account && form.username && form.password) {
          payload.username = form.username
          payload.password = form.password
        }
        await api.post('/partners', payload)
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDelete = async (partner) => {
    if (!confirm(`حذف الشريك "${partner.name}"؟ سيُحذف حسابه أيضاً.`)) return
    try {
      await api.delete(`/partners/${partner.id}`)
      toast.success('تم الحذف')
      fetchData()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  const totalShares = summary?.total_shares || 0
  const remaining = summary?.remaining || 100

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="text-primary-500" size={26} />
            الشركاء
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إدارة الشركاء والمستثمرين في المدرسة
          </p>
        </div>

        {hasPermission('partners.create') && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة شريك
          </button>
        )}
      </div>

      {/* إحصائيات */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الشركاء</p>
                <p className="text-xl font-bold">{summary.total_partners}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                <Percent size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مجموع النسب</p>
                <p className="text-xl font-bold">{totalShares}%</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: remaining === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: remaining === 0 ? '#10B981' : '#F59E0B' }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>النسبة المتبقية</p>
                <p className="text-xl font-bold" style={{ color: remaining === 0 ? '#10B981' : '#F59E0B' }}>
                  {remaining}%
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>النشطون</p>
                <p className="text-xl font-bold text-purple-500">{summary.active_partners}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : partners.length === 0 ? (
          <div className="p-10 text-center">
            <Briefcase size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }} className="mb-4">لا يوجد شركاء بعد</p>
            {hasPermission('partners.create') && (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} />
                إضافة أول شريك
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">الشريك</th>
                  <th className="p-3 text-start">الهاتف</th>
                  <th className="p-3 text-center">النسبة</th>
                  <th className="p-3 text-center">رأس المال</th>
                  <th className="p-3 text-center">التوزيعات</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => {
                  const balance = (p.total_deposits || 0) - (p.total_withdrawals || 0)
                  return (
                    <tr key={p.id}
                        className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                               style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                            {p.name.charAt(0)}
                          </div>
                                                  <div>
                          <Link to={`/partners/${p.id}/capital`}
                                className="font-semibold text-primary-600 hover:text-primary-800 hover:underline">
                            {p.name}
                          </Link>
                          {p.username && (
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              @{p.username}
                            </p>
                          )}
                        </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs" dir="ltr">{p.phone || '—'}</td>
                      <td className="p-3 text-center">
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#4338CA', fontSize: '14px', fontWeight: 'bold' }}>
                          {p.share_percentage}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-semibold">
                        {fmt(balance)} د.ع
                      </td>
                      <td className="p-3 text-center">
                        <span className="badge-info">{p.distributions_count || 0}</span>
                      </td>
                      <td className="p-3 text-center">
                        {p.is_active === 1 ? (
                          <span className="badge-success">✓ نشط</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(100,116,139,0.15)', color: '#64748B' }}>
                            موقوف
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {hasPermission('partners.edit') && (
                            <>
                              <button onClick={() => openEdit(p)}
                                      className="btn-ghost !p-2 text-blue-500"
                                      title="تعديل">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDelete(p)}
                                      className="btn-ghost !p-2 text-red-500"
                                      title="حذف">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingPartner ? 'تعديل الشريك' : 'إضافة شريك جديد'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">
                    اسم الشريك <span className="text-red-500">*</span>
                  </label>
                  <input type="text"
                         value={form.name}
                         onChange={(e) => setForm({ ...form, name: e.target.value })}
                         className="input-modern"
                         required />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">الهاتف</label>
                  <input type="text"
                         value={form.phone}
                         onChange={(e) => setForm({ ...form, phone: e.target.value })}
                         className="input-modern"
                         dir="ltr" />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">البريد الإلكتروني</label>
                  <input type="email"
                         value={form.email}
                         onChange={(e) => setForm({ ...form, email: e.target.value })}
                         className="input-modern"
                         dir="ltr" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">
                    نسبة الربح <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="number"
                           value={form.share_percentage}
                           onChange={(e) => setForm({ ...form, share_percentage: parseFloat(e.target.value) || 0 })}
                           className="input-modern flex-1"
                           min="0" max="100" step="0.1"
                           required />
                    <span className="text-2xl font-bold" style={{ color: '#6366F1' }}>%</span>
                  </div>
                  {summary && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      المتاح: <strong>{remaining + (editingPartner?.share_percentage || 0)}%</strong>
                    </p>
                  )}
                </div>

                {!editingPartner && (
                  <>
                    <div className="md:col-span-2 p-3 rounded-xl"
                         style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                               checked={form.create_account}
                               onChange={(e) => setForm({ ...form, create_account: e.target.checked })}
                               className="w-4 h-4 rounded accent-primary-500" />
                        <span className="text-sm font-medium">
                          إنشاء حساب دخول للشريك (لعرض التقارير فقط)
                        </span>
                      </label>
                    </div>

                    {form.create_account && (
                      <>
                        <div>
                          <label className="text-sm font-medium block mb-1.5">اسم المستخدم</label>
                          <input type="text"
                                 value={form.username}
                                 onChange={(e) => setForm({ ...form, username: e.target.value })}
                                 className="input-modern"
                                 dir="ltr"
                                 placeholder="partner1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium block mb-1.5">كلمة المرور</label>
                          <input type="text"
                                 value={form.password}
                                 onChange={(e) => setForm({ ...form, password: e.target.value })}
                                 className="input-modern"
                                 dir="ltr"
                                 placeholder="partner123" />
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                  <textarea value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="input-modern"
                            rows="2" />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingPartner ? 'حفظ التعديلات' : 'إضافة الشريك'}
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