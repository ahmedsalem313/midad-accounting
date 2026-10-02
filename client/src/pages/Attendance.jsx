import { useState, useEffect } from 'react'
import {
  CheckSquare, AlertCircle, CheckCircle, XCircle,
  Clock, Users, Calendar, ThumbsUp, X, Edit, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const STATUSES = [
  { value: 'present',      label: 'حاضر',          color: '#10B981', icon: '✅' },
  { value: 'late',         label: 'متأخر',         color: '#F59E0B', icon: '⏰' },
  { value: 'absent',       label: 'غائب',          color: '#EF4444', icon: '❌' },
  { value: 'excused',      label: 'غياب بعذر',     color: '#94A3B8', icon: '📝' },
  { value: 'sick_leave',   label: 'إجازة مرضية',   color: '#3B82F6', icon: '🏥' },
  { value: 'annual_leave', label: 'إجازة سنوية',   color: '#8B5CF6', icon: '🏖️' },
  { value: 'emergency',    label: 'إجازة طارئة',   color: '#EC4899', icon: '⚠️' },
  { value: 'holiday',      label: 'عطلة رسمية',    color: '#64748B', icon: '🎉' },
]

// ============================================
// نافذة تسجيل الحضور (للمعلم)
// ============================================
function TeacherCheckInModal({ onClose, onSuccess }) {
  const [status, setStatus] = useState('present')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendance/check-in', {
        status,
        teacher_note: note || null,
      })
      toast.success(res.data.message)
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const selectableStatuses = ['present', 'late', 'absent', 'sick_leave', 'annual_leave', 'emergency']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold">تسجيل حضورك اليوم</h3>
          <button onClick={onClose} className="btn-ghost !p-2 text-red-500">
            <X size={20} />
          </button>
        </div>

        {/* الحالة */}
        <div className="mb-5">
          <label className="text-sm font-medium block mb-2">حالتك اليوم:</label>
          <div className="grid grid-cols-2 gap-2">
            {selectableStatuses.map((s) => {
              const info = STATUSES.find((x) => x.value === s)
              const isActive = status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="p-3 rounded-xl border-2 transition-all text-start flex items-center gap-2"
                  style={{
                    borderColor: isActive ? info.color : 'var(--border-color)',
                    background: isActive ? `${info.color}15` : 'var(--bg-card)',
                  }}
                >
                  <span className="text-xl">{info.icon}</span>
                  <span className="text-sm font-medium"
                        style={{ color: isActive ? info.color : 'var(--text-primary)' }}>
                    {info.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* العذر */}
        <div className="mb-5">
          <label className="text-sm font-medium block mb-1.5">
            ملاحظة / عذر (اختياري)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-modern"
            rows="3"
            placeholder="مثال: تأخرت بسبب ازدحام المرور..."
          />
        </div>

        <div className="p-3 rounded-xl mb-5 text-xs"
             style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--text-secondary)' }}>
          💡 ستُرسل حالتك للمدير وسيراها. القرار النهائي بالخصم بيد المدير بعد مراجعة عذرك.
        </div>

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={loading}
                  className="btn-primary flex-1">
            {loading ? 'جاري الإرسال...' : 'تسجيل الحضور'}
          </button>
          <button onClick={onClose} className="btn-ghost">إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// المكوّن الرئيسي
// ============================================
export default function Attendance() {
  const { hasPermission, user } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [monthlyReport, setMonthlyReport] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7))
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [editModal, setEditModal] = useState(null)

  const isTeacher = user?.role === 'teacher'
  const canConfirm = hasPermission('attendance.confirm')
  const canViewReport = hasPermission('attendance.view')

  useEffect(() => {
    fetchToday()
  }, [selectedDate])

  const fetchToday = async () => {
    try {
      setLoading(true)
      if (selectedDate === new Date().toISOString().split('T')[0]) {
        const res = await api.get('/attendance/today')
        setTodayAttendance(res.data.data)
      } else {
        const res = await api.get('/attendance', { params: { date: selectedDate } })
        const formatted = res.data.data.map((a) => ({
          teacher_id: a.teacher_id,
          teacher_name: a.teacher_name,
          id: a.id,
          status: a.status,
          check_in_time: a.check_in_time,
          check_out_time: a.check_out_time,
          late_minutes: a.late_minutes,
          confirmed_by: a.confirmed_by,
          teacher_note: a.teacher_note,
          admin_note: a.admin_note,
        }))
        setTodayAttendance(formatted)
      }
    } catch (e) {
      toast.error('فشل تحميل الحضور')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      const res = await api.post('/attendance/check-out')
      toast.success(res.data.message)
      fetchToday()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleConfirmAll = async () => {
    if (!confirm(`تأكيد حضور كل المعلمين لتاريخ ${selectedDate}؟`)) return
    try {
      const res = await api.post('/attendance/confirm-bulk', { date: selectedDate })
      toast.success(res.data.message)
      fetchToday()
    } catch (e) {
      toast.error('فشل التأكيد')
    }
  }

  const fetchMonthlyReport = async () => {
    try {
      const [year, month] = selectedMonth.split('-')
      const res = await api.get('/attendance/report/monthly', {
        params: { year, month },
      })
      setMonthlyReport(res.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    }
  }

  const openReport = () => {
    setShowReport(true)
    fetchMonthlyReport()
  }

  const getStatusInfo = (status) => {
    return STATUSES.find((s) => s.value === status) || {
      label: 'لم يسجل', color: '#94A3B8', icon: '⏳',
    }
  }

  const myRecord = todayAttendance.find((a) => a.teacher_id === user?.id)

  const stats = {
    present: todayAttendance.filter((a) => a.status === 'present').length,
    late: todayAttendance.filter((a) => a.status === 'late').length,
    absent: todayAttendance.filter((a) => a.status === 'absent').length,
    total: todayAttendance.length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="text-primary-500" size={26} />
            الحضور والغياب
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isTeacher ? 'سجّل حضورك اليومي — القرار النهائي بيد المدير' : 'متابعة حضور المعلمين'}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {canViewReport && (
            <button onClick={openReport}
                    className="btn-ghost border-2 flex items-center gap-2"
                    style={{ borderColor: 'var(--border-color)' }}>
              <Calendar size={18} />
              تقرير شهري
            </button>
          )}

          {canConfirm && (
            <button onClick={handleConfirmAll}
                    className="btn-primary flex items-center gap-2">
              <ThumbsUp size={18} />
              تأكيد الكل
            </button>
          )}
        </div>
      </div>

      {/* بطاقة المعلم */}
      {isTeacher && (
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">📅 حضورك اليوم</h3>
          {myRecord?.status ? (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                   style={{ background: `${getStatusInfo(myRecord.status).color}20` }}>
                {getStatusInfo(myRecord.status).icon}
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="text-lg font-bold"
                   style={{ color: getStatusInfo(myRecord.status).color }}>
                  {getStatusInfo(myRecord.status).label}
                </p>
                {myRecord.check_in_time && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    وقت الدخول: <span dir="ltr">{myRecord.check_in_time}</span>
                  </p>
                )}
                {myRecord.check_out_time && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    وقت الخروج: <span dir="ltr">{myRecord.check_out_time}</span>
                  </p>
                )}
                {myRecord.teacher_note && (
                  <p className="text-xs mt-1 p-2 rounded-lg"
                     style={{ background: 'rgba(99,102,241,0.08)' }}>
                    📝 عذرك: {myRecord.teacher_note}
                  </p>
                )}
                {myRecord.admin_note && (
                  <p className="text-xs mt-1 p-2 rounded-lg"
                     style={{ background: 'rgba(16,185,129,0.08)' }}>
                    👤 رد المدير: {myRecord.admin_note}
                  </p>
                )}
              </div>
              {!myRecord.check_out_time && (
                <button onClick={handleCheckOut}
                        className="btn-ghost text-red-500 border-2 flex-shrink-0"
                        style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                  تسجيل خروج
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                لم تسجل حضورك اليوم بعد
              </p>
              <button onClick={() => setShowCheckIn(true)}
                      className="btn-primary !text-lg !py-3 !px-8">
                ✅ سجّل حضورك الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* إحصائيات */}
      {!isTeacher && (
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
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>حاضر</p>
                <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>تنبيه تأخير</p>
                <p className="text-xl font-bold text-amber-500">{stats.late}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>غائب</p>
                <p className="text-xl font-bold text-red-500">{stats.absent}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium">التاريخ:</label>
        <input type="date" value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="input-modern !w-auto" />
        {selectedDate !== new Date().toISOString().split('T')[0] && (
          <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="btn-ghost !py-1 !px-3 !text-xs">
            → اليوم
          </button>
        )}
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : todayAttendance.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا يوجد معلمون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">المعلم</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">الدخول</th>
                  <th className="p-3 text-start">الخروج</th>
                  <th className="p-3 text-start">تنبيه التأخير</th>
                  <th className="p-3 text-start">العذر</th>
                  <th className="p-3 text-start">التأكيد</th>
                  {canConfirm && <th className="p-3 text-center">إجراء</th>}
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map((a, i) => {
                  const statusInfo = a.status ? getStatusInfo(a.status) : null
                  return (
                    <tr key={a.teacher_id}
                        className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3 font-semibold">{a.teacher_name}</td>
                      <td className="p-3">
                        {statusInfo ? (
                          <span className="badge" style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                            {statusInfo.icon} {statusInfo.label}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(148,163,184,0.2)', color: '#94A3B8' }}>
                            ⏳ لم يسجل
                          </span>
                        )}
                      </td>
                      <td className="p-3" dir="ltr">{a.check_in_time || '—'}</td>
                      <td className="p-3" dir="ltr">{a.check_out_time || '—'}</td>
                      <td className="p-3">
                        {a.late_minutes > 0 ? (
                          <span className="badge-warning text-xs">
                            ⏰ {a.late_minutes} دقيقة
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 max-w-[200px]">
                        {a.teacher_note ? (
                          <span className="text-xs" title={a.teacher_note}>
                            {a.teacher_note.length > 40 ? a.teacher_note.substring(0, 40) + '...' : a.teacher_note}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3">
                        {a.confirmed_by ? (
                          <span className="badge-success text-xs">✓ مؤكد</span>
                        ) : (
                          <span className="badge-warning text-xs">⏳ ينتظر</span>
                        )}
                      </td>
                      {canConfirm && (
                        <td className="p-3">
                          <div className="flex justify-center">
                            <button
                              onClick={() => setEditModal(a)}
                              className="btn-ghost !p-2 text-blue-500"
                              title="مراجعة واعتماد"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة تسجيل الحضور (للمعلم) */}
      {showCheckIn && (
        <TeacherCheckInModal
          onClose={() => setShowCheckIn(false)}
          onSuccess={fetchToday}
        />
      )}

      {/* نافذة مراجعة المدير */}
      {editModal && (
        <AdminReviewModal
          record={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchToday() }}
        />
      )}

      {/* تقرير شهري */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="text-primary-500" size={22} />
                تقرير الحضور الشهري
              </h3>
              <button onClick={() => setShowReport(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 border-b flex gap-3 items-center flex-wrap"
                 style={{ borderColor: 'var(--border-color)' }}>
              <label className="text-sm font-medium">الشهر:</label>
              <input type="month" value={selectedMonth}
                     onChange={(e) => setSelectedMonth(e.target.value)}
                     className="input-modern !w-auto" />
              <button onClick={fetchMonthlyReport} className="btn-primary !py-2">تحديث</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {!monthlyReport ? (
                <p className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
              ) : monthlyReport.report.length === 0 ? (
                <p className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>لا توجد بيانات</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="p-3 text-start">المعلم</th>
                      <th className="p-3 text-center">حاضر</th>
                      <th className="p-3 text-center">متأخر</th>
                      <th className="p-3 text-center">غائب</th>
                      <th className="p-3 text-center">مرضية</th>
                      <th className="p-3 text-center">سنوية</th>
                      <th className="p-3 text-center">دقائق تأخير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.report.map((r) => (
                      <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-3 font-semibold">{r.full_name}</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">{r.present_days}</td>
                        <td className="p-3 text-center text-amber-500 font-bold">{r.late_days}</td>
                        <td className="p-3 text-center text-red-500 font-bold">{r.absent_days}</td>
                        <td className="p-3 text-center text-blue-500 font-bold">{r.sick_days}</td>
                        <td className="p-3 text-center text-purple-500 font-bold">{r.annual_days}</td>
                        <td className="p-3 text-center font-bold">{r.total_late_minutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// نافذة مراجعة المدير
// ============================================
function AdminReviewModal({ record, onClose, onSuccess }) {
  const [status, setStatus] = useState(record.status || 'present')
  const [adminNote, setAdminNote] = useState(record.admin_note || '')
  const [loading, setLoading] = useState(false)

  const statusInfo = STATUSES.find((s) => s.value === status)

  const handleSave = async () => {
    setLoading(true)
    try {
      if (record.id) {
        await api.put(`/attendance/${record.id}`, {
          status,
          admin_note: adminNote,
        })
        toast.success('تم الاعتماد')
      } else {
        // إنشاء سجل من قبل المدير
        await api.post('/attendance/mark', {
          teacher_id: record.teacher_id,
          date: record.date || new Date().toISOString().split('T')[0],
          status,
        })
        toast.success('تم التسجيل')
      }
      onSuccess()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold">مراجعة حضور: {record.teacher_name}</h3>
          <button onClick={onClose} className="btn-ghost !p-2 text-red-500">
            <X size={20} />
          </button>
        </div>

        {/* معلومات أساسية */}
        <div className="mb-4 p-3 rounded-xl text-sm space-y-1.5"
             style={{ background: 'rgba(99,102,241,0.08)' }}>
          {record.check_in_time && (
            <div>🕐 <strong>الدخول:</strong> <span dir="ltr">{record.check_in_time}</span></div>
          )}
          {record.check_out_time && (
            <div>🕕 <strong>الخروج:</strong> <span dir="ltr">{record.check_out_time}</span></div>
          )}
          {record.late_minutes > 0 && (
            <div className="text-amber-600">
              ⏰ <strong>تنبيه تأخير:</strong> {record.late_minutes} دقيقة
            </div>
          )}
          {record.teacher_note && (
            <div className="p-2 rounded-lg mt-2"
                 style={{ background: 'rgba(255,255,255,0.5)' }}>
              📝 <strong>عذر المعلم:</strong> {record.teacher_note}
            </div>
          )}
        </div>

        {/* تعديل الحالة */}
        <div className="mb-4">
          <label className="text-sm font-medium block mb-2">الحالة المعتمدة:</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {STATUSES.slice(0, 6).map((s) => {
              const isActive = status === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className="p-2.5 rounded-xl border-2 transition-all flex items-center gap-2 justify-center"
                  style={{
                    borderColor: isActive ? s.color : 'var(--border-color)',
                    background: isActive ? `${s.color}15` : 'var(--bg-card)',
                    color: isActive ? s.color : 'var(--text-primary)',
                  }}
                >
                  <span>{s.icon}</span>
                  <span className="text-xs font-medium">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ملاحظة المدير */}
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1.5">
            ملاحظة المدير (اختياري)
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="input-modern"
            rows="2"
            placeholder="مثال: العذر مقبول - لا خصم"
          />
        </div>

        <div className="p-3 rounded-xl mb-5 text-xs"
             style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>
          💡 <strong>الخصم لا يُحسب تلقائياً.</strong> قرار الخصم يبقى بيدك عند حساب الراتب.
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={loading}
                  className="btn-primary flex-1">
            {loading ? 'جاري الحفظ...' : 'اعتماد الحضور'}
          </button>
          <button onClick={onClose} className="btn-ghost">إلغاء</button>
        </div>
      </div>
    </div>
  )
}