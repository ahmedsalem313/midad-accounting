import { useState, useEffect } from 'react'
import {
  BookOpen, Plus, Edit, Trash2, X, Save, Users, AlertCircle, UserPlus
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType,
  getSubjectsForGrade,
} from '../utils/schoolData'

export default function TimetableSubjects() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterGrade, setFilterGrade] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)

  function getEmptyForm() {
    return {
      grade: GRADES[0],
      section: SECTIONS[0],
      subject_code: '',
      subject_name: '',
      weekly_lessons: 1,
      academic_year: '2025-2026',
      notes: '',
      teachers: [],
    }
  }

  const [form, setForm] = useState(getEmptyForm())

  useEffect(() => {
    fetchData()
  }, [filterGrade])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [subjRes, teachersRes] = await Promise.all([
        api.get('/timetable-subjects', { params: { grade: filterGrade || undefined } }),
        api.get('/timetable-subjects/meta/teachers'),
      ])
      setSubjects(subjRes.data.data)
      setTeachers(teachersRes.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingSubject(null)
    setForm(getEmptyForm())
    setShowModal(true)
  }

  const openEdit = (subject) => {
    setEditingSubject(subject)
    setForm({
      grade: subject.grade,
      section: subject.section || '',
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      weekly_lessons: subject.weekly_lessons,
      academic_year: subject.academic_year || '2025-2026',
      notes: subject.notes || '',
      teachers: subject.teachers.map((t) => ({
        teacher_id: t.teacher_id,
        lessons_count: t.lessons_count,
      })),
    })
    setShowModal(true)
  }

  const availableSubjects = getSubjectsForGrade(form.grade)

  const pickSubject = (code) => {
    const subject = availableSubjects.find((s) => s.code === code)
    if (subject) {
      setForm({
        ...form,
        subject_code: subject.code,
        subject_name: subject.name,
      })
    }
  }

  const addTeacher = () => {
    setForm({
      ...form,
      teachers: [...form.teachers, { teacher_id: '', lessons_count: 0 }],
    })
  }

  const updateTeacher = (idx, field, value) => {
    const list = [...form.teachers]
    list[idx] = { ...list[idx], [field]: value }
    setForm({ ...form, teachers: list })
  }

  const removeTeacher = (idx) => {
    setForm({
      ...form,
      teachers: form.teachers.filter((_, i) => i !== idx),
    })
  }

  const totalTeacherLessons = form.teachers.reduce(
    (s, t) => s + (parseInt(t.lessons_count) || 0),
    0
  )
  const mismatch = totalTeacherLessons !== parseInt(form.weekly_lessons)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.subject_code || !form.subject_name || !form.weekly_lessons) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }
    if (form.teachers.length === 0) {
      toast.error('أضف معلمًا واحدًا على الأقل')
      return
    }
    if (form.teachers.some((t) => !t.teacher_id)) {
      toast.error('اختر معلمًا لكل سطر')
      return
    }
    if (mismatch) {
      toast.error(`مجموع حصص المعلمين (${totalTeacherLessons}) ≠ الحصص الأسبوعية (${form.weekly_lessons})`)
      return
    }

    try {
      const payload = {
        ...form,
        teachers: form.teachers.map((t) => ({
          teacher_id: parseInt(t.teacher_id),
          lessons_count: parseInt(t.lessons_count) || 0,
        })),
      }

      if (editingSubject) {
        await api.put(`/timetable-subjects/${editingSubject.id}`, payload)
        toast.success('تم التحديث')
      } else {
        await api.post('/timetable-subjects', payload)
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDelete = async (subject) => {
    if (!confirm(`حذف مادة "${subject.subject_name}"؟`)) return
    try {
      await api.delete(`/timetable-subjects/${subject.id}`)
      toast.success('تم الحذف')
      fetchData()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="text-primary-500" size={26} />
            المواد الدراسية
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إدخال المواد وعدد حصصها الأسبوعية + المعلمون
          </p>
        </div>

        {hasPermission('timetable.edit') && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة مادة
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium">تصفية حسب الصف:</span>
        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="input-modern !w-auto min-w-[200px]"
        >
          <option value="">كل الصفوف</option>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <div className="text-xs px-3 py-2 rounded-lg font-semibold ms-auto"
             style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
          {subjects.length} مادة
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }} className="mb-3">
              لا توجد مواد مُدخلة بعد
            </p>
            {hasPermission('timetable.edit') && (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} />
                إضافة أول مادة
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-start">الشعبة</th>
                  <th className="p-3 text-start">المادة</th>
                  <th className="p-3 text-start">الحصص/أسبوع</th>
                  <th className="p-3 text-start">المعلمون</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                      style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-3 font-semibold">{s.grade}</td>
                    <td className="p-3">{s.section || '—'}</td>
                    <td className="p-3 font-medium">{s.subject_name}</td>
                    <td className="p-3">
                      <span className="badge-info">{s.weekly_lessons} حصة</span>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {s.teachers.map((t) => (
                          <div key={t.id} className="text-xs flex items-center gap-1">
                            <Users size={11} style={{ color: 'var(--text-secondary)' }} />
                            <span>{t.teacher_name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                              {t.lessons_count} حصة
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        {hasPermission('timetable.edit') && (
                          <>
                            <button onClick={() => openEdit(s)}
                                    className="btn-ghost !p-2 text-blue-500"
                                    title="تعديل">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(s)}
                                    className="btn-ghost !p-2 text-red-500"
                                    title="حذف">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">الصف *</label>
                  <select value={form.grade}
                          onChange={(e) => setForm({ ...form, grade: e.target.value, subject_code: '', subject_name: '' })}
                          className="input-modern" required>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">الشعبة</label>
                  <select value={form.section}
                          onChange={(e) => setForm({ ...form, section: e.target.value })}
                          className="input-modern">
                    <option value="">كل الشعب</option>
                    {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">المادة *</label>
                  <select value={form.subject_code}
                          onChange={(e) => pickSubject(e.target.value)}
                          className="input-modern" required>
                    <option value="">اختر المادة...</option>
                    {availableSubjects.map((s) => (
                      <option key={s.code} value={s.code}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                  {form.subject_name && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      الكود: {form.subject_code}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">عدد الحصص الأسبوعية *</label>
                  <input type="number" min="1" max="40"
                         value={form.weekly_lessons}
                         onChange={(e) => setForm({ ...form, weekly_lessons: parseInt(e.target.value) || 1 })}
                         className="input-modern" required />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">السنة الدراسية</label>
                  <input type="text"
                         value={form.academic_year}
                         onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                         className="input-modern" />
                </div>
              </div>

              {/* المعلمون */}
              <div className="p-4 rounded-xl border-2" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Users size={16} /> المعلمون
                  </h4>
                  <button type="button" onClick={addTeacher}
                          className="btn-ghost !py-1 !px-3 !text-xs flex items-center gap-1">
                    <UserPlus size={14} /> إضافة معلم
                  </button>
                </div>

                {form.teachers.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: 'var(--text-secondary)' }}>
                    أضف معلمًا واحدًا على الأقل
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.teachers.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select value={t.teacher_id}
                                onChange={(e) => updateTeacher(i, 'teacher_id', e.target.value)}
                                className="input-modern flex-1" required>
                          <option value="">اختر المعلم...</option>
                          {teachers.map((tt) => (
                            <option key={tt.id} value={tt.id}>{tt.full_name}</option>
                          ))}
                        </select>
                        <input type="number" min="0" max="40"
                               value={t.lessons_count}
                               onChange={(e) => updateTeacher(i, 'lessons_count', e.target.value)}
                               className="input-modern !w-24"
                               placeholder="حصص" />
                        <button type="button" onClick={() => removeTeacher(i)}
                                className="btn-ghost !p-2 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    <div className="flex justify-between items-center p-2 rounded-lg text-xs font-bold"
                         style={{
                           background: mismatch ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                           color: mismatch ? '#DC2626' : '#059669',
                         }}>
                      <span>مجموع حصص المعلمين:</span>
                      <span>{totalTeacherLessons} / {form.weekly_lessons}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                <textarea value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          className="input-modern" rows="2" />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2"
                        disabled={mismatch && form.teachers.length > 0}>
                  <Save size={18} />
                  {editingSubject ? 'حفظ التعديلات' : 'إضافة المادة'}
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