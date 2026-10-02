import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone, MessageCircle, UserCheck, FileText, Users, Plus, Search,
  Edit, Trash2, X, Save, Calendar, AlertCircle, CheckCircle,
  Clock, ArrowRight, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// أنواع التواصل
// ============================================
const TYPES = [
  { value: 'call',     label: 'مكالمة هاتفية', icon: Phone,         color: '#6366F1' },
  { value: 'whatsapp', label: 'واتساب',         icon: MessageCircle, color: '#10B981' },
  { value: 'visit',    label: 'زيارة للمدرسة',  icon: UserCheck,     color: '#F59E0B' },
  { value: 'letter',   label: 'رسالة مكتوبة',   icon: FileText,      color: '#8B5CF6' },
  { value: 'meeting',  label: 'اجتماع',         icon: Users,         color: '#EC4899' },
]

// حالات النتيجة
const STATUSES = [
  { value: 'pending',        label: 'قيد الانتظار',   color: '#F59E0B', icon: Clock },
  { value: 'resolved',       label: 'تم الحل',         color: '#10B981', icon: CheckCircle },
  { value: 'needs_followup', label: 'يحتاج متابعة',   color: '#EF4444', icon: AlertCircle },
]

export default function Communications() {
  const navigate = useNavigate()
  const { hasPermission, user } = useAuth()

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [students, setStudents] = useState([])

  function getEmptyForm() {
    return {
      student_id: '',
      type: 'call',
      subject: '',
      reason: '',
      notes: '',
      result: '',
      result_status: 'pending',
      communication_date: new Date().toISOString().split('T')[0],
      follow_up_date: '',
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  useEffect(() => {
    fetchRecords()
    fetchStudents()
  }, [filterType, filterStatus])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterType) params.type = filterType
      if (filterStatus) params.result_status = filterStatus
      const res = await api.get('/communications', { params })
      setRecords(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل السجلات')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await api.get('/users/me/students')
      setStudents(res.data.data)
    } catch (e) {
      console.error(e)
    }
  }

  const openAdd = () => {
    setEditingRecord(null)
    setFormData(getEmptyForm())
    setShowModal(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    setFormData({
      student_id: record.student_id,
      type: record.type,
      subject: record.subject,
      reason: record.reason,
      notes: record.notes || '',
      result: record.result || '',
      result_status: record.result_status || 'pending',
      communication_date: record.communication_date,
      follow_up_date: record.follow_up_date || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.student_id || !formData.subject || !formData.reason || !formData.communication_date) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }

    try {
      if (editingRecord) {
        await api.put(`/communications/${editingRecord.id}`, formData)
        toast.success('تم التحديث')
      } else {
        await api.post('/communications', formData)
        toast.success('تم إضافة السجل')
      }
      setShowModal(false)
      fetchRecords()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDelete = async (record) => {
    if (!confirm(`حذف سجل التواصل مع ولي أمر ${record.student_name}؟`)) return
    try {
      await api.delete(`/communications/${record.id}`)
      toast.success('تم الحذف')
      fetchRecords()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const getTypeInfo = (value) => TYPES.find(t => t.value === value) || TYPES[0]
  const getStatusInfo = (value) => STATUSES.find(s => s.value === value) || STATUSES[0]

  const filtered = records.filter((r) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      r.student_name?.toLowerCase().includes(q) ||
      r.subject?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q) ||
      r.guardian_name?.toLowerCase().includes(q)
    )
  })

  // إحصائيات
  const stats = {
    total: records.length,
    resolved: records.filter(r => r.result_status === 'resolved').length,
    pending: records.filter(r => r.result_status === 'pending').length,
    needs_followup: records.filter(r => r.result_status === 'needs_followup').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="text-primary-500" size={26} />
            سجل التواصل مع أولياء الأمور
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            تسجيل كل محاولات التواصل ومتابعة النتائج
          </p>
        </div>

        {hasPermission('communications.create') && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة سجل
          </button>
        )}
      </div>

      {/* بطاقات إحصائية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <Phone size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الإجمالي</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>تم الحل</p>
              <p className="text-xl font-bold text-emerald-600">{stats.resolved}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>قيد الانتظار</p>
              <p className="text-xl font-bold text-amber-500">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>يحتاج متابعة</p>
              <p className="text-xl font-bold text-red-500">{stats.needs_followup}</p>
            </div>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث بالطالب، الموضوع، ولي الأمر..."
            className="input-modern ps-10"
          />
        </div>

        <select value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-modern !w-auto min-w-[180px]">
          <option value="">كل الأنواع</option>
          {TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-modern !w-auto min-w-[180px]">
          <option value="">كل الحالات</option>
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Phone size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>
              {records.length === 0 ? 'لا توجد سجلات تواصل بعد' : 'لا توجد نتائج مطابقة'}
            </p>
            {hasPermission('communications.create') && records.length === 0 && (
              <button onClick={openAdd} className="btn-primary mt-4">
                <Plus size={18} />
                إضافة أول سجل
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">ولي الأمر</th>
                  <th className="p-3 text-start">النوع</th>
                  <th className="p-3 text-start">الموضوع</th>
                  <th className="p-3 text-start">السبب</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const typeInfo = getTypeInfo(r.type)
                  const statusInfo = getStatusInfo(r.result_status)
                  const TypeIcon = typeInfo.icon
                  const StatusIcon = statusInfo.icon

                  return (
                    <tr key={r.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 text-xs" dir="ltr">{r.communication_date}</td>
                      <td className="p-3">
                        <button
                          onClick={() => navigate(`/students/${r.student_id}/communications`)}
                          className="font-semibold hover:underline text-start"
                          style={{ color: '#6366F1' }}
                        >
                          {r.student_name}
                        </button>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {r.student_grade} {r.student_section && `- ${r.student_section}`}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        <div>{r.guardian_name}</div>
                        <div className="text-xs" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                          {r.guardian_phone}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="badge"
                              style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                          <TypeIcon size={12} /> {typeInfo.label}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{r.subject}</td>
                      <td className="p-3 text-xs" style={{ maxWidth: '200px' }}>
                        {r.reason?.length > 50 ? r.reason.substring(0, 50) + '...' : r.reason}
                      </td>
                      <td className="p-3">
                        <span className="badge"
                              style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                          <StatusIcon size={12} /> {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {hasPermission('communications.edit') && (
                            <button
                              onClick={() => openEdit(r)}
                              className="btn-ghost !p-2 text-blue-500"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {hasPermission('communications.delete') && (
                            <button
                              onClick={() => handleDelete(r)}
                              className="btn-ghost !p-2 text-red-500"
                              title="حذف"
                            >
                              <Trash2 size={16} />
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

      {/* نافذة الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-3xl max-h-[95vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingRecord ? 'تعديل السجل' : 'إضافة سجل تواصل جديد'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost !p-2 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* الطالب */}
              {!editingRecord && (
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    الطالب <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="input-modern"
                    required
                  >
                    <option value="">اختر الطالب...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} — {s.grade} {s.section && `- ${s.section}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* النوع */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  نوع التواصل <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {TYPES.map((t) => {
                    const TypeIcon = t.icon
                    const isActive = formData.type === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t.value })}
                        className="p-3 rounded-xl border-2 transition-all text-center"
                        style={{
                          borderColor: isActive ? t.color : 'var(--border-color)',
                          background: isActive ? `${t.color}15` : 'var(--bg-card)',
                        }}
                      >
                        <TypeIcon size={20} className="mx-auto mb-1"
                                  style={{ color: isActive ? t.color : 'var(--text-secondary)' }} />
                        <div className="text-xs font-bold"
                             style={{ color: isActive ? t.color : 'var(--text-primary)' }}>
                          {t.label}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  الموضوع <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input-modern"
                  placeholder="مثال: غياب متكرر، تراجع في الدرجات..."
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  سبب التواصل <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="input-modern"
                  rows="2"
                  placeholder="لماذا تم التواصل؟"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    تاريخ التواصل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.communication_date}
                    onChange={(e) => setFormData({ ...formData, communication_date: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    تاريخ المتابعة
                  </label>
                  <input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    className="input-modern"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  حالة المتابعة
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map((s) => {
                    const StatusIcon = s.icon
                    const isActive = formData.result_status === s.value
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, result_status: s.value })}
                        className="p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2"
                        style={{
                          borderColor: isActive ? s.color : 'var(--border-color)',
                          background: isActive ? `${s.color}15` : 'var(--bg-card)',
                        }}
                      >
                        <StatusIcon size={16} style={{ color: isActive ? s.color : 'var(--text-secondary)' }} />
                        <span className="text-xs font-bold"
                              style={{ color: isActive ? s.color : 'var(--text-primary)' }}>
                          {s.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">النتيجة</label>
                <textarea
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  className="input-modern"
                  rows="2"
                  placeholder="ما الذي تم الاتفاق عليه؟ ما النتيجة؟"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظات إضافية</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-modern"
                  rows="2"
                  placeholder="أي تفاصيل أخرى..."
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingRecord ? 'حفظ التعديلات' : 'إضافة السجل'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost"
                >
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