import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, RotateCcw, Clock, Calendar, Coffee } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const ALL_DAYS = [
  { value: 0, label: 'السبت' },
  { value: 1, label: 'الأحد' },
  { value: 2, label: 'الاثنين' },
  { value: 3, label: 'الثلاثاء' },
  { value: 4, label: 'الأربعاء' },
  { value: 5, label: 'الخميس' },
  { value: 6, label: 'الجمعة' },
]

export default function TimetableSettings() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    academic_year: '2025-2026',
    working_days: [0, 1, 2, 3, 4, 5],
    periods_per_day: 6,
    period_duration: 45,
    day_start_time: '08:00',
    breaks: [],
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/timetable-settings')
      setForm(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (dayValue) => {
    setForm((prev) => {
      const days = prev.working_days.includes(dayValue)
        ? prev.working_days.filter((d) => d !== dayValue)
        : [...prev.working_days, dayValue].sort((a, b) => a - b)
      return { ...prev, working_days: days }
    })
  }

  const addBreak = () => {
    setForm((prev) => ({
      ...prev,
      breaks: [...prev.breaks, { after_period: 3, minutes: 20 }],
    }))
  }

  const updateBreak = (index, field, value) => {
    setForm((prev) => {
      const breaks = [...prev.breaks]
      breaks[index] = { ...breaks[index], [field]: parseInt(value) || 0 }
      return { ...prev, breaks }
    })
  }

  const removeBreak = (index) => {
    setForm((prev) => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (form.working_days.length === 0) {
      toast.error('اختر يوم عمل واحدًا على الأقل')
      return
    }
    try {
      setSaving(true)
      await api.put('/timetable-settings', form)
      toast.success('تم حفظ الإعدادات')
      fetchSettings()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('إعادة تعيين الإعدادات إلى الافتراضية؟')) return
    try {
      const res = await api.post('/timetable-settings/reset')
      setForm(res.data.data)
      toast.success('تمت إعادة التعيين')
    } catch (e) {
      toast.error('فشل')
    }
  }

  // حساب الفترات الزمنية للعرض
  const computePeriodTimes = () => {
    const periods = []
    let [h, m] = form.day_start_time.split(':').map(Number)
    for (let i = 1; i <= form.periods_per_day; i++) {
      const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      m += form.period_duration
      h += Math.floor(m / 60)
      m = m % 60
      const end = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      periods.push({ num: i, start, end })

      // إن كان هناك فسحة بعد هذه الحصة
      const brk = form.breaks.find((b) => b.after_period === i)
      if (brk) {
        m += brk.minutes
        h += Math.floor(m / 60)
        m = m % 60
      }
    }
    return periods
  }

  const periodTimes = computePeriodTimes()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="text-primary-500" size={26} />
            إعدادات الجدول الدراسي
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            اضبط أيام العمل، عدد الحصص، المدة، والفسح
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-ghost border-2 flex items-center gap-2"
                  style={{ borderColor: 'var(--border-color)' }}>
            <RotateCcw size={18} />
            إعادة تعيين
          </button>
          {hasPermission('timetable.edit') && (
            <button onClick={handleSave} disabled={saving}
                    className="btn-primary flex items-center gap-2">
              <Save size={18} />
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          )}
        </div>
      </div>

      {/* السنة الدراسية */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Calendar size={18} /> السنة الدراسية
        </h3>
        <input
          type="text"
          value={form.academic_year}
          onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
          className="input-modern"
          placeholder="مثال: 2025-2026"
        />
      </div>

      {/* أيام العمل */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Calendar size={18} /> أيام العمل
        </h3>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {ALL_DAYS.map((day) => {
            const isActive = form.working_days.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className="p-3 rounded-xl border-2 transition-all text-center font-medium"
                style={{
                  borderColor: isActive ? '#6366F1' : 'var(--border-color)',
                  background: isActive ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
                  color: isActive ? '#6366F1' : 'var(--text-secondary)',
                }}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* إعدادات الحصص */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Clock size={18} /> إعدادات الحصص
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">عدد الحصص يوميًا</label>
            <input
              type="number"
              min="1"
              max="12"
              value={form.periods_per_day}
              onChange={(e) => setForm({ ...form, periods_per_day: parseInt(e.target.value) || 1 })}
              className="input-modern"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">مدة الحصة (دقيقة)</label>
            <input
              type="number"
              min="20"
              max="120"
              value={form.period_duration}
              onChange={(e) => setForm({ ...form, period_duration: parseInt(e.target.value) || 45 })}
              className="input-modern"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">وقت بداية الدوام</label>
            <input
              type="time"
              value={form.day_start_time}
              onChange={(e) => setForm({ ...form, day_start_time: e.target.value })}
              className="input-modern"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* الفسح */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Coffee size={18} /> الفسح
          </h3>
          <button onClick={addBreak} className="btn-ghost border-2 flex items-center gap-2"
                  style={{ borderColor: 'var(--border-color)' }}>
            + إضافة فسحة
          </button>
        </div>

        {form.breaks.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            لا توجد فسح
          </p>
        ) : (
          <div className="space-y-3">
            {form.breaks.map((brk, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.05)' }}>
                <span className="text-sm">بعد الحصة</span>
                <input
                  type="number"
                  min="1"
                  max={form.periods_per_day}
                  value={brk.after_period}
                  onChange={(e) => updateBreak(i, 'after_period', e.target.value)}
                  className="input-modern !w-20"
                />
                <span className="text-sm">مدة الفسحة (دقيقة)</span>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={brk.minutes}
                  onChange={(e) => updateBreak(i, 'minutes', e.target.value)}
                  className="input-modern !w-24"
                />
                <button onClick={() => removeBreak(i)}
                        className="btn-ghost !p-2 text-red-500 ms-auto">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* معاينة الجدول الزمني */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Clock size={18} /> معاينة الفترات الزمنية
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {periodTimes.map((p) => (
            <div key={p.num} className="p-3 rounded-xl text-center border-2"
                 style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
              <div className="font-bold text-sm mb-1">الحصة {p.num}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                {p.start} - {p.end}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}