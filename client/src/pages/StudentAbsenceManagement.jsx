import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar, Edit, Trash2, X, Save, Plus, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Clock, FileText, ArrowRight, User,
  Shield, RotateCcw, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// حالات الحضور
// ============================================
const STATUSES = [
  { value: 'present',  label: 'حاضر',  icon: '✅', color: '#10B981' },
  { value: 'absent',   label: 'غائب',  icon: '❌', color: '#EF4444' },
  { value: 'late',     label: 'متأخر', icon: '⏰', color: '#F59E0B' },
  { value: 'excused',  label: 'بعذر',  icon: '📝', color: '#64748B' },
]

const SESSIONS = [
  { value: 'morning',   label: 'صباحي', icon: '🌅' },
  { value: 'afternoon', label: 'مسائي', icon: '🌇' },
]

// ============================================
// المستويات
// ============================================
const LEVEL_INFO = {
  0: { label: 'نشط',           icon: '✅', color: '#10B981' },
  1: { label: 'إنذار أول',     icon: '🔔', color: '#F59E0B' },
  2: { label: 'إنذار ثاني',    icon: '⚠️', color: '#EA580C' },
  3: { label: 'تعهد',          icon: '🟠', color: '#DC2626' },
  4: { label: 'راسب بالغياب',  icon: '❌', color: '#7F1D1D' },
}

export default function StudentAbsenceManagement() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    session: 'morning',
    status: 'absent',
    notes: '',
  })

  useEffect(() => {
    if (studentId) {
      fetchData()
    }
  }, [studentId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/student-attendance/absence/${studentId}`)
      setData(res.data.data)
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingRecord(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      session: 'morning',
      status: 'absent',
      notes: '',
    })
    setShowAddModal(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    setFormData({
      date: record.date,
      session: record.session,
      status: record.status,
      notes: record.notes || '',
    })
    setShowAddModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setSaving(true)
    try {
      if (editingRecord) {
        // تعديل
        await api.put(`/student-attendance/absence/record/${editingRecord.id}`, {
          status: formData.status,
          notes: formData.notes,
        })
        toast.success('تم التحديث وإعادة الحساب')
      } else {
        // إضافة
        await api.post(`/student-attendance/absence/${studentId}/add`, formData)
        toast.success('تم الإضافة وإعادة الحساب')
      }
      setShowAddModal(false)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    if (!confirm(`حذف غياب يوم ${record.date}؟`)) return

    try {
      await api.delete(`/student-attendance/absence/record/${record.id}`)
      toast.success('تم الحذف وإعادة الحساب')
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const handleRecalculate = async () => {
    if (!confirm('إعادة حساب الغيابات من السجلات؟')) return

    try {
      const res = await api.post(`/student-attendance/recalculate/${studentId}`)
      toast.success(`تم إعادة الحساب: ${res.data.data.total} غياب`)
      fetchData()
    } catch (e) {
      toast.error('فشل إعادة الحساب')
    }
  }

  const handleClearAll = async () => {
    if (!confirm(`⚠️ محو كل غيابات ${data.student.full_name}؟\n\nهذا الإجراء لا يمكن التراجع عنه!`)) return

    const confirmation = prompt(`اكتب "محو" لتأكيد الحذف:`)
    if (confirmation !== 'محو') {
      toast.error('تم الإلغاء')
      return
    }

    try {
      const res = await api.delete(`/student-attendance/absence/${studentId}/clear`)
      toast.success(res.data.message)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const getStatusInfo = (value) => STATUSES.find(s => s.value === value) || STATUSES[0]
  const getSessionInfo = (value) => SESSIONS.find(s => s.value === value) || SESSIONS[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) return null

  const { student, records, stats } = data
  const levelInfo = LEVEL_INFO[stats.level] || LEVEL_INFO[0]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost !p-2"
          title="رجوع"
        >
          <ArrowRight size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-primary-500" size={26} />
            إدارة غيابات الطالب
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            عرض وتعديل وحذف غيابات {student.full_name}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleRecalculate}
            className="btn-ghost border-2 flex items-center gap-2"
            style={{ borderColor: 'var(--border-color)' }}
            title="إعادة حساب الغيابات من السجلات"
          >
            <RefreshCw size={16} />
            إعادة حساب
          </button>

          {hasPermission('attendance.confirm') && (
            <button
              onClick={openAdd}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              إضافة غياب
            </button>
          )}
        </div>
      </div>

      {/* بطاقة الطالب */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            {student.full_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-bold text-lg">{student.full_name}</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {student.grade} {student.section && `- شعبة ${student.section}`}
            </p>
            {student.guardian_phone && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                📞 {student.guardian_phone}
              </p>
            )}
          </div>
          <div className="p-3 rounded-xl"
               style={{ background: `${levelInfo.color}15` }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>المستوى الحالي</p>
            <p className="font-bold" style={{ color: levelInfo.color }}>
              {levelInfo.icon} {levelInfo.label}
            </p>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي الغياب</p>
          <p className="text-2xl font-bold text-red-500">{stats.total}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>يوم</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>متتالي حالياً</p>
          <p className="text-2xl font-bold text-amber-500">{stats.streak}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>يوم</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>سجلات الغياب</p>
          <p className="text-2xl font-bold text-red-500">{stats.absent_count}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>سجل</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>أيام بعذر</p>
          <p className="text-2xl font-bold text-slate-500">{stats.excused_count}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>سجل</p>
        </div>
      </div>

      {/* تنبيه المحو الكامل */}
      {hasPermission('attendance.confirm') && records.length > 0 && (
        <div className="glass-card p-4 border-2"
             style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-bold text-red-600">منطقة خطرة</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                محو كل غيابات الطالب — لا يمكن التراجع
              </p>
            </div>
            <button
              onClick={handleClearAll}
              className="btn-ghost text-red-500 border-2 border-red-500/30"
              disabled={user?.role !== 'admin'}
              title={user?.role !== 'admin' ? 'المدير فقط' : 'محو كل الغيابات'}
            >
              <Trash2 size={16} />
              محو كامل
            </button>
          </div>
        </div>
      )}

      {/* جدول السجلات */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between"
             style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-bold flex items-center gap-2">
            <FileText size={18} />
            سجلات الحضور والغياب ({records.length})
          </h3>
        </div>

        {records.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد سجلات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-start">الحصة</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">ملاحظات</th>
                  <th className="p-3 text-start">المسجِّل</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const statusInfo = getStatusInfo(r.status)
                  const sessionInfo = getSessionInfo(r.session)

                  return (
                    <tr key={r.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3 font-medium" dir="ltr">{r.date}</td>
                      <td className="p-3 text-xs">{sessionInfo.icon} {sessionInfo.label}</td>
                      <td className="p-3">
                        <span className="badge"
                              style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3 text-xs max-w-[200px]">
                        {r.notes || '—'}
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {r.recorded_by_name || '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {hasPermission('attendance.confirm') && (
                            <>
                              <button
                                onClick={() => openEdit(r)}
                                className="btn-ghost !p-2 text-blue-500"
                                title="تعديل"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(r)}
                                className="btn-ghost !p-2 text-red-500"
                                title="حذف"
                              >
                                <Trash2 size={14} />
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

      {/* نافذة الإضافة/التعديل */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingRecord ? 'تعديل السجل' : 'إضافة غياب يدوي'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost !p-2 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingRecord && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">
                      التاريخ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input-modern"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1.5">الحصة</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SESSIONS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, session: s.value })}
                          className="p-3 rounded-xl border-2 transition-all text-center"
                          style={{
                            borderColor: formData.session === s.value ? '#6366F1' : 'var(--border-color)',
                            background: formData.session === s.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
                          }}
                        >
                          <div className="text-xl mb-1">{s.icon}</div>
                          <div className="text-xs font-bold">{s.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium block mb-2">الحالة</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: s.value })}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: formData.status === s.value ? s.color : 'var(--border-color)',
                        background: formData.status === s.value ? `${s.color}15` : 'var(--bg-card)',
                      }}
                    >
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="text-xs font-bold"
                           style={{ color: formData.status === s.value ? s.color : 'var(--text-primary)' }}>
                        {s.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-modern"
                  rows="2"
                  placeholder="سبب الإضافة اليدوية أو العذر..."
                />
              </div>

              <div className="p-3 rounded-xl text-xs"
                   style={{ background: 'rgba(99,102,241,0.08)', color: '#4F46E5' }}>
                💡 سيتم إعادة حساب الغيابات تلقائياً بعد الحفظ
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" disabled={saving}
                        className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {saving ? 'جاري الحفظ...' : editingRecord ? 'حفظ التعديلات' : 'إضافة السجل'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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