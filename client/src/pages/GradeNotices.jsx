import { useState, useEffect } from 'react'
import {
  GraduationCap, Send, X, CheckSquare, Square, Users, Calendar,
  CheckCircle, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getGradesByType, getCurrentSchoolType } from '../utils/schoolData'

export default function GradeNotices() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [days, setDays] = useState(7)
  const [filterGrade, setFilterGrade] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [messageTemplate, setMessageTemplate] = useState('')
  const [maxPerSession, setMaxPerSession] = useState(50)

  useEffect(() => {
    fetchData()
  }, [days, filterGrade])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = { days }
      if (filterGrade) params.grade = filterGrade
      const res = await api.get('/grade-notices/recent', { params })
      setData(res.data.data)

      const pending = res.data.data.students.filter((s) => !s.recently_sent).map((s) => s.student_id)
      setSelected(new Set(pending))
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id) => {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelected(s)
  }

  const toggleAll = () => {
    const pending = data.students.filter((s) => !s.recently_sent).map((s) => s.student_id)
    if (selected.size === pending.length) setSelected(new Set())
    else setSelected(new Set(pending))
  }

  const confirmSend = async () => {
    setShowModal(false)
    setSending(true)
    try {
      const res = await api.post('/grade-notices/send', {
        student_ids: Array.from(selected),
        message_template: messageTemplate || undefined,
        max_per_session: maxPerSession,
        days,
      })
      toast.success(res.data.message)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الإرسال')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) return null

  const { students, stats } = data
  const pending = students.filter((s) => !s.recently_sent)
  const allSelected = selected.size === pending.length && pending.length > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="text-primary-500" size={26} />
            إشعارات الدرجات
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إرسال إشعار لأولياء أمور الطلاب الذين أُضيفت لهم درجات حديثة
          </p>
        </div>

        {hasPermission('whatsapp.grades') && (
          <button onClick={() => setShowModal(true)} disabled={sending || selected.size === 0}
                  className="btn-primary flex items-center gap-2">
            <Send size={18} />
            {sending ? 'جاري الإرسال...' : `إرسال (${selected.size})`}
          </button>
        )}
      </div>

      {/* الفلتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
        <span className="text-sm font-medium">آخر</span>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
                className="input-modern !w-auto">
          <option value={1}>يوم واحد</option>
          <option value={3}>3 أيام</option>
          <option value={7}>7 أيام</option>
          <option value={30}>30 يوم</option>
        </select>

        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
                className="input-modern !w-auto min-w-[180px]">
          <option value="">كل الصفوف</option>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>عدد الطلاب</p>
              <p className="text-xl font-bold">{stats.total}</p>
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
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>بانتظار الإرسال</p>
              <p className="text-xl font-bold text-amber-500">{stats.pending}</p>
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
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>أُرسل مؤخرًا</p>
              <p className="text-xl font-bold text-emerald-600">{stats.sent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {students.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-bold">لا توجد درجات جديدة في هذه الفترة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-center w-12">
                    <button onClick={toggleAll} className="btn-ghost !p-1">
                      {allSelected ? <CheckSquare size={18} className="text-primary-500" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-start">ولي الأمر</th>
                  <th className="p-3 text-start">الهاتف</th>
                  <th className="p-3 text-center">عدد الدرجات</th>
                  <th className="p-3 text-center">آخر إضافة</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.student_id} className="border-b"
                      style={{ borderColor: 'var(--border-color)', opacity: s.recently_sent ? 0.6 : 1 }}>
                    <td className="p-3 text-center">
                      <button onClick={() => !s.recently_sent && toggle(s.student_id)}
                              disabled={s.recently_sent}
                              className="btn-ghost !p-1 disabled:cursor-not-allowed">
                        {selected.has(s.student_id) ? (
                          <CheckSquare size={18} className="text-primary-500" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-semibold">
                      {s.gender === 'female' ? '👧' : '👦'} {s.full_name}
                    </td>
                    <td className="p-3 text-xs">
                      {s.grade} {s.section && `- ${s.section}`}
                    </td>
                    <td className="p-3 text-xs">{s.guardian_name}</td>
                    <td className="p-3 text-xs" dir="ltr">{s.guardian_phone}</td>
                    <td className="p-3 text-center">
                      <span className="badge-info">{s.grades_count} درجة</span>
                    </td>
                    <td className="p-3 text-center text-xs" dir="ltr">
                      {new Date(s.last_grade_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-3 text-center">
                      {s.recently_sent ? (
                        <span className="badge-success text-xs">✅ أُرسل</span>
                      ) : selected.has(s.student_id) ? (
                        <span className="badge-info text-xs">✓ مُحدد</span>
                      ) : (
                        <span className="badge-warning text-xs">جاهز</span>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">تأكيد إرسال إشعارات الدرجات</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                <p className="text-sm"><strong>عدد المحددين:</strong> {selected.size} طالب</p>
                <p className="text-sm mt-1"><strong>الحد الأقصى للجلسة:</strong> {maxPerSession} رسالة</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">الحد الأقصى في هذه الجلسة</label>
                <input type="number" value={maxPerSession}
                       onChange={(e) => setMaxPerSession(parseInt(e.target.value) || 50)}
                       className="input-modern" min="1" max="200" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">نص الرسالة (فارغ = افتراضي)</label>
                <textarea value={messageTemplate}
                          onChange={(e) => setMessageTemplate(e.target.value)}
                          className="input-modern" rows="10"
                          placeholder={`عزيزي ولي الأمر {اسم_ولي_الأمر}،

نود إعلامكم بالدرجات الجديدة للطالب {اسم_الطالب}:

{الدرجات}

شكرًا لتعاونكم.
{اسم_المدرسة}`} />
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  متغيرات: {'{اسم_الطالب}'} — {'{اسم_ولي_الأمر}'} — {'{الصف}'} — {'{الدرجات}'} — {'{اسم_المدرسة}'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button onClick={confirmSend} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Send size={18} />
                إرسال الآن
              </button>
              <button onClick={() => setShowModal(false)} className="btn-ghost">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}