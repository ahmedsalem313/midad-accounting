import { useState, useEffect } from 'react'
import {
  Award, Search, Plus, Trash2, X, Save, User, Calendar,
  AlertCircle, Users, TrendingUp, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getGradesByType, SECTIONS, getCurrentSchoolType } from '../utils/schoolData'

// ============================================
// خيارات التقييم
// ============================================
const RATINGS = [
  { value: 'excellent',  label: 'ممتاز',           icon: '🌟', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  { value: 'good',       label: 'جيد',              icon: '👍', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  { value: 'acceptable', label: 'مقبول',            icon: '👌', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { value: 'poor',       label: 'يحتاج تحسين',      icon: '⚠️', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
]

export default function Behavior() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [selectedGrade, setSelectedGrade] = useState(GRADES[0])
  const [selectedSection, setSelectedSection] = useState(SECTIONS[0])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentEvals, setStudentEvals] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // نموذج التقييم
  const [formData, setFormData] = useState({
    rating: 'good',
    note: '',
  })

  // ============================================
  // جلب الطلاب مع آخر تقييم
  // ============================================
  useEffect(() => {
    fetchStudents()
  }, [selectedGrade, selectedSection])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await api.get('/behavior/class', {
        params: { grade: selectedGrade, section: selectedSection },
      })
      setStudents(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentEvals = async (studentId) => {
    try {
      const res = await api.get(`/behavior/student/${studentId}`)
      setStudentEvals(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التقييمات')
    }
  }

  const openStudent = (student) => {
    setSelectedStudent(student)
    fetchStudentEvals(student.student_id)
  }

  // ============================================
  // إضافة تقييم
  // ============================================
  const handleAddEvaluation = async (e) => {
    e.preventDefault()

    if (!formData.rating) {
      toast.error('اختر تقييماً')
      return
    }

    try {
      await api.post('/behavior', {
        student_id: selectedStudent.student_id,
        rating: formData.rating,
        note: formData.note,
      })
      toast.success('تم حفظ التقييم')
      setShowAddModal(false)
      setFormData({ rating: 'good', note: '' })
      fetchStudentEvals(selectedStudent.student_id)
      fetchStudents()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDeleteEvaluation = async (evalId) => {
    if (!confirm('حذف هذا التقييم؟')) return
    try {
      await api.delete(`/behavior/${evalId}`)
      toast.success('تم الحذف')
      fetchStudentEvals(selectedStudent.student_id)
      fetchStudents()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const getRatingInfo = (rating) => RATINGS.find(r => r.value === rating) || RATINGS[1]

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.student_code?.toLowerCase().includes(q)
    )
  })

  // إحصائيات الصف
  const classStats = {
    excellent: students.filter(s => s.latest_rating === 'excellent').length,
    good: students.filter(s => s.latest_rating === 'good').length,
    acceptable: students.filter(s => s.latest_rating === 'acceptable').length,
    poor: students.filter(s => s.latest_rating === 'poor').length,
    noEval: students.filter(s => !s.latest_rating).length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="text-primary-500" size={26} />
            تقييم السلوك
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            تقييم سلوك الطلاب ومتابعة سجلهم
          </p>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium">الصف:</label>
        <select value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="input-modern !w-auto min-w-[160px]">
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <label className="text-sm font-medium">الشعبة:</label>
        <select value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="input-modern !w-auto min-w-[100px]">
          {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث بالاسم أو الرقم الأكاديمي..."
            className="input-modern ps-10"
          />
        </div>
      </div>

      {/* إحصائيات الصف */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-3 text-center">
          <span className="text-2xl">🌟</span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>ممتاز</p>
          <p className="text-lg font-bold text-emerald-600">{classStats.excellent}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-2xl">👍</span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>جيد</p>
          <p className="text-lg font-bold text-blue-500">{classStats.good}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-2xl">👌</span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>مقبول</p>
          <p className="text-lg font-bold text-amber-500">{classStats.acceptable}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-2xl">⚠️</span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>يحتاج تحسين</p>
          <p className="text-lg font-bold text-red-500">{classStats.poor}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-2xl">⏳</span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>لم يُقيَّم</p>
          <p className="text-lg font-bold text-slate-500">{classStats.noEval}</p>
        </div>
      </div>

      {/* قائمة الطلاب */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا يوجد طلاب</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الرقم الأكاديمي</th>
                  <th className="p-3 text-start">آخر تقييم</th>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-center">عدد التقييمات</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => {
                  const ratingInfo = s.latest_rating ? getRatingInfo(s.latest_rating) : null
                  return (
                    <tr key={s.student_id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3 font-semibold">{s.full_name}</td>
                      <td className="p-3 text-xs" dir="ltr">{s.student_code || '—'}</td>
                      <td className="p-3">
                        {ratingInfo ? (
                          <span className="badge" style={{ background: ratingInfo.bg, color: ratingInfo.color }}>
                            {ratingInfo.icon} {ratingInfo.label}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(148,163,184,0.15)', color: '#64748B' }}>
                            ⏳ لم يُقيَّم
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs" dir="ltr">
                        {s.latest_date ? new Date(s.latest_date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="p-3 text-center font-bold">{s.evaluations_count || 0}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openStudent(s)}
                          className="btn-ghost !py-1 !px-3 !text-xs"
                          style={{ color: '#6366F1' }}
                        >
                          <Award size={14} className="inline me-1" />
                          فتح
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة تفاصيل الطالب */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* الرأس */}
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                     style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  {selectedStudent.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedStudent.full_name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {selectedStudent.grade} {selectedStudent.section && `- شعبة ${selectedStudent.section}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {hasPermission('behavior.create') && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus size={16} />
                    تقييم جديد
                  </button>
                )}
                <button
                  onClick={() => { setSelectedStudent(null); setStudentEvals(null) }}
                  className="btn-ghost !p-2 text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* إحصائيات */}
            {studentEvals?.stats && (
              <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-xl" style={{ background: RATINGS[0].bg }}>
                    <p className="text-2xl">{RATINGS[0].icon}</p>
                    <p className="text-xs mt-1">ممتاز</p>
                    <p className="text-lg font-bold" style={{ color: RATINGS[0].color }}>
                      {studentEvals.stats.excellent}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl" style={{ background: RATINGS[1].bg }}>
                    <p className="text-2xl">{RATINGS[1].icon}</p>
                    <p className="text-xs mt-1">جيد</p>
                    <p className="text-lg font-bold" style={{ color: RATINGS[1].color }}>
                      {studentEvals.stats.good}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl" style={{ background: RATINGS[2].bg }}>
                    <p className="text-2xl">{RATINGS[2].icon}</p>
                    <p className="text-xs mt-1">مقبول</p>
                    <p className="text-lg font-bold" style={{ color: RATINGS[2].color }}>
                      {studentEvals.stats.acceptable}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl" style={{ background: RATINGS[3].bg }}>
                    <p className="text-2xl">{RATINGS[3].icon}</p>
                    <p className="text-xs mt-1">يحتاج تحسين</p>
                    <p className="text-lg font-bold" style={{ color: RATINGS[3].color }}>
                      {studentEvals.stats.poor}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* السجل */}
            <div className="p-5 overflow-y-auto flex-1">
              <h4 className="font-bold mb-3 text-sm">📋 سجل التقييمات</h4>
              {!studentEvals ? (
                <p className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
              ) : studentEvals.evaluations.length === 0 ? (
                <div className="text-center py-10">
                  <Award size={48} className="mx-auto mb-3 text-slate-400" />
                  <p style={{ color: 'var(--text-secondary)' }}>لا توجد تقييمات بعد</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentEvals.evaluations.map((e) => {
                    const info = getRatingInfo(e.rating)
                    return (
                      <div key={e.id} className="p-3 rounded-xl flex items-start gap-3"
                           style={{ background: info.bg }}>
                        <div className="text-2xl flex-shrink-0">{info.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold" style={{ color: info.color }}>
                              {info.label}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              بواسطة {e.evaluator_name || 'غير معروف'}
                            </span>
                          </div>
                          {e.note && (
                            <p className="text-sm mt-1">{e.note}</p>
                          )}
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                            {new Date(e.evaluated_at).toLocaleString('en-GB')}
                          </p>
                        </div>
                        {hasPermission('behavior.delete') && (
                          <button
                            onClick={() => handleDeleteEvaluation(e.id)}
                            className="btn-ghost !p-2 text-red-500 flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة التقييم الجديد */}
      {showAddModal && selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">تقييم جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost !p-2 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl flex items-center gap-3"
                 style={{ background: 'rgba(99,102,241,0.08)' }}>
              <User size={18} style={{ color: '#6366F1' }} />
              <div>
                <p className="font-bold text-sm">{selectedStudent.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedStudent.grade} {selectedStudent.section && `- ${selectedStudent.section}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddEvaluation} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">
                  التقييم <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: r.value })}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: formData.rating === r.value ? r.color : 'var(--border-color)',
                        background: formData.rating === r.value ? r.bg : 'var(--bg-card)',
                      }}
                    >
                      <div className="text-2xl mb-1">{r.icon}</div>
                      <div className="text-xs font-bold"
                           style={{ color: formData.rating === r.value ? r.color : 'var(--text-primary)' }}>
                        {r.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظة (اختياري)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="input-modern"
                  rows="3"
                  placeholder="مثال: طالب مجتهد ومتعاون..."
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  حفظ التقييم
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