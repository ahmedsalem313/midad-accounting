import { useState, useEffect } from 'react'
import {
  Wallet, AlertCircle, Send, Clock, X, CheckSquare, Square,
  Users, DollarSign, Calendar, Ban, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function FeeReminders() {
  const { hasPermission } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageTemplate, setMessageTemplate] = useState('')
  const [showDelayModal, setShowDelayModal] = useState(false)
  const [delayStudent, setDelayStudent] = useState(null)
  const [delayForm, setDelayForm] = useState({ excluded_until: '', reason: '' })
  const [maxPerSession, setMaxPerSession] = useState(50)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/fee-reminders/outstanding')
      setData(res.data.data)
      // حدّد الكل افتراضيًا (غير المؤجلين)
      const ready = res.data.data.students.filter((s) => !s.exclusion).map((s) => s.id)
      setSelected(new Set(ready))
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const toggleStudent = (id) => {
    const newSet = new Set(selected)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelected(newSet)
  }

  const toggleAll = () => {
    if (selected.size === data.students.filter((s) => !s.exclusion).length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.students.filter((s) => !s.exclusion).map((s) => s.id)))
    }
  }

  const handleSend = () => {
    if (selected.size === 0) {
      toast.error('اختر طالبًا واحدًا على الأقل')
      return
    }
    setShowMessageModal(true)
  }

  const confirmSend = async () => {
    setShowMessageModal(false)
    setSending(true)
    try {
      const res = await api.post('/fee-reminders/send', {
        student_ids: Array.from(selected),
        message_template: messageTemplate || undefined,
        max_per_session: maxPerSession,
      })
      toast.success(res.data.message)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الإرسال')
    } finally {
      setSending(false)
    }
  }

  const openDelay = (student) => {
    setDelayStudent(student)
    // افتراضيًا: 30 يومًا من اليوم
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setDelayForm({
      excluded_until: d.toISOString().split('T')[0],
      reason: '',
    })
    setShowDelayModal(true)
  }

  const confirmDelay = async () => {
    if (!delayForm.excluded_until) {
      toast.error('حدّد تاريخ التأجيل')
      return
    }
    try {
      await api.post('/fee-reminders/exclude', {
        student_id: delayStudent.id,
        excluded_until: delayForm.excluded_until,
        reason: delayForm.reason,
      })
      toast.success('تم تأجيل الإشعار')
      setShowDelayModal(false)
      fetchData()
    } catch (e) {
      toast.error('فشل التأجيل')
    }
  }

  const handleCancelDelay = async (student) => {
    if (!confirm(`إلغاء تأجيل "${student.full_name}"؟`)) return
    try {
      await api.delete(`/fee-reminders/exclude/${student.id}`)
      toast.success('تم إلغاء التأجيل')
      fetchData()
    } catch (e) {
      toast.error('فشل')
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) return null

  const { students, stats } = data
  const selectedCount = selected.size
  const readyStudents = students.filter((s) => !s.exclusion)
  const allSelected = selectedCount === readyStudents.length && readyStudents.length > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="text-primary-500" size={26} />
            تذكيرات الأقساط
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إرسال تذكيرات لأولياء الأمور المُتأخرين
          </p>
        </div>

        {hasPermission('whatsapp.fees') && (
          <button onClick={handleSend} disabled={sending || selectedCount === 0}
                  className="btn-primary flex items-center gap-2">
            <Send size={18} />
            {sending ? 'جاري الإرسال...' : `إرسال (${selectedCount})`}
          </button>
        )}
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>عدد المتأخرين</p>
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
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>جاهز للإرسال</p>
              <p className="text-xl font-bold text-emerald-600">{stats.ready_to_send}</p>
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
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مؤجّلون</p>
              <p className="text-xl font-bold text-amber-500">{stats.excluded}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <DollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي المتأخرات</p>
              <p className="text-sm font-bold text-primary-600 truncate">
                {fmt(stats.total_remaining)} د.ع
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {students.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-bold">لا يوجد متأخرون 🎉</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              كل الأقساط محصّلة
            </p>
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
                  <th className="p-3 text-start">المتبقي</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isDelayed = !!s.exclusion
                  const isSelected = selected.has(s.id)

                  return (
                    <tr key={s.id}
                        className="border-b transition-colors"
                        style={{
                          borderColor: 'var(--border-color)',
                          opacity: isDelayed ? 0.6 : 1,
                        }}>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => !isDelayed && toggleStudent(s.id)}
                          disabled={isDelayed}
                          className="btn-ghost !p-1 disabled:cursor-not-allowed">
                          {isSelected ? (
                            <CheckSquare size={18} className="text-primary-500" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-semibold">
                        {s.full_name}
                      </td>
                      <td className="p-3 text-xs">
                        {s.grade} {s.section && `- ${s.section}`}
                      </td>
                      <td className="p-3 text-xs">{s.guardian_name}</td>
                      <td className="p-3 text-xs" dir="ltr">{s.guardian_phone}</td>
                      <td className="p-3 font-bold text-red-500">
                        {fmt(s.remaining)} د.ع
                      </td>
                      <td className="p-3 text-center">
                        {isDelayed ? (
                          <span className="badge-warning text-xs" title={s.exclusion.reason || ''}>
                            ⏳ مؤجل حتى {s.exclusion.until}
                          </span>
                        ) : isSelected ? (
                          <span className="badge-info text-xs">✓ مُحدد</span>
                        ) : (
                          <span className="badge-success text-xs">جاهز</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isDelayed ? (
                          <button
                            onClick={() => handleCancelDelay(s)}
                            className="btn-ghost !py-1 !px-2 !text-xs text-blue-500">
                            إلغاء التأجيل
                          </button>
                        ) : (
                          <button
                            onClick={() => openDelay(s)}
                            className="btn-ghost !py-1 !px-2 !text-xs text-amber-500 flex items-center gap-1 mx-auto">
                            <Ban size={12} />
                            تأجيل
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: تأكيد الإرسال */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">تأكيد الإرسال</h3>
              <button onClick={() => setShowMessageModal(false)} className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.08)' }}>
                <p className="text-sm">
                  <strong>عدد المحددين:</strong> {selectedCount} طالب
                </p>
                <p className="text-sm mt-1">
                  <strong>الحد الأقصى للجلسة:</strong> {maxPerSession} رسالة
                </p>
                {selectedCount > maxPerSession && (
                  <p className="text-xs mt-2 text-amber-600">
                    ⚠️ سيُرسل أول {maxPerSession} فقط، والباقي في المرة التالية
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  الحد الأقصى في هذه الجلسة
                </label>
                <input
                  type="number"
                  value={maxPerSession}
                  onChange={(e) => setMaxPerSession(parseInt(e.target.value) || 50)}
                  className="input-modern"
                  min="1" max="200"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  نص الرسالة (اتركه فارغًا للافتراضي)
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="input-modern"
                  rows="8"
                  placeholder={`عزيزي ولي الأمر {اسم_ولي_الأمر}،

نود تذكيركم بأن القسط المتبقي للطالب {اسم_الطالب} هو:

💰 {المبلغ_المتبقي} د.ع

يرجى تسوية المبلغ في أقرب وقت.

شكرًا لتعاونكم.
{اسم_المدرسة}`}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  متغيرات: {'{اسم_الطالب}'} — {'{اسم_ولي_الأمر}'} — {'{المبلغ_المتبقي}'} — {'{الصف}'} — {'{اسم_المدرسة}'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button onClick={confirmSend} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Send size={18} />
                إرسال الآن
              </button>
              <button onClick={() => setShowMessageModal(false)} className="btn-ghost">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تأجيل */}
      {showDelayModal && delayStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">تأجيل الإشعار</h3>
              <button onClick={() => setShowDelayModal(false)} className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.08)' }}>
                <p className="text-sm font-bold">{delayStudent.full_name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {delayStudent.guardian_name} — {delayStudent.guardian_phone}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  تأجيل حتى تاريخ <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={delayForm.excluded_until}
                  onChange={(e) => setDelayForm({ ...delayForm, excluded_until: e.target.value })}
                  className="input-modern"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">السبب (اختياري)</label>
                <textarea
                  value={delayForm.reason}
                  onChange={(e) => setDelayForm({ ...delayForm, reason: e.target.value })}
                  className="input-modern"
                  rows="3"
                  placeholder="مثال: ولي الأمر طلب تأجيلًا لظروف مادية"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button onClick={confirmDelay} className="btn-primary flex-1">
                تأكيد التأجيل
              </button>
              <button onClick={() => setShowDelayModal(false)} className="btn-ghost">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}