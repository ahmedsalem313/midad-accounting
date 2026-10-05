import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight, User, Phone, Calendar, GraduationCap, BookOpen,
  Wallet, Award, TrendingUp, AlertCircle, Plus, Edit, Trash2, X, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { getGradesByType, getCurrentSchoolType, SECTIONS } from '../utils/schoolData'
export default function StudentProfile() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [form, setForm] = useState(getEmptyForm())

  function getEmptyForm() {
    const y = new Date().getFullYear()
    return {
      student_id: parseInt(studentId),
      academic_year: `${y}-${y + 1}`,
      grade: '',
      section: '',
      status: 'enrolled',
      enrolled_at: new Date().toISOString().split('T')[0],
      left_at: '',
      left_reason: '',
      returned_at: '',
      final_average: '',
      result: '',
      notes: '',
    }
  }

  useEffect(() => {
    fetchData()
  }, [studentId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/student-history/student/${studentId}`)
      setData(res.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingEntry(null)
    setForm(getEmptyForm())
    setShowModal(true)
  }

  const openEdit = (entry) => {
    setEditingEntry(entry)
    setForm({
      student_id: entry.student_id,
      academic_year: entry.academic_year,
      grade: entry.grade,
      section: entry.section || '',
      status: entry.status,
      enrolled_at: entry.enrolled_at || '',
      left_at: entry.left_at || '',
      left_reason: entry.left_reason || '',
      returned_at: entry.returned_at || '',
      final_average: entry.final_average || '',
      result: entry.result || '',
      notes: entry.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingEntry) {
        await api.put(`/student-history/${editingEntry.id}`, form)
        toast.success('تم التحديث')
      } else {
        await api.post('/student-history', form)
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDelete = async (entry) => {
    if (!confirm(`حذف سجل ${entry.academic_year}؟`)) return
    try {
      await api.delete(`/student-history/${entry.id}`)
      toast.success('تم الحذف')
      fetchData()
    } catch (e) {
      toast.error('فشل الحذف')
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
        <p>الطالب غير موجود</p>
      </div>
    )
  }

  const { student, history, gradesByYear, paymentsByYear, promotions } = data

  // حساب الإحصائيات
  const totalPaid = Object.values(paymentsByYear).flat().reduce((s, p) => s + (p.paid_amount || 0), 0)
  const totalGrades = Object.values(gradesByYear).flat().length

  const resultLabels = {
    passed: { label: 'ناجح', color: '#10B981', icon: '✅' },
    failed: { label: 'راسب', color: '#EF4444', icon: '❌' },
    repeating: { label: 'معيد', color: '#F59E0B', icon: '🔁' },
    graduated: { label: 'متخرج', color: '#8B5CF6', icon: '🎓' },
  }

  const statusLabels = {
    enrolled: { label: 'مسجّل', color: '#10B981', icon: '📗' },
    left: { label: 'منقطع', color: '#EF4444', icon: '📕' },
    returned: { label: 'عاد', color: '#3B82F6', icon: '📘' },
    graduated: { label: 'متخرج', color: '#8B5CF6', icon: '🎓' },
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/students')} className="btn-ghost !p-2">
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <User className="text-primary-500" size={26} />
              {student.full_name}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              السجل الأكاديمي الشامل
            </p>
          </div>
        </div>

        {hasPermission('students.edit') && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة سنة دراسية
          </button>
        )}
      </div>

      {/* معلومات الطالب */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
               style={{ background: student.gender === 'female'
                 ? 'linear-gradient(135deg, #EC4899, #8B5CF6)'
                 : 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
            {student.gender === 'female' ? '👧' : '👦'}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{student.full_name}</h3>
            <div className="flex flex-wrap gap-3 mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1">
                <GraduationCap size={14} />
                {student.grade} {student.section && `- ${student.section}`}
              </span>
              {student.student_number && (
                <span className="flex items-center gap-1">
                  📌 رقم: {student.student_number}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>ولي الأمر:</span>
            <strong>{student.guardian_name}</strong>
          </div>
          <div className="flex items-center gap-2" dir="ltr">
            <Phone size={14} style={{ color: 'var(--text-secondary)' }} />
            <strong>{student.guardian_phone}</strong>
          </div>
          {student.birth_date && (
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>تاريخ الميلاد:</span>
              <strong>{format(new Date(student.birth_date), 'd MMMM yyyy', { locale: ar })}</strong>
            </div>
          )}
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>السنوات الدراسية</p>
              <p className="text-xl font-bold">{history.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مجموع الدرجات</p>
              <p className="text-xl font-bold">{totalGrades}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              <Wallet size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>المدفوع</p>
              <p className="text-sm font-bold text-amber-600 truncate">{fmt(totalPaid)} د.ع</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الترحيلات</p>
              <p className="text-xl font-bold text-purple-500">{promotions?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* الخط الزمني */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          📅 الخط الزمني الأكاديمي
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-10">
            <Calendar size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا يوجد سجل أكاديمي بعد</p>
            {hasPermission('students.edit') && (
              <button onClick={openAdd} className="btn-primary mt-4">
                <Plus size={18} />
                إضافة السنة الأولى
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* خط عمودي */}
            <div className="absolute top-0 bottom-0 end-6 w-0.5"
                 style={{ background: 'var(--border-color)' }} />

            <div className="space-y-4">
              {history.map((h) => {
                const status = statusLabels[h.status] || statusLabels.enrolled
                const result = h.result ? resultLabels[h.result] : null
                const yearGrades = gradesByYear[h.academic_year] || []
                const yearPayments = paymentsByYear[h.academic_year?.substring(0, 4)] || []

                return (
                  <div key={h.id} className="relative pe-14">
                    {/* نقطة الخط الزمني */}
                    <div className="absolute top-4 end-4 w-5 h-5 rounded-full border-4 flex items-center justify-center"
                         style={{
                           background: 'var(--bg-card)',
                           borderColor: status.color,
                         }} />

                    <div className="p-4 rounded-xl border-2"
                         style={{
                           borderColor: 'var(--border-color)',
                           background: 'var(--bg-card)',
                         }}>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{h.academic_year}</span>
                          <span className="badge" style={{ background: `${status.color}20`, color: status.color }}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {hasPermission('students.edit') && (
                            <>
                              <button onClick={() => openEdit(h)}
                                      className="btn-ghost !p-1.5 text-blue-500"
                                      title="تعديل">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleDelete(h)}
                                      className="btn-ghost !p-1.5 text-red-500"
                                      title="حذف">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>الصف:</span>
                          <strong className="ms-1">{h.grade} {h.section && `- ${h.section}`}</strong>
                        </div>
                        {h.final_average != null && (
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>المعدل:</span>
                            <strong className="ms-1 text-emerald-600">{h.final_average.toFixed(2)}%</strong>
                          </div>
                        )}
                        {result && (
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>النتيجة:</span>
                            <strong className="ms-1" style={{ color: result.color }}>
                              {result.icon} {result.label}
                            </strong>
                          </div>
                        )}
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>الدرجات:</span>
                          <strong className="ms-1">{yearGrades.length}</strong>
                        </div>
                      </div>

                      {yearPayments.length > 0 && (
                        <div className="mt-3 pt-3 border-t text-xs"
                             style={{ borderColor: 'var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>💰 المدفوعات: </span>
                          <strong className="text-emerald-600">
                            {fmt(yearPayments.reduce((s, p) => s + (p.paid_amount || 0), 0))} د.ع
                          </strong>
                          <span className="ms-2" style={{ color: 'var(--text-secondary)' }}>
                            ({yearPayments.length} دفعة)
                          </span>
                        </div>
                      )}

                      {h.notes && (
                        <div className="mt-2 p-2 rounded text-xs"
                             style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--text-secondary)' }}>
                          📝 {h.notes}
                        </div>
                      )}

                      {h.left_at && (
                        <div className="mt-2 text-xs text-red-600">
                          ❌ انقطع بتاريخ: <strong>{h.left_at}</strong>
                          {h.left_reason && ` — السبب: ${h.left_reason}`}
                        </div>
                      )}

                      {h.returned_at && (
                        <div className="mt-1 text-xs text-blue-600">
                          🔄 عاد بتاريخ: <strong>{h.returned_at}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingEntry ? 'تعديل السنة الدراسية' : 'إضافة سنة دراسية'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">السنة الدراسية *</label>
                  <input type="text"
                         value={form.academic_year}
                         onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                         className="input-modern"
                         placeholder="2025-2026"
                         required />
                </div>

                                <div>
                  <label className="text-sm font-medium block mb-1.5">الصف *</label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="input-modern"
                    required
                  >
                    <option value="">اختر الصف...</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                                <div>
                  <label className="text-sm font-medium block mb-1.5">الشعبة</label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="input-modern"
                  >
                    <option value="">—</option>
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">الحالة</label>
                  <select value={form.status}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          className="input-modern">
                    <option value="enrolled">📗 مسجّل</option>
                    <option value="left">📕 منقطع</option>
                    <option value="returned">📘 عاد</option>
                    <option value="graduated">🎓 متخرج</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ الانتساب</label>
                  <input type="date"
                         value={form.enrolled_at}
                         onChange={(e) => setForm({ ...form, enrolled_at: e.target.value })}
                         className="input-modern" />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ الانفصال</label>
                  <input type="date"
                         value={form.left_at}
                         onChange={(e) => setForm({ ...form, left_at: e.target.value })}
                         className="input-modern" />
                </div>

                {form.left_at && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1.5">سبب الانفصال</label>
                    <input type="text"
                           value={form.left_reason}
                           onChange={(e) => setForm({ ...form, left_reason: e.target.value })}
                           className="input-modern"
                           placeholder="انتقال، ظروف..." />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ العودة</label>
                  <input type="date"
                         value={form.returned_at}
                         onChange={(e) => setForm({ ...form, returned_at: e.target.value })}
                         className="input-modern" />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">المعدل النهائي (%)</label>
                  <input type="number"
                         value={form.final_average}
                         onChange={(e) => setForm({ ...form, final_average: e.target.value })}
                         className="input-modern"
                         min="0" max="100" step="0.01" />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">النتيجة</label>
                  <select value={form.result}
                          onChange={(e) => setForm({ ...form, result: e.target.value })}
                          className="input-modern">
                    <option value="">—</option>
                    <option value="passed">✅ ناجح</option>
                    <option value="failed">❌ راسب</option>
                    <option value="repeating">🔁 معيد</option>
                    <option value="graduated">🎓 متخرج</option>
                  </select>
                </div>

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
                  {editingEntry ? 'حفظ التعديلات' : 'إضافة'}
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