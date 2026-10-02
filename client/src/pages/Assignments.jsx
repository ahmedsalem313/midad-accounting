import { useState, useEffect } from 'react'
import {
  BookOpen, Plus, Search, Edit, Trash2, X, Save, Eye,
  AlertCircle, CheckCircle, Clock, XCircle, FileText,
  Calendar, User, Users, Award, Phone, Download, Printer
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType, getSubjectByCode
} from '../utils/schoolData'

// ============================================
// حالات التسليم
// ============================================
const STATUSES = [
  { value: 'pending',        label: 'لم يُقيَّم',   icon: '⏳', color: '#64748B' },
  { value: 'submitted',      label: 'مُسلَّم',      icon: '✅', color: '#10B981' },
  { value: 'late',           label: 'مُتأخِّر',     icon: '⏰', color: '#F59E0B' },
  { value: 'not_submitted',  label: 'لم يُسلِّم',  icon: '❌', color: '#EF4444' },
]

export default function Assignments() {
  const { hasPermission, user } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const isAdmin = user?.role === 'admin'
  const isAdvisor = user?.is_advisor === 1 || user?.is_advisor === true
  const advisorGrade = user?.advisor_grade
  const advisorSection = user?.advisor_section

  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [subjects, setSubjects] = useState([])

  // نموذج إنشاء
  function getEmptyForm() {
    return {
      title: '',
      description: '',
      grade: isAdvisor && advisorGrade ? advisorGrade : GRADES[0],
      section: isAdvisor && advisorSection ? advisorSection : SECTIONS[0],
      subject: '',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      max_score: 100,
      academic_year: '2026-2027',
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  useEffect(() => {
    fetchAssignments()
    fetchSubjects()
  }, [])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const res = await api.get('/assignments')
      setAssignments(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل الواجبات')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/grades/meta/subjects')
      setSubjects(res.data.data)
    } catch (e) {
      console.error(e)
    }
  }

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/assignments/${id}`)
      setShowDetail(res.data.data)
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل تحميل التفاصيل')
    }
  }

  const openEdit = (assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      grade: assignment.grade,
      section: assignment.section || '',
      subject: assignment.subject,
      due_date: assignment.due_date,
      max_score: assignment.max_score,
      academic_year: assignment.academic_year || '2026-2027',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.subject || !formData.due_date) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }

    try {
      if (editingAssignment) {
        await api.put(`/assignments/${editingAssignment.id}`, formData)
        toast.success('تم التحديث')
      } else {
        const res = await api.post('/assignments', formData)
        toast.success(res.data.message || 'تم إنشاء الواجب')
      }
      setShowModal(false)
      setEditingAssignment(null)
      setFormData(getEmptyForm())
      fetchAssignments()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDelete = async (assignment) => {
    if (!confirm(`حذف واجب "${assignment.title}"؟`)) return
    try {
      await api.delete(`/assignments/${assignment.id}`)
      toast.success('تم الحذف')
      fetchAssignments()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const updateSubmission = async (assignmentId, studentId, status, score, notes) => {
    try {
      await api.post(`/assignments/${assignmentId}/submit/${studentId}`, {
        status, score, notes,
      })
      // تحديث محلي
      if (showDetail && showDetail.assignment.id === assignmentId) {
        openDetail(assignmentId)
      }
    } catch (e) {
      toast.error('فشل الحفظ')
    }
  }

  const saveAllSubmissions = async () => {
    if (!showDetail) return

    try {
      const students = showDetail.students.map(s => ({
        student_id: s.student_id,
        status: s.status || 'pending',
        score: s.score,
        notes: s.notes,
      }))

      await api.post(`/assignments/${showDetail.assignment.id}/bulk-submit`, { students })
      toast.success('تم حفظ كل الحالات')
      openDetail(showDetail.assignment.id)
    } catch (e) {
      toast.error('فشل الحفظ')
    }
  }

  const updateLocalStudent = (studentId, field, value) => {
    setShowDetail(prev => ({
      ...prev,
      students: prev.students.map(s =>
        s.student_id === studentId ? { ...s, [field]: value } : s
      ),
    }))
  }

  const markAllAs = (status) => {
    if (!showDetail) return
    setShowDetail(prev => ({
      ...prev,
      students: prev.students.map(s => ({ ...s, status })),
    }))
  }

  const filtered = assignments.filter((a) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      a.title?.toLowerCase().includes(q) ||
      a.subject?.toLowerCase().includes(q) ||
      a.teacher_name?.toLowerCase().includes(q)
    )
  })

  const getStatusInfo = (value) => STATUSES.find(s => s.value === value) || STATUSES[0]
  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="text-primary-500" size={26} />
            الواجبات
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'كل الواجبات' : isAdvisor ? `واجبات صفك: ${advisorGrade}` : 'واجباتي'}
          </p>
        </div>

        {hasPermission('assignments.create') && !isAdmin && (
  <button
    onClick={() => { setEditingAssignment(null); setFormData(getEmptyForm()); setShowModal(true) }}
    className="btn-primary flex items-center gap-2"
  >
    <Plus size={18} />
    إنشاء واجب
  </button>
)}
      </div>

      {/* بحث */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث بعنوان الواجب، المادة، المعلم..."
            className="input-modern ps-10"
          />
        </div>
        <div className="text-xs px-3 py-2 rounded-lg font-semibold"
             style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
          {filtered.length} واجب
        </div>
      </div>

      {/* قائمة الواجبات */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد واجبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">العنوان</th>
                  <th className="p-3 text-start">المادة</th>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-start">المعلم</th>
                  <th className="p-3 text-start">تاريخ التسليم</th>
                  <th className="p-3 text-center">التسليمات</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const subject = getSubjectByCode(a.subject)
                  const total = a.total_students || 0
                  const submitted = a.submitted_count || 0
                  const percent = total > 0 ? Math.round((submitted / total) * 100) : 0
                  const isPast = new Date(a.due_date) < new Date()

                  return (
                    <tr key={a.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 font-semibold">
                        <div>{a.title}</div>
                        {a.description && (
                          <div className="text-xs mt-0.5 truncate max-w-[200px]"
                               style={{ color: 'var(--text-secondary)' }}>
                            {a.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="badge-info">{subject?.icon} {subject?.name}</span>
                      </td>
                      <td className="p-3 text-xs">
                        {a.grade} {a.section && `- ${a.section}`}
                      </td>
                      <td className="p-3 text-xs">{a.teacher_name}</td>
                      <td className="p-3 text-xs">
                        <div className={isPast ? 'text-red-500 font-semibold' : ''} dir="ltr">
                          {a.due_date}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="h-2 w-16 rounded-full overflow-hidden"
                               style={{ background: 'var(--border-color)' }}>
                            <div className="h-full rounded-full"
                                 style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }} />
                          </div>
                          <span className="text-xs font-bold">
                            {submitted}/{total}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openDetail(a.id)}
                            className="btn-ghost !p-2 text-emerald-500"
                            title="عرض التفاصيل"
                          >
                            <Eye size={16} />
                          </button>
                          {hasPermission('assignments.edit') && (
                            <button
                              onClick={() => openEdit(a)}
                              className="btn-ghost !p-2 text-blue-500"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {hasPermission('assignments.delete') && (
                            <button
                              onClick={() => handleDelete(a)}
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

      {/* نافذة إنشاء/تعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingAssignment ? 'تعديل الواجب' : 'إنشاء واجب جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  عنوان الواجب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-modern"
                  placeholder="مثال: واجب الرياضيات - الفصل الأول"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-modern"
                  rows="3"
                  placeholder="تفاصيل الواجب..."
                />
              </div>

              {isAdmin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">الصف</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="input-modern"
                    >
                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">الشعبة</label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="input-modern"
                    >
                      {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    المادة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input-modern"
                    required
                  >
                    <option value="">اختر المادة...</option>
                    {subjects.map((s) => (
                      <option key={s.value} value={s.value}>{s.label_ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    تاريخ التسليم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">الدرجة العظمى</label>
                <input
                  type="number"
                  value={formData.max_score}
                  onChange={(e) => setFormData({ ...formData, max_score: parseFloat(e.target.value) || 100 })}
                  className="input-modern"
                  min="1"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingAssignment ? 'حفظ التعديلات' : 'إنشاء الواجب'}
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

      {/* نافذة التفاصيل */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* الرأس */}
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-bold">{showDetail.assignment.title}</h3>
                  {showDetail.assignment.description && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {showDetail.assignment.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    <span>📚 {getSubjectByCode(showDetail.assignment.subject)?.name}</span>
                    <span>🎓 {showDetail.assignment.grade} {showDetail.assignment.section && `- ${showDetail.assignment.section}`}</span>
                    <span>📅 {showDetail.assignment.due_date}</span>
                    <span>🎯 الدرجة من {showDetail.assignment.max_score}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetail(null)}
                  className="btn-ghost !p-2 text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* الإحصائيات + أدوات سريعة */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مُسلَّم</p>
                  <p className="text-lg font-bold text-emerald-600">{showDetail.stats.submitted}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مُتأخِّر</p>
                  <p className="text-lg font-bold text-amber-600">{showDetail.stats.late}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>لم يُسلِّم</p>
                  <p className="text-lg font-bold text-red-500">{showDetail.stats.not_submitted}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>لم يُقيَّم</p>
                  <p className="text-lg font-bold text-primary-600">{showDetail.stats.pending}</p>
                </div>
              </div>

              {hasPermission('assignments.grade') && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => markAllAs('submitted')}
                          className="btn-ghost !py-1.5 !px-3 !text-xs border-2"
                          style={{ borderColor: 'rgba(16,185,129,0.4)', color: '#10B981' }}>
                    ✅ الكل سلّم
                  </button>
                  <button onClick={() => markAllAs('not_submitted')}
                          className="btn-ghost !py-1.5 !px-3 !text-xs border-2"
                          style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#EF4444' }}>
                    ❌ الكل لم يسلّم
                  </button>
                  <button onClick={saveAllSubmissions}
                          className="btn-primary flex items-center gap-2 ms-auto">
                    <Save size={16} />
                    حفظ كل الحالات
                  </button>
                </div>
              )}
            </div>

            {/* الجدول */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--bg-card)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="p-3 text-start w-12">#</th>
                    <th className="p-3 text-start">الطالب</th>
                    <th className="p-3 text-start">الرقم الأكاديمي</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-start">الدرجة</th>
                    <th className="p-3 text-start">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.students.map((s, i) => {
                    const statusInfo = getStatusInfo(s.status)
                    return (
                      <tr key={s.student_id} className="border-b"
                          style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                        <td className="p-3 font-semibold">{s.full_name}</td>
                        <td className="p-3 text-xs" dir="ltr">{s.student_code || '—'}</td>
                        <td className="p-3">
                          <select
                            value={s.status || 'pending'}
                            onChange={(e) => updateLocalStudent(s.student_id, 'status', e.target.value)}
                            className="input-modern !py-1.5 !text-xs"
                            style={{
                              background: `${statusInfo.color}15`,
                              color: statusInfo.color,
                              fontWeight: 'bold',
                            }}
                          >
                            {STATUSES.map(st => (
                              <option key={st.value} value={st.value}>
                                {st.icon} {st.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={s.score ?? ''}
                            onChange={(e) => updateLocalStudent(s.student_id, 'score', parseFloat(e.target.value) || 0)}
                            className="input-modern !py-1.5 !text-xs w-20"
                            min="0"
                            max={showDetail.assignment.max_score}
                            placeholder="—"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={s.notes || ''}
                            onChange={(e) => updateLocalStudent(s.student_id, 'notes', e.target.value)}
                            className="input-modern !py-1.5 !text-xs"
                            placeholder="اختياري..."
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}