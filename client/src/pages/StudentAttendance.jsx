import { useState, useEffect, useMemo } from 'react'
import {
  CheckSquare, Search, Users, Calendar, Save, AlertCircle,
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp,
  BarChart3, Phone
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType
} from '../utils/schoolData'

const STATUSES = [
  { value: 'present',  label: 'حاضر',  icon: '✅', color: '#10B981' },
  { value: 'absent',   label: 'غائب',  icon: '❌', color: '#EF4444' },
  { value: 'late',     label: 'متأخر', icon: '⏰', color: '#F59E0B' },
  { value: 'excused',  label: 'بعذر',  icon: '📝', color: '#64748B' },
]

const SESSIONS = [
  { value: 'morning',   label: 'صباحي', icon: '🌅', defaultTime: '08:00' },
  { value: 'afternoon', label: 'مسائي', icon: '🌇', defaultTime: '13:00' },
]

export default function StudentAttendance() {
  const { hasPermission, user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isAdvisor = user?.is_advisor === 1 || user?.is_advisor === true
  const advisorGrade = user?.advisor_grade
  const advisorSection = user?.advisor_section

  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  // ============================================
  // تحديد القيمة الابتدائية بناءً على نوع المستخدم
  // ============================================
  const initialGrade = useMemo(() => {
    if (!isAdmin && isAdvisor && advisorGrade) {
      return advisorGrade
    }
    return GRADES[0]
  }, [isAdmin, isAdvisor, advisorGrade, GRADES])

  const initialSection = useMemo(() => {
    if (!isAdmin && isAdvisor && advisorSection) {
      return advisorSection
    }
    return SECTIONS[0]
  }, [isAdmin, isAdvisor, advisorSection])

  const [activeTab, setActiveTab] = useState('mark')
  const [selectedGrade, setSelectedGrade] = useState(initialGrade)
  const [selectedSection, setSelectedSection] = useState(initialSection)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSession, setSelectedSession] = useState('morning')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // التحذيرات
  const [warnings, setWarnings] = useState([])

  // التقارير
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')
  const [reportGrade, setReportGrade] = useState('')
  const [report, setReport] = useState([])

  // ============================================
  // مزامنة الصف/الشعبة عند تحديث user
  // ============================================
  useEffect(() => {
    if (!isAdmin && isAdvisor) {
      if (advisorGrade && selectedGrade !== advisorGrade) {
        setSelectedGrade(advisorGrade)
      }
      if (advisorSection && selectedSection !== advisorSection) {
        setSelectedSection(advisorSection)
      }
    }
  }, [isAdmin, isAdvisor, advisorGrade, advisorSection])

  // ============================================
  // تحميل الطلاب
  // ============================================
  useEffect(() => {
    if (activeTab === 'mark') {
      fetchStudents()
    } else if (activeTab === 'warnings') {
      fetchWarnings()
    }
  }, [activeTab, selectedGrade, selectedSection, selectedDate, selectedSession])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      // للمرشد: نرسل الصف فقط (السيرفر يُصفّي حسب الصلاحيات)
      const params = {
        date: selectedDate,
        session: selectedSession,
      }

      if (isAdmin) {
        params.grade = selectedGrade
        params.section = selectedSection
      } else if (isAdvisor) {
        params.grade = advisorGrade
        if (advisorSection) params.section = advisorSection
      }

      const res = await api.get('/student-attendance/class', { params })

      setStudents(res.data.data.map(s => ({
        student_id: s.student_id,
        full_name: s.full_name,
        student_code: s.student_code,
        status: s.status || 'present',
        notes: s.notes || '',
        late_minutes: s.late_minutes || 0,
      })))
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarnings = async () => {
    try {
      const res = await api.get('/student-attendance/warnings')
      setWarnings(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التحذيرات')
    }
  }

  const fetchReport = async () => {
    if (!reportFrom || !reportTo) {
      toast.error('يرجى تحديد الفترة')
      return
    }

    try {
      setLoading(true)
      const params = { from_date: reportFrom, to_date: reportTo }
      if (reportGrade) params.grade = reportGrade

      const res = await api.get('/student-attendance/class/report', { params })
      setReport(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // تحديث حالة طالب
  // ============================================
  const updateStudentStatus = (studentId, status) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, status } : s
    ))
  }

  const updateStudentNotes = (studentId, notes) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, notes } : s
    ))
  }

  const markAllAs = (status) => {
    setStudents(prev => prev.map(s => ({ ...s, status })))
  }

  // ============================================
  // حفظ الحضور
  // ============================================
  const handleSave = async () => {
    if (students.length === 0) {
      toast.error('لا يوجد طلاب')
      return
    }

    setSaving(true)
    try {
      await api.post('/student-attendance/bulk', {
        date: selectedDate,
        session: selectedSession,
        students: students.map(s => ({
          student_id: s.student_id,
          status: s.status,
          notes: s.notes,
        })),
      })
      toast.success('تم حفظ الحضور بنجاح')
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
    total: students.length,
  }

  const getStatusInfo = (value) => STATUSES.find(s => s.value === value) || STATUSES[0]

  // ============================================
  // الصف/الشعبة المعروضة (للمرشد)
  // ============================================
  const displayGrade = !isAdmin && isAdvisor ? advisorGrade : selectedGrade
  const displaySection = !isAdmin && isAdvisor && advisorSection ? advisorSection : selectedSection

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckSquare className="text-primary-500" size={26} />
          حضور الطلاب
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          تسجيل الحضور والغياب + تقارير + تحذيرات
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 flex flex-wrap gap-1">
        {[
          { id: 'mark',       label: 'تسجيل الحضور',   icon: CheckSquare },
          { id: 'warnings',   label: 'تحذيرات الغياب', icon: AlertTriangle },
          { id: 'report',     label: 'تقارير',          icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-all ${
                isActive ? 'text-white shadow-lg' : 'text-slate-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' } : {}}
            >
              <Icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ============ تبويب: تسجيل الحضور ============ */}
      {activeTab === 'mark' && (
        <>
          {/* الفلاتر */}
          <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
            {isAdmin ? (
              <>
                {isAdmin && (
  <>
    <label className="text-sm font-medium">الصف:</label>
    <select value={reportGrade}
            onChange={(e) => setReportGrade(e.target.value)}
            className="input-modern !w-auto min-w-[150px]">
      <option value="">كل الصفوف</option>
      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
    </select>
  </>
)}
                <label className="text-sm font-medium">الشعبة:</label>
                <select value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="input-modern !w-auto min-w-[100px]">
                  {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
                </select>
              </>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium"
                   style={{ background: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}>
                <span>📚 صفك:</span>
                <span className="font-bold">{displayGrade}</span>
                {displaySection && <span className="font-bold">- شعبة {displaySection}</span>}
              </div>
            )}

            <label className="text-sm font-medium">التاريخ:</label>
            <input type="date" value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="input-modern !w-auto" />

            <label className="text-sm font-medium">الحصة:</label>
            <select value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="input-modern !w-auto">
              {SESSIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>

          {/* الإحصائيات + أدوات سريعة */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#10B981' }}></div>
                  <span className="text-sm">حاضر: <strong>{stats.present}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }}></div>
                  <span className="text-sm">غائب: <strong>{stats.absent}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }}></div>
                  <span className="text-sm">متأخر: <strong>{stats.late}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#64748B' }}></div>
                  <span className="text-sm">بعذر: <strong>{stats.excused}</strong></span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => markAllAs('present')}
                        className="btn-ghost !py-1.5 !px-3 !text-xs border-2"
                        style={{ borderColor: 'rgba(16,185,129,0.4)', color: '#10B981' }}>
                  ✅ الكل حاضر
                </button>
                <button onClick={handleSave}
                        disabled={saving || students.length === 0}
                        className="btn-primary flex items-center gap-2">
                  <Save size={16} />
                  {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
                </button>
              </div>
            </div>
          </div>

          {/* جدول الطلاب */}
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-10 text-center">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="p-10 text-center">
                <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
                <p style={{ color: 'var(--text-secondary)' }}>لا يوجد طلاب في هذا الصف/الشعبة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="p-3 text-start w-12">#</th>
                      <th className="p-3 text-start">الطالب</th>
                      <th className="p-3 text-start">الرقم الأكاديمي</th>
                      <th className="p-3 text-start">الحالة</th>
                      <th className="p-3 text-start">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.student_id} className="border-b"
                          style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                        <td className="p-3 font-semibold">{s.full_name}</td>
                        <td className="p-3 text-xs" dir="ltr">
                          {s.student_code || '—'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {STATUSES.map(st => (
                              <button
                                key={st.value}
                                onClick={() => updateStudentStatus(s.student_id, st.value)}
                                className="w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all"
                                style={{
                                  borderColor: s.status === st.value ? st.color : 'var(--border-color)',
                                  background: s.status === st.value ? `${st.color}20` : 'var(--bg-card)',
                                }}
                                title={st.label}
                              >
                                <span style={{ fontSize: '16px' }}>{st.icon}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={s.notes}
                            onChange={(e) => updateStudentNotes(s.student_id, e.target.value)}
                            className="input-modern !py-1.5 !text-xs"
                            placeholder="اختياري..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ تبويب: التحذيرات ============ */}
      {activeTab === 'warnings' && (
        <>
          <div className="glass-card p-4">
            <div className="text-xs p-3 rounded-lg"
                 style={{ background: 'rgba(245,158,11,0.1)', color: '#92400e' }}>
              💡 يظهر هنا الطلاب الذين وصلوا إلى 75% من الحد الأقصى للغياب
            </div>
          </div>

          {warnings.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
              <p style={{ color: 'var(--text-secondary)' }}>لا يوجد طلاب في منطقة التحذير 🎉</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warnings.map((w) => {
                const bgColor = w.status === 'critical' ? '#EF4444'
                              : w.status === 'warning' ? '#F59E0B'
                              : '#3B82F6'
                return (
                  <div key={w.id} className="glass-card p-5 border-2"
                       style={{ borderColor: bgColor + '40' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold">{w.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {w.grade} {w.section && `- ${w.section}`}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                           style={{ background: bgColor + '20', color: bgColor }}>
                        {w.status === 'critical' ? <AlertCircle size={22} /> : <AlertTriangle size={22} />}
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span>أيام الغياب:</span>
                        <span className="font-bold" style={{ color: bgColor }}>
                          {w.absent_days} / {w.absence_limit}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>المتبقي:</span>
                        <span className="font-bold">{w.remaining} يوم</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden"
                           style={{ background: 'var(--border-color)' }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${Math.min(100, w.percent)}%`, background: bgColor }} />
                      </div>
                      <p className="text-xs text-center font-semibold" style={{ color: bgColor }}>
                        {w.percent}% من الحد الأقصى
                      </p>
                    </div>

                    {w.guardian_phone && (
                      <div className="flex items-center gap-2 p-2 rounded-lg text-xs"
                           style={{ background: 'rgba(99,102,241,0.08)' }}>
                        <Phone size={12} />
                        <span dir="ltr">{w.guardian_phone}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ============ تبويب: التقارير ============ */}
      {activeTab === 'report' && (
        <>
          <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium">من:</label>
            <input type="date" value={reportFrom}
                   onChange={(e) => setReportFrom(e.target.value)}
                   className="input-modern !w-auto" />

            <label className="text-sm font-medium">إلى:</label>
            <input type="date" value={reportTo}
                   onChange={(e) => setReportTo(e.target.value)}
                   className="input-modern !w-auto" />

            {isAdmin && (
              <>
                <label className="text-sm font-medium">الصف:</label>
                <select value={reportGrade}
                        onChange={(e) => setReportGrade(e.target.value)}
                        className="input-modern !w-auto min-w-[150px]">
                  <option value="">كل الصفوف</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </>
            )}

            <button onClick={fetchReport} className="btn-primary">
              <BarChart3 size={16} />
              عرض التقرير
            </button>
          </div>

          {report.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="font-bold">تقرير الحضور ({report.length} طالب)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="p-3 text-start">#</th>
                      <th className="p-3 text-start">الطالب</th>
                      <th className="p-3 text-start">الصف</th>
                      <th className="p-3 text-center">حاضر</th>
                      <th className="p-3 text-center">غائب</th>
                      <th className="p-3 text-center">متأخر</th>
                      <th className="p-3 text-center">بعذر</th>
                      <th className="p-3 text-center">دقائق التأخير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((r, i) => (
                      <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                        <td className="p-3 font-semibold">{r.full_name}</td>
                        <td className="p-3 text-xs">{r.grade} {r.section && `- ${r.section}`}</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">{r.present_days}</td>
                        <td className="p-3 text-center text-red-500 font-bold">{r.absent_days}</td>
                        <td className="p-3 text-center text-amber-500 font-bold">{r.late_days}</td>
                        <td className="p-3 text-center text-slate-500 font-bold">{r.excused_days}</td>
                        <td className="p-3 text-center">{r.total_late_minutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}