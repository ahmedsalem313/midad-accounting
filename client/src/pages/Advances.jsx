import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, HandCoins, AlertCircle,
  CheckCircle, XCircle, Clock, Users, DollarSign, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ExportButton from '../components/ExportButton'
import { useAuth } from '../contexts/AuthContext'
import { getTeacherTitle, getCurrentSchoolType } from '../utils/schoolData'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

const STATUSES = {
  pending:  { label: 'بانتظار الموافقة', color: '#F59E0B', icon: '⏳' },
  approved: { label: 'معتمدة',          color: '#3B82F6', icon: '✅' },
  rejected: { label: 'مرفوضة',          color: '#EF4444', icon: '❌' },
  deducted: { label: 'تم الخصم',        color: '#10B981', icon: '💰' },
}

export default function Advances() {
  const { hasPermission, user } = useAuth()
  const schoolType = getCurrentSchoolType()
  const teacherTitle = getTeacherTitle(schoolType)

  const isTeacher = user?.role === 'teacher'
  const isAdmin = user?.role === 'admin'

  const [advances, setAdvances] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingAdvance, setEditingAdvance] = useState(null)
  const [formData, setFormData] = useState(getEmptyForm())

  function getEmptyForm() {
    const now = new Date()
    return {
      teacher_id: '',
      amount: 0,
      reason: '',
      request_date: now.toISOString().split('T')[0],
      deduction_month: now.getMonth() + 1,
      deduction_year: now.getFullYear(),
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [advRes, usersRes] = await Promise.all([
        api.get('/advances'),
        api.get('/users'),
      ])
      setAdvances(advRes.data.data)
      const teacherUsers = usersRes.data.data.filter(
        (u) => u.role === 'teacher' || u.role === 'accountant'
      )
      setTeachers(teacherUsers)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const filtered = advances.filter((a) => {
    if (filterStatus && a.status !== filterStatus) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      a.teacher_name?.toLowerCase().includes(q) ||
      a.reason?.toLowerCase().includes(q) ||
      String(a.amount).includes(q)
    )
  })

  const openAdd = () => {
    setEditingAdvance(null)
    setFormData({
      ...getEmptyForm(),
      teacher_id: isTeacher ? user.id : '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.teacher_id || !formData.amount) {
      toast.error('يرجى إدخال البيانات المطلوبة')
      return
    }

    try {
      await api.post('/advances', formData)
      toast.success('تم إنشاء الطلب')
      setShowModal(false)
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleApprove = async (adv) => {
    if (!confirm(`الموافقة على سلفة ${adv.teacher_name} بمبلغ ${fmt(adv.amount)} د.ع؟`)) return
    try {
      await api.post(`/advances/${adv.id}/approve`)
      toast.success('تمت الموافقة')
      fetchAll()
    } catch (e) {
      toast.error('فشل')
    }
  }

  const handleReject = async (adv) => {
    if (!confirm(`رفض سلفة ${adv.teacher_name}؟`)) return
    try {
      await api.post(`/advances/${adv.id}/reject`)
      toast.success('تم الرفض')
      fetchAll()
    } catch (e) {
      toast.error('فشل')
    }
  }

  const handleDelete = async (adv) => {
    if (!confirm(`حذف طلب السلفة؟`)) return
    try {
      await api.delete(`/advances/${adv.id}`)
      toast.success('تم الحذف')
      fetchAll()
    } catch (e) {
      toast.error('فشل')
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')
  const getStatusInfo = (s) => STATUSES[s] || STATUSES.pending

  // إحصائيات
  const stats = {
    total: advances.reduce((sum, a) => sum + (a.status === 'approved' ? a.amount : 0), 0),
    pending: advances.filter((a) => a.status === 'pending').length,
    approved: advances.filter((a) => a.status === 'approved').length,
    count: advances.length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HandCoins className="text-primary-500" size={26} />
            {isTeacher ? 'سلفي' : 'إدارة السلف'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {advances.length} طلب
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
  <ExportButton
    data={filtered}
    filename="السلف"
    sheetName="السلف"
    columns={[
      { key: 'teacher_name', label: 'المعلم' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'reason', label: 'السبب' },
      { key: 'request_date', label: 'تاريخ الطلب' },
      { key: 'deduction_month', label: 'شهر الخصم', format: (v) => MONTHS[v - 1] },
      { key: 'deduction_year', label: 'سنة الخصم' },
      { key: 'status', label: 'الحالة', format: (v) => getStatusInfo(v).label },
    ]}
  />
  {hasPermission('advances.request') && (
    <button onClick={openAdd} className="btn-primary flex items-center gap-2">
      <Plus size={18} />
      {isTeacher ? 'طلب سلفة' : 'إضافة سلفة'}
    </button>
  )}
</div>
      </div>

      {/* Stats (للمدير) */}
      {!isTeacher && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الطلبات</p>
                <p className="text-lg font-bold">{stats.count}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>بانتظار</p>
                <p className="text-lg font-bold text-amber-500">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>معتمدة</p>
                <p className="text-lg font-bold text-blue-500">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                <DollarSign size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي معتمد</p>
                <p className="text-lg font-bold text-emerald-600 truncate">{fmt(stats.total)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input type="text" value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="🔍 بحث..."
                 className="input-modern ps-10" />
        </div>

        <select value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-modern !w-auto min-w-[180px]">
          <option value="">كل الحالات</option>
          {Object.entries(STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد سلف</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  {!isTeacher && <th className="p-3 text-start">{teacherTitle}</th>}
                  <th className="p-3 text-start">المبلغ</th>
                  <th className="p-3 text-start">السبب</th>
                  <th className="p-3 text-start">تاريخ الطلب</th>
                  <th className="p-3 text-start">شهر الخصم</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const info = getStatusInfo(a.status)
                  return (
                    <tr key={a.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      {!isTeacher && <td className="p-3 font-semibold">{a.teacher_name}</td>}
                      <td className="p-3 font-bold text-primary-500">{fmt(a.amount)} د.ع</td>
                      <td className="p-3 text-xs">{a.reason || '—'}</td>
                      <td className="p-3 text-xs" dir="ltr">{a.request_date}</td>
                      <td className="p-3 text-xs">
                        {MONTHS[a.deduction_month - 1]} {a.deduction_year}
                      </td>
                      <td className="p-3">
                        <span className="badge text-xs"
                              style={{ background: `${info.color}20`, color: info.color }}>
                          {info.icon} {info.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {hasPermission('advances.approve') && a.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(a)}
                                      className="btn-ghost !p-2 text-emerald-500"
                                      title="موافقة">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={() => handleReject(a)}
                                      className="btn-ghost !p-2 text-red-500"
                                      title="رفض">
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {hasPermission('advances.approve') && a.status !== 'deducted' && (
                            <button onClick={() => handleDelete(a)}
                                    className="btn-ghost !p-2 text-red-500"
                                    title="حذف">
                              <Trash2 size={14} />
                            </button>
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
          <div className="glass-card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <HandCoins className="text-primary-500" size={22} />
                {isTeacher ? 'طلب سلفة جديد' : 'إضافة سلفة'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isTeacher && (
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    {teacherTitle} <span className="text-red-500">*</span>
                  </label>
                  <select value={formData.teacher_id}
                          onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                          className="input-modern" required>
                    <option value="">اختر...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  المبلغ (د.ع) <span className="text-red-500">*</span>
                </label>
                <input type="number" value={formData.amount}
                       onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                       className="input-modern" min="0" required />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">السبب</label>
                <textarea value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          className="input-modern" rows="2"
                          placeholder="مثال: ظرف طارئ..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">شهر الخصم</label>
                  <select value={formData.deduction_month}
                          onChange={(e) => setFormData({ ...formData, deduction_month: parseInt(e.target.value) })}
                          className="input-modern">
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">السنة</label>
                  <select value={formData.deduction_year}
                          onChange={(e) => setFormData({ ...formData, deduction_year: parseInt(e.target.value) })}
                          className="input-modern">
                    {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs p-3 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--text-secondary)' }}>
                💡 {isTeacher
                  ? 'سيتم إرسال طلبك للمدير للموافقة. عند الموافقة، يُخصم المبلغ من راتب الشهر المحدد.'
                  : 'عند الموافقة، سيُخصم المبلغ تلقائياً من راتب الشهر المحدد.'}
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1">
                  {isTeacher ? 'إرسال الطلب' : 'حفظ'}
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