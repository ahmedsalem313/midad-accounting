import { useState, useEffect } from 'react'
import {
  AlertTriangle, Bell, Shield, XCircle, RefreshCw, X, Trash2,
  User, Phone, CheckCircle, Search, Ban, TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const LEVEL_INFO = {
  0: { label: 'نشط',           icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  1: { label: 'إنذار أول',     icon: '🔔', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  2: { label: 'إنذار ثاني',    icon: '⚠️', color: '#EA580C', bg: 'rgba(234,88,12,0.12)' },
  3: { label: 'تعهد',          icon: '🟠', color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  4: { label: 'راسب بالغياب',  icon: '❌', color: '#7F1D1D', bg: 'rgba(127,29,29,0.15)' },
}

export default function AbsenceWarnings() {
  const { hasPermission } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    fetchDangerZone()
  }, [])

  const fetchDangerZone = async () => {
    try {
      setLoading(true)
      const res = await api.get('/student-attendance/danger-zone')
      setStudents(res.data.data.students)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarnings = async (studentId) => {
    try {
      const res = await api.get(`/student-attendance/warnings/${studentId}`)
      setWarnings(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل الإنذارات')
    }
  }

  const openStudent = (student) => {
    setSelectedStudent(student)
    fetchWarnings(student.id)
  }

  const handleCancelWarning = async (warningId) => {
    const reason = prompt('سبب إلغاء الإنذار:')
    if (!reason) return

    try {
      await api.post(`/student-attendance/warnings/${warningId}/cancel`, { reason })
      toast.success('تم إلغاء الإنذار')
      fetchWarnings(selectedStudent.id)
    } catch (e) {
      toast.error('فشل الإلغاء')
    }
  }

  const handleRecalculate = async (studentId) => {
    if (!confirm('إعادة حساب غيابات الطالب من سجلات الحضور؟')) return

    try {
      const res = await api.post(`/student-attendance/recalculate/${studentId}`)
      toast.success(`تم إعادة الحساب: إجمالي ${res.data.data.total}، متتالي ${res.data.data.streak}`)
      fetchWarnings(studentId)
      fetchDangerZone()
    } catch (e) {
      toast.error('فشل إعادة الحساب')
    }
  }

  const getLevelInfo = (level) => LEVEL_INFO[level] || LEVEL_INFO[0]

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.grade?.toLowerCase().includes(q)
    )
  })

  // تجميع حسب المستوى
  const stats = {
    level1: students.filter(s => s.absence_level === 1).length,
    level2: students.filter(s => s.absence_level === 2).length,
    level3: students.filter(s => s.absence_level === 3).length,
    level4: students.filter(s => s.absence_level === 4).length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={26} />
          إنذارات الغياب
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          متابعة الطلاب الذين وصلوا للإنذارات أو التعهدات
        </p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center"
             style={{ borderTop: '3px solid #F59E0B' }}>
          <p className="text-3xl">🔔</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>إنذار أول</p>
          <p className="text-2xl font-bold text-amber-500">{stats.level1}</p>
        </div>

        <div className="glass-card p-4 text-center"
             style={{ borderTop: '3px solid #EA580C' }}>
          <p className="text-3xl">⚠️</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>إنذار ثاني</p>
          <p className="text-2xl font-bold text-orange-600">{stats.level2}</p>
        </div>

        <div className="glass-card p-4 text-center"
             style={{ borderTop: '3px solid #DC2626' }}>
          <p className="text-3xl">🟠</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>تعهد</p>
          <p className="text-2xl font-bold text-red-600">{stats.level3}</p>
        </div>

        <div className="glass-card p-4 text-center"
             style={{ borderTop: '3px solid #7F1D1D' }}>
          <p className="text-3xl">❌</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>راسب</p>
          <p className="text-2xl font-bold" style={{ color: '#7F1D1D' }}>{stats.level4}</p>
        </div>
      </div>

      {/* بحث */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث بالاسم أو الصف..."
            className="input-modern ps-10"
          />
        </div>
      </div>

      {/* جدول */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
            <p style={{ color: 'var(--text-secondary)' }}>لا يوجد طلاب في خطر 🎉</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-center">إجمالي الغياب</th>
                  <th className="p-3 text-center">متتالي</th>
                  <th className="p-3 text-start">ولي الأمر</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const info = getLevelInfo(s.absence_level)
                  return (
                    <tr key={s.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3 font-semibold">{s.full_name}</td>
                      <td className="p-3 text-xs">{s.grade} {s.section && `- ${s.section}`}</td>
                      <td className="p-3">
                        <span className="badge" style={{ background: info.bg, color: info.color }}>
                          {info.icon} {info.label}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{s.absence_total}</td>
                      <td className="p-3 text-center font-bold">{s.absence_streak}</td>
                      <td className="p-3 text-xs">
                        <div>{s.guardian_name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                          {s.guardian_phone}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openStudent(s)}
                          className="btn-ghost !py-1 !px-3 !text-xs"
                          style={{ color: '#6366F1' }}
                        >
                          <Bell size={14} className="inline me-1" />
                          التفاصيل
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

      {/* نافذة التفاصيل */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                     style={{ background: `linear-gradient(135deg, ${getLevelInfo(selectedStudent.absence_level).color}, ${getLevelInfo(selectedStudent.absence_level).color}cc)` }}>
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
                {hasPermission('attendance.confirm') && (
                  <button
                    onClick={() => handleRecalculate(selectedStudent.id)}
                    className="btn-ghost border-2 flex items-center gap-2"
                    style={{ borderColor: 'var(--border-color)' }}
                    title="إعادة حساب الغيابات"
                  >
                    <RefreshCw size={16} />
                    إعادة حساب
                  </button>
                )}
                <button
                  onClick={() => { setSelectedStudent(null); setWarnings([]) }}
                  className="btn-ghost !p-2 text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* معلومات */}
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl text-center"
                     style={{ background: getLevelInfo(selectedStudent.absence_level).bg }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الحالة</p>
                  <p className="font-bold" style={{ color: getLevelInfo(selectedStudent.absence_level).color }}>
                    {getLevelInfo(selectedStudent.absence_level).icon} {getLevelInfo(selectedStudent.absence_level).label}
                  </p>
                </div>

                <div className="p-3 rounded-xl text-center"
                     style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الغياب</p>
                  <p className="font-bold text-lg">{selectedStudent.absence_total} يوم</p>
                </div>

                <div className="p-3 rounded-xl text-center"
                     style={{ background: 'rgba(245,158,11,0.08)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>غياب متتالي</p>
                  <p className="font-bold text-lg">{selectedStudent.absence_streak} يوم</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.08)' }}>
                <Phone size={18} className="text-primary-500" />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ولي الأمر</p>
                  <p className="font-medium">{selectedStudent.guardian_name}</p>
                </div>
                <span className="font-mono text-sm" dir="ltr">
                  {selectedStudent.guardian_phone}
                </span>
              </div>
            </div>

            {/* سجل الإنذارات */}
            <div className="p-5 overflow-y-auto flex-1">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Bell size={18} />
                سجل الإنذارات ({warnings.length})
              </h4>

              {warnings.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  لا توجد إنذارات مسجّلة
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.map((w) => {
                    const info = getLevelInfo(
                      w.level === 'warn_1' ? 1 :
                      w.level === 'warn_2' ? 2 :
                      w.level === 'warn_3' ? 3 :
                      w.level === 'expelled' ? 4 : 3
                    )
                    return (
                      <div key={w.id} className="p-3 rounded-xl flex items-start gap-3"
                           style={{
                             background: w.cancelled ? 'rgba(148,163,184,0.08)' : info.bg,
                             opacity: w.cancelled ? 0.6 : 1,
                           }}>
                        <div className="text-2xl">{info.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold" style={{ color: info.color }}>
                              {w.reason}
                            </span>
                            {w.cancelled === 1 && (
                              <span className="badge-danger text-xs">ملغى</span>
                            )}
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            إجمالي: {w.absence_total} • متتالي: {w.absence_streak}
                          </p>
                          {w.cancel_reason && (
                            <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
                              سبب الإلغاء: {w.cancel_reason}
                            </p>
                          )}
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                            {new Date(w.issued_at).toLocaleString('en-GB')}
                          </p>
                        </div>
                        {!w.cancelled && hasPermission('attendance.confirm') && (
                          <button
                            onClick={() => handleCancelWarning(w.id)}
                            className="btn-ghost !p-2 text-red-500 flex-shrink-0"
                            title="إلغاء الإنذار"
                          >
                            <Ban size={14} />
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
    </div>
  )
}