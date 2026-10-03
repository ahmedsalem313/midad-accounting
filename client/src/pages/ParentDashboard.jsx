import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, GraduationCap, CheckSquare, Award, LogOut, User,
  TrendingUp, CheckCircle, XCircle, Clock, FileText, DollarSign,
  AlertCircle, ChevronLeft, Users, AlertTriangle, MessageSquare, Phone
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
// ============================================
// ثوابت
// ============================================
const SUBJECT_NAMES = {
  arabic: 'اللغة العربية',
  arabic_reading: 'القراءة',
  arabic_grammar: 'القواعد',
  arabic_literature: 'الأدب والنصوص',
  arabic_spelling: 'الإملاء',
  arabic_essay: 'الإنشاء',
  islamic: 'التربية الإسلامية',
  english: 'اللغة الإنجليزية',
  french: 'اللغة الفرنسية',
  math: 'الرياضيات',
  science: 'العلوم',
  chemistry: 'الكيمياء',
  physics: 'الفيزياء',
  biology: 'الأحياء',
  social: 'الاجتماعيات',
  history: 'التاريخ',
  geography: 'الجغرافيا',
  national: 'الوطنية',
  computer: 'الحاسوب',
  art: 'التربية الفنية',
  pe: 'التربية الرياضية',
  sociology: 'علم الاجتماع',
  philosophy: 'الفلسفة وعلم النفس',
  economics: 'الاقتصاد',
}

const EXAM_NAMES = {
  monthly_1: 'الشهري الأول',
  monthly_2: 'الشهري الثاني',
  midterm: 'نصف السنة',
  final: 'النهائي',
}

const STATUS_LABELS = {
  present: { label: 'حاضر', icon: '✅', color: '#10B981' },
  absent: { label: 'غائب', icon: '❌', color: '#EF4444' },
  late: { label: 'متأخر', icon: '⏰', color: '#F59E0B' },
  excused: { label: 'بعذر', icon: '📝', color: '#64748B' },
}

const BEHAVIOR_RATINGS = {
  excellent: { label: 'ممتاز', icon: '🌟', color: '#10B981' },
  good: { label: 'جيد', icon: '👍', color: '#3B82F6' },
  acceptable: { label: 'مقبول', icon: '👌', color: '#F59E0B' },
  poor: { label: 'يحتاج تحسين', icon: '⚠️', color: '#EF4444' },
}

const COMM_TYPES = {
  call:     { label: 'مكالمة هاتفية', icon: '📞', color: '#6366F1' },
  whatsapp: { label: 'واتساب',         icon: '💬', color: '#10B981' },
  visit:    { label: 'زيارة للمدرسة',  icon: '🏫', color: '#F59E0B' },
  letter:   { label: 'رسالة مكتوبة',   icon: '📝', color: '#8B5CF6' },
  meeting:  { label: 'اجتماع',         icon: '👥', color: '#EC4899' },
}

const COMM_STATUSES = {
  pending:        { label: 'قيد الانتظار', color: '#F59E0B', icon: '⏳' },
  resolved:       { label: 'تم الحل',      color: '#10B981', icon: '✅' },
  needs_followup: { label: 'يحتاج متابعة', color: '#EF4444', icon: '⚠️' },
}

const NOTE_CATEGORIES = {
  behavior: { label: 'سلوكية', icon: '🎯', color: '#6366F1' },
  academic: { label: 'أكاديمية', icon: '📚', color: '#10B981' },
  health:   { label: 'صحية',   icon: '💊', color: '#EF4444' },
  general:  { label: 'عامة',   icon: '💬', color: '#8B5CF6' },
}

// ============================================
// المكوّن الرئيسي
// ============================================
export default function ParentDashboard() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [calendarEvents, setCalendarEvents] = useState([])
  useEffect(() => {
    const token = localStorage.getItem('parent_token')
    if (!token) {
      navigate('/parent-login')
      return
    }

    const storedStudents = JSON.parse(localStorage.getItem('parent_students') || '[]')
    setStudents(storedStudents)

    if (storedStudents.length === 1) {
      setSelectedStudentId(storedStudents[0].id)
    }
  }, [])

    useEffect(() => {
    if (selectedStudentId) {
      fetchStudentData()
      fetchCalendar()
    }
  }, [selectedStudentId])

  const fetchStudentData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('parent_token')
      const res = await api.get(`/parent/student/${selectedStudentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(res.data.data)
    } catch (e) {
      if (e.response?.status === 401) {
        logout()
      } else {
        toast.error('فشل تحميل البيانات')
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('parent_token')
    localStorage.removeItem('parent_phone')
    localStorage.removeItem('parent_students')
    navigate('/parent-login')
  }
  const fetchCalendar = async () => {
    try {
      const res = await api.get('/calendar/public')
      setCalendarEvents(res.data.data || [])
    } catch (e) {
      console.error('فشل تحميل التقويم:', e)
    }
  }
  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  // ============================================
  // اختيار الطالب (إذا أكثر من واحد)
  // ============================================
  if (!selectedStudentId && students.length > 1) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="glass-card w-full max-w-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-3xl mb-4"
                 style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              👨‍👩‍👧
            </div>
            <h2 className="text-2xl font-bold mb-2">اختر الطالب</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              لديك {students.length} طلاب مسجلين
            </p>
          </div>

          <div className="space-y-3">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className="w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all hover:scale-[1.02]"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  {s.full_name?.charAt(0)}
                </div>
                <div className="flex-1 text-start">
                  <p className="font-bold text-lg">{s.full_name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {s.grade} {s.section && `- شعبة ${s.section}`}
                  </p>
                </div>
                <ChevronLeft size={24} style={{ color: 'var(--text-secondary)' }} />
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button onClick={logout} className="text-sm text-red-500">
              <LogOut size={14} className="inline me-1" />
              تسجيل خروج
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) return null

  const {
    student, fees, grades = [], gradesBlocked = false, gradesBlockReason = null,
    attendance = [], attendanceStats = {}, behavior = [], warnings = [],
    publicNotes = [], communications = [], schoolName,
  } = data

  return (
    <div className="min-h-screen p-4 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-card p-5 flex flex-wrap items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
             style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          {student.full_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold">{student.full_name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {student.grade} {student.section && `- شعبة ${student.section}`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {schoolName}
          </p>
        </div>

        <div className="flex gap-2">
          {students.length > 1 && (
            <button
              onClick={() => { setSelectedStudentId(null); setData(null) }}
              className="btn-ghost !py-2 !px-3 text-sm flex items-center gap-1"
            >
              <Users size={16} />
              تغيير
            </button>
          )}
          <button
            onClick={logout}
            className="btn-ghost !py-2 !px-3 text-sm text-red-500 flex items-center gap-1"
          >
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 flex flex-wrap gap-1">
                {[
          { id: 'overview',       label: 'نظرة عامة',     icon: TrendingUp },
          { id: 'fees',           label: 'الأقساط',        icon: Wallet },
          { id: 'grades',         label: 'الدرجات',        icon: GraduationCap },
          { id: 'attendance',     label: 'الحضور',         icon: CheckSquare },
          { id: 'behavior',       label: 'السلوك',         icon: Award },
          { id: 'calendar',       label: 'التقويم',        icon: CalendarIcon },
          { id: 'notes',          label: 'الملاحظات',      icon: MessageSquare },
          { id: 'communications', label: 'سجل التواصل',   icon: Phone },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium transition-all ${
                isActive ? 'text-white shadow-lg' : 'text-slate-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' } : {}}
            >
              <Icon size={16} />
              <span className="text-sm">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ========== نظرة عامة ========== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {warnings && warnings.length > 0 && (
            <div className="glass-card p-5 border-2 border-amber-500"
                 style={{ background: 'rgba(245,158,11,0.05)' }}>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-amber-600">
                ⚠️ تنبيهات الغياب
              </h3>
              <div className="space-y-2">
                {warnings.slice(0, 3).map((w) => (
                  <div key={w.id} className="p-3 rounded-xl flex items-center gap-3"
                       style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <span className="text-xl">
                      {w.level === 'warn_1' ? '🔔' :
                       w.level === 'warn_2' ? '⚠️' :
                       w.level === 'warn_3' ? '🟠' :
                       w.level === 'expelled' ? '❌' : '📝'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{w.reason}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        إجمالي: {w.absence_total} • متتالي: {w.absence_streak}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {student.absence_total > 0 && (
                <div className="mt-3 p-3 rounded-xl text-center"
                     style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    إجمالي غياب {student.full_name}:
                  </p>
                  <p className="text-xl font-bold text-primary-600">
                    {student.absence_total} يوم
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} style={{ color: '#10B981' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>المتبقي</p>
              </div>
              <p className="text-lg font-bold" style={{ color: fees.remaining > 0 ? '#EF4444' : '#10B981' }}>
                {fmt(fees.remaining)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={18} style={{ color: '#6366F1' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>عدد الدرجات</p>
              </div>
              <p className="text-lg font-bold">{grades.length}</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} style={{ color: '#10B981' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>أيام الحضور</p>
              </div>
              <p className="text-lg font-bold text-emerald-600">{attendanceStats.present || 0}</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={18} style={{ color: '#EF4444' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>أيام الغياب</p>
              </div>
              <p className="text-lg font-bold text-red-500">{attendanceStats.absent || 0}</p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-bold mb-4">💰 حالة الأقساط</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-3 rounded-full overflow-hidden"
                   style={{ background: 'var(--border-color)' }}>
                <div className="h-full rounded-full transition-all"
                     style={{
                       width: `${fees.collectionRate}%`,
                       background: 'linear-gradient(90deg, #10B981, #6366F1)',
                     }} />
              </div>
              <span className="text-lg font-bold" style={{ color: '#8B5CF6' }}>
                {fees.collectionRate}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الرسوم</p>
                <p className="font-bold">{fmt(fees.totalFees)}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>المدفوع</p>
                <p className="font-bold text-emerald-600">{fmt(fees.totalPaid)}</p>
              </div>
              <div className="p-3 rounded-xl"
                   style={{ background: fees.remaining > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>المتبقي</p>
                <p className="font-bold" style={{ color: fees.remaining > 0 ? '#EF4444' : '#10B981' }}>
                  {fmt(fees.remaining)}
                </p>
              </div>
            </div>
          </div>

          {behavior.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-bold mb-4">🎯 آخر تقييم سلوك</h3>
              {(() => {
                const latest = behavior[0]
                const info = BEHAVIOR_RATINGS[latest.rating] || BEHAVIOR_RATINGS.acceptable
                return (
                  <div className="flex items-center gap-4 p-4 rounded-xl"
                       style={{ background: `${info.color}15` }}>
                    <div className="text-4xl">{info.icon}</div>
                    <div className="flex-1">
                      <p className="font-bold text-lg" style={{ color: info.color }}>
                        {info.label}
                      </p>
                      {latest.note && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {latest.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========== الأقساط ========== */}
      {activeTab === 'fees' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="font-bold">💰 سجل الدفعات ({fees.payments.length})</h3>
          </div>
          {fees.payments.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد دفعات مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="p-3 text-start">رقم الإيصال</th>
                    <th className="p-3 text-start">التاريخ</th>
                    <th className="p-3 text-start">المبلغ</th>
                    <th className="p-3 text-start">المدفوع</th>
                    <th className="p-3 text-start">الطريقة</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.payments.map((p) => (
                    <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 font-mono text-xs" style={{ color: '#6366F1' }}>
                        {p.receipt_number}
                      </td>
                      <td className="p-3 text-xs" dir="ltr">{p.payment_date}</td>
                      <td className="p-3">{fmt(p.amount)}</td>
                      <td className="p-3 font-bold text-emerald-600">{fmt(p.paid_amount)}</td>
                      <td className="p-3 text-xs">
                        {p.method === 'cash' ? '💵 نقدي' :
                         p.method === 'transfer' ? '🏦 تحويل' :
                         p.method === 'check' ? '📝 شيك' : '💳 بطاقة'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== الدرجات ========== */}
      {activeTab === 'grades' && (
        <>
          {gradesBlocked ? (
            <div className="glass-card p-10 text-center border-4 border-dashed"
                 style={{ borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.06)' }}>
              <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-5"
                   style={{ background: 'rgba(239,68,68,0.15)' }}>
                <span className="text-5xl">🚫</span>
              </div>
              <h3 className="text-3xl font-bold text-red-500 mb-3">
                الدرجات محجوبة
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                لا يمكن عرض درجات الطالب حتى تتم تسوية الوضع
              </p>
              <div className="inline-block p-4 rounded-xl text-sm font-medium max-w-md"
                   style={{ background: 'rgba(239,68,68,0.12)', color: '#B91C1C' }}>
                <strong className="block mb-1">السبب:</strong>
                <span>{gradesBlockReason}</span>
              </div>
              <p className="text-xs mt-5" style={{ color: 'var(--text-secondary)' }}>
                📞 يرجى التواصل مع إدارة المدرسة لتسوية الوضع
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              {grades.length === 0 ? (
                <div className="p-10 text-center">
                  <GraduationCap size={48} className="mx-auto mb-3 text-slate-400" />
                  <p style={{ color: 'var(--text-secondary)' }}>لا توجد درجات مسجلة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <th className="p-3 text-start">المادة</th>
                        <th className="p-3 text-start">الامتحان</th>
                        <th className="p-3 text-start">الدرجة</th>
                        <th className="p-3 text-start">النسبة</th>
                        <th className="p-3 text-start">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((g, i) => {
                        const percent = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0
                        const color = percent >= 90 ? '#10B981' : percent >= 75 ? '#3B82F6'
                                    : percent >= 50 ? '#F59E0B' : '#EF4444'
                        return (
                          <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="p-3 font-medium">
                              {SUBJECT_NAMES[g.subject] || g.subject}
                            </td>
                            <td className="p-3 text-xs">
                              {EXAM_NAMES[g.exam_type] || g.exam_type}
                            </td>
                            <td className="p-3">{g.score}/{g.max_score}</td>
                            <td className="p-3">
                              <span className="badge" style={{ background: `${color}20`, color }}>
                                {percent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-xs" dir="ltr">{g.exam_date || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========== الحضور ========== */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 text-center">
              <CheckCircle size={24} className="mx-auto mb-2 text-emerald-500" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>حاضر</p>
              <p className="text-lg font-bold text-emerald-600">{attendanceStats.present || 0}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <XCircle size={24} className="mx-auto mb-2 text-red-500" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>غائب</p>
              <p className="text-lg font-bold text-red-500">{attendanceStats.absent || 0}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Clock size={24} className="mx-auto mb-2 text-amber-500" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>متأخر</p>
              <p className="text-lg font-bold text-amber-500">{attendanceStats.late || 0}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <FileText size={24} className="mx-auto mb-2 text-slate-500" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>بعذر</p>
              <p className="text-lg font-bold">{attendanceStats.excused || 0}</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-bold">📅 آخر 60 يوم</h3>
            </div>
            {attendance.length === 0 ? (
              <div className="p-10 text-center">
                <CheckSquare size={48} className="mx-auto mb-3 text-slate-400" />
                <p style={{ color: 'var(--text-secondary)' }}>لا توجد سجلات حضور</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="p-3 text-start">التاريخ</th>
                      <th className="p-3 text-start">الحصة</th>
                      <th className="p-3 text-start">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a, i) => {
                      const info = STATUS_LABELS[a.status] || STATUS_LABELS.present
                      return (
                        <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <td className="p-3" dir="ltr">{a.date}</td>
                          <td className="p-3 text-xs">
                            {a.session === 'morning' ? '🌅 صباحي' : '🌇 مسائي'}
                          </td>
                          <td className="p-3">
                            <span className="badge" style={{ background: `${info.color}20`, color: info.color }}>
                              {info.icon} {info.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== السلوك ========== */}
      {activeTab === 'behavior' && (
        <div className="space-y-4">
          {behavior.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Award size={48} className="mx-auto mb-3 text-slate-400" />
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد تقييمات سلوك بعد</p>
            </div>
          ) : (
            behavior.map((b) => {
              const info = BEHAVIOR_RATINGS[b.rating] || BEHAVIOR_RATINGS.acceptable
              return (
                <div key={b.id} className="glass-card p-5 flex items-start gap-4">
                  <div className="text-4xl">{info.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-lg" style={{ color: info.color }}>
                      {info.label}
                    </p>
                    {b.note && <p className="text-sm mt-1">{b.note}</p>}
                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(b.evaluated_at).toLocaleDateString('ar-IQ')}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ========== سجل التواصل ========== */}
      {activeTab === 'communications' && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="text-xs p-3 rounded-lg"
                 style={{ background: 'rgba(99,102,241,0.08)', color: '#4F46E5' }}>
              💬 هذا سجل لكل محاولات التواصل معكم من المدرسة
            </div>
          </div>

          {communications.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Phone size={48} className="mx-auto mb-3 text-slate-400" />
              <p style={{ color: 'var(--text-secondary)' }}>
                لا توجد سجلات تواصل حتى الآن
              </p>
            </div>
          ) : (
            communications.map((comm) => {
              const typeInfo = COMM_TYPES[comm.type] || { label: 'تواصل', icon: '💬', color: '#64748B' }
              const statusInfo = COMM_STATUSES[comm.result_status] || COMM_STATUSES.pending

              return (
                <div key={comm.id}
                     className="glass-card p-5"
                     style={{ borderRight: `4px solid ${typeInfo.color}` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                         style={{ background: `${typeInfo.color}20` }}>
                      {typeInfo.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="badge"
                              style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                        <span className="badge"
                              style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                          📅 {comm.communication_date}
                        </span>
                      </div>

                      <h4 className="font-bold text-lg mb-1">{comm.subject}</h4>
                      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <strong>السبب:</strong> {comm.reason}
                      </p>

                      {comm.result && (
                        <div className="p-3 rounded-lg mb-2"
                             style={{ background: `${statusInfo.color}10` }}>
                          <p className="text-sm">
                            <strong style={{ color: statusInfo.color }}>النتيجة:</strong> {comm.result}
                          </p>
                        </div>
                      )}

                      {comm.follow_up_date && (
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          🔔 متابعة بتاريخ: <strong dir="ltr">{comm.follow_up_date}</strong>
                        </p>
                      )}

                      <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        👤 {comm.teacher_name}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
      {/* ========== التقويم الأكاديمي ========== */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {calendarEvents.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <CalendarIcon size={48} className="mx-auto mb-3 text-slate-400" />
              <p style={{ color: 'var(--text-secondary)' }}>
                لا توجد أحداث قادمة حالياً
              </p>
            </div>
          ) : (
            <>
              <div className="glass-card p-4">
                <div className="text-xs p-3 rounded-lg"
                     style={{ background: 'rgba(99,102,241,0.08)', color: '#4F46E5' }}>
                  📅 هذه الأحداث والتقويم الأكاديمي المعلن من إدارة المدرسة
                </div>
              </div>

              {calendarEvents.map((ev) => {
                const daysLeft = Math.ceil(
                  (new Date(ev.start_date) - new Date()) / (1000 * 60 * 60 * 24)
                )
                const typeInfo = {
                  exam:     { label: 'امتحان',    icon: '📝', color: '#EF4444' },
                  holiday:  { label: 'عطلة',      icon: '🎉', color: '#10B981' },
                  meeting:  { label: 'اجتماع',    icon: '👥', color: '#F59E0B' },
                  activity: { label: 'نشاط',      icon: '🎨', color: '#8B5CF6' },
                  deadline: { label: 'موعد نهائي',icon: '⏰', color: '#DC2626' },
                  event:    { label: 'حدث',       icon: '📌', color: '#6366F1' },
                }[ev.type] || { label: 'حدث', icon: '📌', color: '#6366F1' }

                const color = ev.color || typeInfo.color

                return (
                  <div key={ev.id}
                       className="glass-card p-5"
                       style={{ borderRight: `4px solid ${color}` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                           style={{ background: `${color}20` }}>
                        {typeInfo.icon}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="badge"
                                style={{ background: `${color}20`, color }}>
                            {typeInfo.label}
                          </span>
                          <span className="badge"
                                style={{
                                  background: daysLeft <= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                                  color: daysLeft <= 3 ? '#DC2626' : '#4338CA',
                                }}>
                            {daysLeft === 0 ? '🔔 اليوم' :
                             daysLeft === 1 ? '⏰ غدًا' :
                             daysLeft < 0 ? '✅ انتهى' :
                             `بعد ${daysLeft} يوم`}
                          </span>
                        </div>

                        <h4 className="font-bold text-lg mb-1">{ev.title}</h4>

                        {ev.description && (
                          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            {ev.description}
                          </p>
                        )}

                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          📅 {format(new Date(ev.start_date), 'EEEE d MMMM yyyy', { locale: ar })}
                          {ev.end_date && ev.end_date !== ev.start_date && (
                            <> — {format(new Date(ev.end_date), 'd MMMM', { locale: ar })}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ========== ملاحظات المدرسة ========== */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {publicNotes.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <MessageSquare size={48} className="mx-auto mb-3 text-slate-400" />
              <p style={{ color: 'var(--text-secondary)' }}>
                لا توجد ملاحظات من المدرسة حالياً
              </p>
            </div>
          ) : (
            publicNotes.map((note) => {
              const catInfo = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.general

              return (
                <div key={note.id}
                     className="glass-card p-5"
                     style={{ borderRight: `4px solid ${catInfo.color}` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                         style={{ background: `${catInfo.color}20` }}>
                      {catInfo.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {note.is_pinned === 1 && <span className="text-amber-500">📌</span>}
                        <span className="badge"
                              style={{ background: `${catInfo.color}20`, color: catInfo.color }}>
                          {catInfo.icon} {catInfo.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                          {new Date(note.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      {note.title && (
                        <h4 className="font-bold text-lg mb-1">{note.title}</h4>
                      )}

                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>

                      <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        👤 {note.teacher_name}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}