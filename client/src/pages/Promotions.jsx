import { useState, useEffect } from 'react'
import {
  GraduationCap, Users, TrendingUp, Award, CheckCircle,
  XCircle, ArrowLeft, AlertCircle, Save, RotateCcw, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, getCurrentSchoolType, SECTIONS,
} from '../utils/schoolData'

export default function Promotions() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [selectedGrade, setSelectedGrade] = useState('')
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear())
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [decisions, setDecisions] = useState({})
  const [search, setSearch] = useState('')

  function getCurrentAcademicYear() {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
  }

  useEffect(() => {
    if (selectedGrade) fetchPreview()
  }, [selectedGrade])

  const fetchPreview = async () => {
    if (!selectedGrade) return
    try {
      setLoading(true)
      const res = await api.get('/promotions/preview', {
        params: { from_grade: selectedGrade, academic_year: academicYear },
      })
      setPreview(res.data.data)

      // تهيئة القرارات من الاقتراحات
      const initialDecisions = {}
      for (const s of res.data.data.students) {
        initialDecisions[s.id] = {
          student_id: s.id,
          result: s.suggested_result,
          next_grade: s.suggested_next_grade,
          next_section: s.section || '',
          final_average: s.average,
        }
      }
      setDecisions(initialDecisions)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const updateDecision = (studentId, field, value) => {
    setDecisions((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }))
  }

  const resetToSuggestions = () => {
    if (!preview) return
    const initial = {}
    for (const s of preview.students) {
      initial[s.id] = {
        student_id: s.id,
        result: s.suggested_result,
        next_grade: s.suggested_next_grade,
        next_section: s.section || '',
        final_average: s.average,
      }
    }
    setDecisions(initial)
    toast.success('تمت إعادة الاقتراحات')
  }

  const handleApply = async () => {
    if (!preview) return
    if (preview.students.length === 0) {
      toast.error('لا يوجد طلاب')
      return
    }

    const passedCount = Object.values(decisions).filter((d) => d.result === 'passed').length
    const graduatedCount = Object.values(decisions).filter((d) => d.result === 'graduated').length
    const repeatingCount = Object.values(decisions).filter((d) => d.result === 'repeating').length

    if (!confirm(
      `هل أنت متأكد من تطبيق الترحيل؟\n\n` +
      `✅ ناجح (ينتقل): ${passedCount}\n` +
      `🎓 متخرج: ${graduatedCount}\n` +
      `🔁 معيد (يبقى): ${repeatingCount}\n\n` +
      `⚠️ لا يمكن التراجع عن هذه العملية`
    )) return

    try {
      setApplying(true)
      const res = await api.post('/promotions/apply', {
        academic_year: academicYear,
        decisions: Object.values(decisions),
      })
      toast.success(res.data.message)
      fetchPreview()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل التطبيق')
    } finally {
      setApplying(false)
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  const resultLabels = {
    passed: { label: 'ناجح', color: '#10B981', icon: '✅', bg: 'rgba(16,185,129,0.1)' },
    repeating: { label: 'معيد', color: '#F59E0B', icon: '🔁', bg: 'rgba(245,158,11,0.1)' },
    graduated: { label: 'متخرج', color: '#8B5CF6', icon: '🎓', bg: 'rgba(139,92,246,0.1)' },
  }

  // إحصائيات القرارات
  const stats = {
    total: Object.values(decisions).length,
    passed: Object.values(decisions).filter((d) => d.result === 'passed').length,
    repeating: Object.values(decisions).filter((d) => d.result === 'repeating').length,
    graduated: Object.values(decisions).filter((d) => d.result === 'graduated').length,
  }

  const filteredStudents = preview?.students.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.full_name?.toLowerCase().includes(q)
  }) || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="text-primary-500" size={26} />
            ترحيل الطلاب
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            نقل الطلاب الناجحين للصف التالي
          </p>
        </div>

        {preview && preview.students.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={resetToSuggestions} className="btn-ghost border-2 flex items-center gap-2"
                    style={{ borderColor: 'var(--border-color)' }}>
              <RotateCcw size={18} />
              إعادة الاقتراحات
            </button>
            {hasPermission('students.edit') && (
              <button onClick={handleApply} disabled={applying}
                      className="btn-primary flex items-center gap-2">
                <Save size={18} />
                {applying ? 'جاري التطبيق...' : 'تطبيق الترحيل'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* التحكم */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">الصف الحالي *</label>
            <select value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="input-modern">
              <option value="">اختر الصف...</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">السنة الدراسية الحالية</label>
            <input type="text"
                   value={academicYear}
                   onChange={(e) => setAcademicYear(e.target.value)}
                   className="input-modern"
                   placeholder="2025-2026" />
          </div>

          {preview?.stats && (
            <div className="p-3 rounded-xl flex items-center gap-3"
                 style={{ background: 'rgba(99,102,241,0.08)' }}>
              <ArrowLeft size={20} className="text-primary-500" />
              <div className="text-sm">
                <p style={{ color: 'var(--text-secondary)' }}>السنة القادمة</p>
                <strong>{preview.stats.next_year}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* لا يوجد صف محدد */}
      {!selectedGrade && (
        <div className="glass-card p-10 text-center">
          <GraduationCap size={48} className="mx-auto mb-3 text-slate-400" />
          <p style={{ color: 'var(--text-secondary)' }}>اختر الصف لبدء الترحيل</p>
        </div>
      )}

      {/* Loading */}
      {selectedGrade && loading && (
        <div className="glass-card p-10 text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}

      {/* لا يوجد طلاب */}
      {selectedGrade && !loading && preview?.students.length === 0 && (
        <div className="glass-card p-10 text-center">
          <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
          <p style={{ color: 'var(--text-secondary)' }}>لا يوجد طلاب نشطون في هذا الصف</p>
        </div>
      )}

      {/* المحتوى */}
      {selectedGrade && !loading && preview?.students.length > 0 && (
        <>
          {/* إحصائيات القرارات */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                  <Users size={20} />
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
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ناجح</p>
                  <p className="text-xl font-bold text-emerald-500">{stats.passed}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                  <RotateCcw size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>معيد</p>
                  <p className="text-xl font-bold text-amber-500">{stats.repeating}</p>
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
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>متخرج</p>
                  <p className="text-xl font-bold text-purple-500">{stats.graduated}</p>
                </div>
              </div>
            </div>
          </div>

          {/* البحث */}
          <div className="glass-card p-4 flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                      style={{ color: 'var(--text-secondary)' }} />
              <input type="text"
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder="🔍 بحث بالاسم..."
                     className="input-modern ps-10" />
            </div>
            <div className="text-xs px-3 py-2 rounded-lg font-semibold"
                 style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
              {filteredStudents.length} / {preview.students.length} طالب
            </div>
          </div>

          {/* الجدول */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="p-3 text-start">#</th>
                    <th className="p-3 text-start">اسم الطالب</th>
                    <th className="p-3 text-start">الشعبة</th>
                    <th className="p-3 text-center">المعدل</th>
                    <th className="p-3 text-center">عدد الدرجات</th>
                    <th className="p-3 text-start">النتيجة</th>
                    <th className="p-3 text-start">الصف التالي</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => {
                    const d = decisions[s.id] || {}
                    const result = resultLabels[d.result] || resultLabels.repeating

                    return (
                      <tr key={s.id}
                          className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                          style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                        <td className="p-3 font-semibold">
                          {s.gender === 'female' ? '👧' : '👦'} {s.full_name}
                        </td>
                        <td className="p-3 text-center">{s.section || '—'}</td>
                        <td className="p-3 text-center">
                          <span className="badge"
                                style={{
                                  background: s.average >= 50 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: s.average >= 50 ? '#10B981' : '#EF4444',
                                }}>
                            {s.average.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-xs"
                            style={{ color: 'var(--text-secondary)' }}>
                          {s.grades_count}
                        </td>
                        <td className="p-3">
                          <select value={d.result || 'repeating'}
                                  onChange={(e) => updateDecision(s.id, 'result', e.target.value)}
                                  className="input-modern !py-1.5 !text-xs"
                                  style={{ background: result.bg }}>
                            <option value="passed">✅ ناجح</option>
                            <option value="repeating">🔁 معيد</option>
                            {s.is_final_grade && (
                              <option value="graduated">🎓 متخرج</option>
                            )}
                          </select>
                        </td>
                        <td className="p-3 text-xs">
                          {d.result === 'passed' ? (
                            <strong style={{ color: '#10B981' }}>
                              {d.next_grade || s.suggested_next_grade}
                            </strong>
                          ) : d.result === 'graduated' ? (
                            <strong style={{ color: '#8B5CF6' }}>🎓 يتخرج</strong>
                          ) : (
                            <strong style={{ color: '#F59E0B' }}>🔁 يبقى في {s.grade}</strong>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* تحذير */}
          <div className="glass-card p-4 flex gap-3 items-start"
               style={{ background: 'rgba(245,158,11,0.08)' }}>
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-amber-700">تنبيه مهم</strong>
              <ul className="mt-2 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• عند التطبيق، سيتم تحديث صفوف الطلاب الناجحين تلقائيًا.</li>
                <li>• سيتم إنشاء سجل في "الملف الأكاديمي" لكل طالب.</li>
                <li>• الطلاب المعيدون سيبقون في نفس الصف.</li>
                <li>• المتخرجون سيُوسمون كـ "متخرج" ولن يظهروا في القوائم النشطة.</li>
                <li>• <strong className="text-red-600">⚠️ لا يمكن التراجع عن هذه العملية.</strong></li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}