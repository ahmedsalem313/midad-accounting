import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, GraduationCap, AlertCircle,
  Users, Save, Trash, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType,
  getSubjectsForGrade, getMaxScore, getSubjectByCode,
  EXAM_TYPES, SEMESTERS, getSuggestedTemplate,
} from '../utils/schoolData'
import StudentReport from './StudentReport'

// ============================================
// مكوّن إدخال مادة (بسيطة أو مركبة)
// ============================================
function SubjectEntry({ subjectCode, grade, value, onChange }) {
  const subject = getSubjectByCode(subjectCode)
  const maxScore = getMaxScore(grade)
  const isComposite = value?.is_composite || false
  const items = value?.items || []
  const simpleScore = value?.score ?? ''
  const simpleMax = value?.max_score ?? maxScore

  const suggested = getSuggestedTemplate(grade, subjectCode)
  const hasSuggestion = !!suggested

  // تبديل بين بسيطة/مركبة
  const switchToSimple = () => {
    onChange({ is_composite: false, score: 0, max_score: maxScore, items: [] })
  }

  const switchToComposite = () => {
    const defaultItems = suggested?.items?.map(it => ({ ...it, score: 0 })) || [
      { name: 'الفرع الأول', max_score: 100, score: 0 }
    ]
    onChange({ is_composite: true, score: 0, max_score: 100, items: defaultItems })
  }

  const addItem = () => {
    const newItem = { name: '', max_score: 0, score: 0 }
    const newItems = [...items, newItem]
    onChange({ ...value, items: newItems })
  }

  const updateItem = (index, field, val) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: val }
    onChange({ ...value, items: newItems })
  }

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange({ ...value, items: newItems })
  }

  // حساب المجاميع
  const totalScore = items.reduce((s, it) => s + (parseFloat(it.score) || 0), 0)
  const totalMax = items.reduce((s, it) => s + (parseFloat(it.max_score) || 0), 0)
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

  return (
    <div className="space-y-3">
      {/* رأس المادة */}
      <div className="flex items-center justify-between p-3 rounded-xl"
           style={{ background: 'rgba(99,102,241,0.08)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{subject?.icon}</span>
          <div>
            <p className="font-bold">{subject?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              الدرجة العظمى الأساسية: {maxScore}
            </p>
          </div>
        </div>
      </div>

      {/* اختيار نوع الإدخال */}
      <div className="flex gap-2 p-1 rounded-xl border-2" style={{ borderColor: 'var(--border-color)' }}>
        <button
          type="button"
          onClick={switchToSimple}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: !isComposite ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
            color: !isComposite ? 'white' : 'var(--text-secondary)',
          }}
        >
          📊 درجة واحدة
        </button>
        <button
          type="button"
          onClick={switchToComposite}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: isComposite ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
            color: isComposite ? 'white' : 'var(--text-secondary)',
          }}
        >
          📚 درجات مقسمة
        </button>
      </div>

      {/* الإدخال البسيط */}
      {!isComposite && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1.5">الدرجة</label>
            <input
              type="number"
              value={simpleScore}
              onChange={(e) => onChange({ ...value, score: parseFloat(e.target.value) || 0 })}
              className="input-modern"
              min="0"
              max={simpleMax}
              step="any"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">الدرجة العظمى</label>
            <input
              type="number"
              value={simpleMax}
              onChange={(e) => onChange({ ...value, max_score: parseFloat(e.target.value) || 100 })}
              className="input-modern"
              min="1"
            />
          </div>
        </div>
      )}

      {/* الإدخال المركب */}
      {isComposite && (
        <div className="space-y-2">
          {/* اقتراح قالب */}
          {hasSuggestion && items.length === 0 && (
            <div className="p-3 rounded-xl border-2 border-dashed"
                 style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
              <p className="text-xs mb-2">💡 قالب مقترح: <strong>{suggested.name}</strong></p>
              <button
                type="button"
                onClick={() => onChange({
                  is_composite: true,
                  score: 0,
                  max_score: 100,
                  items: suggested.items.map(it => ({ ...it, score: 0 })),
                })}
                className="btn-primary !py-1.5 !text-xs"
              >
                استخدم القالب
              </button>
            </div>
          )}

          {/* جدول الفروع */}
          <div className="border-2 rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <th className="p-2 text-start text-xs">الفرع</th>
                  <th className="p-2 text-start text-xs w-24">الدرجة</th>
                  <th className="p-2 text-start text-xs w-24">من</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-1">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                        placeholder="اسم الفرع"
                        className="input-modern !py-1.5 !text-sm"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={it.score}
                        onChange={(e) => updateItem(i, 'score', parseFloat(e.target.value) || 0)}
                        className="input-modern !py-1.5 !text-sm"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={it.max_score}
                        onChange={(e) => updateItem(i, 'max_score', parseFloat(e.target.value) || 0)}
                        className="input-modern !py-1.5 !text-sm"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="btn-ghost !p-1.5 text-red-500"
                        title="حذف"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(16,185,129,0.08)', borderTop: '2px solid #10B981' }}>
                  <td className="p-2 font-bold text-sm">المجموع</td>
                  <td className="p-2 font-bold text-emerald-600">{totalScore}</td>
                  <td className="p-2 font-bold">{totalMax}</td>
                  <td className="p-2 text-center font-bold text-xs"
                      style={{ color: percentage >= 50 ? '#10B981' : '#EF4444' }}>
                    {percentage}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="btn-ghost w-full !py-2 border-2 border-dashed flex items-center justify-center gap-2"
            style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#6366F1' }}
          >
            <Plus size={16} />
            إضافة فرع
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// المكوّن الرئيسي
// ============================================
export default function Grades() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [grades, setGrades] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSection, setFilterSection] = useState('')
 const [showModal, setShowModal] = useState(false)
const [editingGrade, setEditingGrade] = useState(null)
const [reportStudentId, setReportStudentId] = useState(null)

  function getEmptyForm() {
    const initialGrade = GRADES[0]
    const subjects = getSubjectsForGrade(initialGrade)
    return {
      student_id: '',
      student_grade: initialGrade,
      subject: subjects[0]?.code || '',
      exam_type: 'monthly_1',
      exam_date: new Date().toISOString().split('T')[0],
      semester: 'first',
      academic_year: '2026-2027',
      notes: '',
      subjectValue: {
        is_composite: false,
        score: 0,
        max_score: getMaxScore(initialGrade),
        items: [],
      },
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  const formSubjects = getSubjectsForGrade(formData.student_grade)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
  try {
    setLoading(true)
    const [gradesRes, studentsRes] = await Promise.all([
      api.get('/grades'),
      api.get('/students'),
    ])

    // فلترة الطلاب حسب نوع المدرسة
    const currentGrades = getGradesByType(schoolType)
    const filteredStudents = studentsRes.data.data.filter(
      (s) => currentGrades.includes(s.grade)
    )
    const studentIds = new Set(filteredStudents.map((s) => s.id))

    // فلترة الدرجات حسب طلاب المدرسة الحالية
    const filteredGrades = gradesRes.data.data.filter(
      (g) => studentIds.has(g.student_id)
    )

    setStudents(filteredStudents)
    setGrades(filteredGrades)
  } catch (e) {
    toast.error('فشل تحميل البيانات')
  } finally {
    setLoading(false)
  }
}
const checkStudentBlock = async (studentId) => {
  try {
    const res = await api.get(`/students/${studentId}/check-block`)
    return res.data.data
  } catch (e) {
    return { isBlocked: false }
  }
}
  // عند تغيير الصف
  useEffect(() => {
    if (showModal && !editingGrade) {
      const newSubjects = getSubjectsForGrade(formData.student_grade)
      const newMax = getMaxScore(formData.student_grade)
      setFormData((prev) => ({
        ...prev,
        subject: newSubjects[0]?.code || '',
        subjectValue: {
          is_composite: false,
          score: 0,
          max_score: newMax,
          items: [],
        },
      }))
    }
  }, [formData.student_grade, showModal, editingGrade])

  // عند تغيير الطالب
  useEffect(() => {
    if (showModal && formData.student_id && !editingGrade) {
      const student = students.find((s) => s.id === parseInt(formData.student_id))
      if (student && student.grade !== formData.student_grade) {
        setFormData((prev) => ({ ...prev, student_grade: student.grade }))
      }
    }
  }, [formData.student_id])

  // عند تغيير المادة → إعادة ضبط subjectValue
  useEffect(() => {
    if (showModal && !editingGrade) {
      const newMax = getMaxScore(formData.student_grade)
      setFormData((prev) => ({
        ...prev,
        subjectValue: {
          is_composite: false,
          score: 0,
          max_score: newMax,
          items: [],
        },
      }))
    }
  }, [formData.subject])

  const filteredGrades = grades.filter((g) => {
    if (filterGrade && g.student_grade !== filterGrade) return false
    if (filterSection && g.section !== filterSection) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      g.student_name?.toLowerCase().includes(q) ||
      getSubjectByCode(g.subject)?.name?.toLowerCase().includes(q)
    )
  })

  const openAddModal = () => {
    setEditingGrade(null)
    setFormData(getEmptyForm())
    setShowModal(true)
  }

  const openEditModal = (grade) => {
    setEditingGrade(grade)
    setFormData({
      student_id: grade.student_id,
      student_grade: grade.student_grade,
      subject: grade.subject,
      exam_type: grade.exam_type,
      exam_date: grade.exam_date || '',
      semester: grade.semester || 'first',
      academic_year: grade.academic_year || '2026-2027',
      notes: grade.notes || '',
      subjectValue: {
        is_composite: grade.is_composite === 1,
        score: grade.score,
        max_score: grade.max_score,
        items: grade.components?.items || [],
      },
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.student_id || !formData.subject) {
      toast.error('يرجى اختيار الطالب والمادة')
      return
    }

    const sv = formData.subjectValue

    // التحقق
    if (sv.is_composite) {
      if (sv.items.length === 0) {
        toast.error('يرجى إضافة فرع واحد على الأقل')
        return
      }
      if (sv.items.some(it => !it.name.trim())) {
        toast.error('يرجى تسمية جميع الفروع')
        return
      }
      if (sv.items.some(it => !it.max_score || it.max_score <= 0)) {
        toast.error('الدرجة العظمى لكل فرع مطلوبة')
        return
      }
    } else {
      if (sv.score === '' || sv.score === undefined) {
        toast.error('يرجى إدخال الدرجة')
        return
      }
    }

    // تجهيز البيانات
    let payload = {
      student_id: formData.student_id,
      subject: formData.subject,
      exam_type: formData.exam_type,
      exam_date: formData.exam_date,
      semester: formData.semester,
      academic_year: formData.academic_year,
      notes: formData.notes,
      is_composite: sv.is_composite ? 1 : 0,
    }

    if (sv.is_composite) {
      const totalScore = sv.items.reduce((s, it) => s + (parseFloat(it.score) || 0), 0)
      const totalMax = sv.items.reduce((s, it) => s + (parseFloat(it.max_score) || 0), 0)
      payload.score = totalScore
      payload.max_score = totalMax
      payload.components = { items: sv.items }
    } else {
      payload.score = sv.score
      payload.max_score = sv.max_score
      payload.components = null
    }

    try {
      if (editingGrade) {
        await api.put(`/grades/${editingGrade.id}`, payload)
        toast.success('تم التحديث')
      } else {
        await api.post('/grades', payload)
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleDelete = async (grade) => {
    if (!confirm(`حذف درجة ${grade.student_name}؟`)) return
    try {
      await api.delete(`/grades/${grade.id}`)
      toast.success('تم الحذف')
      fetchAll()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const getScoreColor = (score, max) => {
    const p = (score / max) * 100
    if (p >= 90) return '#10B981'
    if (p >= 75) return '#3B82F6'
    if (p >= 50) return '#F59E0B'
    return '#EF4444'
  }

  const getScoreBadge = (score, max) => {
    const p = Math.round((score / max) * 100)
    const color = getScoreColor(score, max)
    return (
      <span className="badge" style={{ background: `${color}20`, color, fontWeight: 'bold' }}>
        {score}/{max} ({p}%)
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="text-primary-500" size={26} />
            الدرجات والنتائج
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {schoolType === 'primary' ? '🎒 مدرسة ابتدائية' : '📚 مدرسة ثانوية'} —
            إجمالي: {grades.length} درجة
          </p>
        </div>

        {hasPermission('grades.create') && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة درجة
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="🔍 ابحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern ps-10"
          />
        </div>

        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
                className="input-modern !w-auto min-w-[160px]">
          <option value="">كل الصفوف</option>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)}
                className="input-modern !w-auto min-w-[120px]">
          <option value="">كل الشعب</option>
          {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
        </select>

        <div className="text-xs px-3 py-2 rounded-lg font-semibold"
             style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
          {filteredGrades.length} نتيجة
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredGrades.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد درجات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-start">المادة</th>
                  <th className="p-3 text-start">الامتحان</th>
                  <th className="p-3 text-start">الدرجة</th>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map((g) => {
                  const subject = getSubjectByCode(g.subject)
                  const exam = EXAM_TYPES.find((e) => e.value === g.exam_type)
                  return (
                    <tr key={g.id}
                        className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 font-semibold">{g.student_name}</td>
                      <td className="p-3 text-xs">{g.student_grade} {g.section && `- ${g.section}`}</td>
                      <td className="p-3">
                        <span className="badge-info">
                          {subject?.icon} {subject?.name}
                          {g.is_composite === 1 && <span className="text-xs ms-1">📚</span>}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{exam?.label}</td>
                      <td className="p-3">{getScoreBadge(g.score, g.max_score)}</td>
                      <td className="p-3 text-xs" dir="ltr">{g.exam_date}</td>
                     <td className="p-3">
  <div className="flex justify-center gap-1">
    <button
  onClick={async () => {
    const block = await checkStudentBlock(g.student_id)
    if (block.isBlocked) {
      // إذا الحجب بسبب الغياب
      if (block.absenceBlock) {
        toast.error(
          `🚫 محجوب بسبب الغياب\n${block.absenceLabel} (${block.absenceTotal} يوم)`,
          { duration: 6000 }
        )
      } else {
        toast.error(`🚫 محجوب: ${block.reason}`, { duration: 5000 })
      }
      return
    }
    setReportStudentId(g.student_id)
  }}
  className="btn-ghost !p-2 text-emerald-500 hover:text-emerald-700"
  title="كشف الدرجات"
>
  <Eye size={16} />
</button>
    {hasPermission('grades.edit') && (
      <button onClick={() => openEditModal(g)}
              className="btn-ghost !p-2 text-blue-500 hover:text-blue-700">
        <Edit size={16} />
      </button>
    )}
    {hasPermission('grades.delete') && (
      <button onClick={() => handleDelete(g)}
              className="btn-ghost !p-2 text-red-500 hover:text-red-700">
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

      {/* Modal: Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingGrade ? 'تعديل الدرجة' : 'إضافة درجة'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 hover:bg-red-500/10 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* الطالب */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">
                    الطالب <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="input-modern"
                    required
                    disabled={!!editingGrade}
                  >
                    <option value="">اختر الطالب...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} — {s.grade} {s.section && `- ${s.section}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* المادة + الامتحان */}
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
                    {formSubjects.map((s) => (
                      <option key={s.code} value={s.code}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    نوع الامتحان <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.exam_type}
                    onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                    className="input-modern"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* إدخال الدرجة (بسيط/مركب) */}
                <div className="md:col-span-2">
                  <SubjectEntry
                    subjectCode={formData.subject}
                    grade={formData.student_grade}
                    value={formData.subjectValue}
                    onChange={(val) => setFormData({ ...formData, subjectValue: val })}
                  />
                </div>

                {/* تاريخ + فصل */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ الامتحان</label>
                  <input
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="input-modern"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">الفصل الدراسي</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="input-modern"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-modern"
                    rows="2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1">
                  {editingGrade ? 'حفظ التعديلات' : 'إضافة الدرجة'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          {/* تقرير الطالب */}
      {reportStudentId && (
        <StudentReport
          studentId={reportStudentId}
          onClose={() => setReportStudentId(null)}
        />
      )}
    </div>
  )
}