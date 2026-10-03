import { useState, useEffect, useMemo } from 'react'
import {
  Plus, X, Calendar as CalendarIcon, Trash2, Edit2, Save,
  ChevronRight, ChevronLeft, Filter, Star, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday,
  addMonths, subMonths
} from 'date-fns'
import { ar } from 'date-fns/locale'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const EVENT_TYPES = [
  { value: 'event',    label: 'حدث عام',   icon: '📌', color: '#6366F1' },
  { value: 'exam',     label: 'امتحان',    icon: '📝', color: '#EF4444' },
  { value: 'holiday',  label: 'عطلة',      icon: '🎉', color: '#10B981' },
  { value: 'meeting',  label: 'اجتماع',    icon: '👥', color: '#F59E0B' },
  { value: 'activity', label: 'نشاط',      icon: '🎨', color: '#8B5CF6' },
  { value: 'deadline', label: 'موعد نهائي',icon: '⏰', color: '#DC2626' },
]

const getTypeInfo = (type) =>
  EVENT_TYPES.find((t) => t.value === type) || EVENT_TYPES[0]

export default function Calendar() {
  const { hasPermission } = useAuth()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [stats, setStats] = useState({ totalEvents: 0, holidays: 0, exams: 0 })
  const [upcoming, setUpcoming] = useState([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'event',
    start_date: '',
    end_date: '',
    is_holiday: false,
    color: '#6366F1',
    visible_to_parents: true,
  })

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const params = { year, month }
      if (filterType) params.type = filterType

      const res = await api.get('/calendar', { params })
      setEvents(res.data.data || [])
    } catch (e) {
      toast.error('فشل تحميل الأحداث')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const year = currentDate.getFullYear()
      const res = await api.get('/calendar/stats', { params: { year } })
      setStats(res.data.data)
    } catch (e) {
      console.error('فشل تحميل الإحصائيات:', e)
    }
  }
  const fetchUpcoming = async () => {
    try {
      const res = await api.get('/calendar/upcoming', { params: { limit: 20 } })
      setUpcoming(res.data.data || [])
    } catch (e) {
      console.error('فشل تحميل الأحداث القادمة:', e)
    }
  }
   useEffect(() => {
    fetchEvents()
    fetchStats()
    fetchUpcoming()
  }, [currentDate, filterType])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 6 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentDate])

  const getEventsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return events.filter((ev) => {
      const start = ev.start_date
      const end = ev.end_date || ev.start_date
      return dayStr >= start && dayStr <= end
    })
  }

  const openAddModal = (day = null) => {
    const dateStr = day ? format(day, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    setEditingEvent(null)
    setFormData({
      title: '',
      description: '',
      type: 'event',
      start_date: dateStr,
      end_date: '',
      is_holiday: false,
      color: '#6366F1',
      visible_to_parents: true,
    })
    setShowModal(true)
  }

  const openEditModal = (ev) => {
    setEditingEvent(ev)
    setFormData({
      title: ev.title || '',
      description: ev.description || '',
      type: ev.type || 'event',
      start_date: ev.start_date || '',
      end_date: ev.end_date || '',
      is_holiday: !!ev.is_holiday,
      color: ev.color || '#6366F1',
      visible_to_parents: ev.visible_to_parents !== 0,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.start_date) {
      toast.error('العنوان والتاريخ مطلوبان')
      return
    }

    try {
      if (editingEvent) {
        await api.put(`/calendar/${editingEvent.id}`, formData)
        toast.success('تم تحديث الحدث')
      } else {
        await api.post('/calendar', formData)
        toast.success('تم إضافة الحدث')
      }
      setShowModal(false)
      fetchEvents()
      fetchStats()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleDelete = async (ev) => {
    if (!confirm(`حذف "${ev.title}"؟`)) return
    try {
      await api.delete(`/calendar/${ev.id}`)
      toast.success('تم الحذف')
      fetchEvents()
      fetchStats()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const goToday = () => setCurrentDate(new Date())
  const goPrev = () => setCurrentDate(subMonths(currentDate, 1))
  const goNext = () => setCurrentDate(addMonths(currentDate, 1))

  const dayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-primary-500" size={26} />
            التقويم الأكاديمي
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إدارة الأحداث والامتحانات والعطلات
          </p>
        </div>

        {hasPermission('calendar.create') && (
          <button onClick={() => openAddModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة حدث
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
               style={{ background: 'rgba(99,102,241,0.1)' }}>📅</div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الأحداث</p>
            <p className="text-2xl font-bold">{stats.totalEvents}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
               style={{ background: 'rgba(239,68,68,0.1)' }}>📝</div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الامتحانات</p>
            <p className="text-2xl font-bold">{stats.exams}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
               style={{ background: 'rgba(16,185,129,0.1)' }}>🎉</div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>العطلات</p>
            <p className="text-2xl font-bold">{stats.holidays}</p>
          </div>
        </div>
      </div>
      {/* الأحداث القادمة */}
      {upcoming.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔔</span>
            <h3 className="text-lg font-bold">الأحداث القادمة</h3>
            <span className="badge-info text-xs">{upcoming.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((ev) => {
              const info = getTypeInfo(ev.type)
              const daysLeft = Math.ceil(
                (new Date(ev.start_date) - new Date()) / (1000 * 60 * 60 * 24)
              )
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    setCurrentDate(new Date(ev.start_date))
                    setSelectedDay(new Date(ev.start_date))
                  }}
                  className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: `${ev.color || info.color}10`,
                    borderInlineStart: `4px solid ${ev.color || info.color}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{info.icon}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: daysLeft <= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                        color: daysLeft <= 3 ? '#DC2626' : '#4338CA',
                      }}
                    >
                      {daysLeft === 0
                        ? 'اليوم'
                        : daysLeft === 1
                        ? 'غدًا'
                        : `بعد ${daysLeft} يوم`}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm truncate">{ev.title}</h4>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {format(new Date(ev.start_date), 'EEEE d MMMM', { locale: ar })}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="btn-ghost !p-2">
            <ChevronRight size={20} />
          </button>
          <h3 className="text-lg font-bold min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ar })}
          </h3>
          <button onClick={goNext} className="btn-ghost !p-2">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goToday} className="btn-ghost text-sm">
            اليوم
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-modern !w-auto !py-2 !text-sm"
          >
            <option value="">كل الأنواع</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b"
             style={{ borderColor: 'var(--border-color)' }}>
          {dayNames.map((d) => (
            <div key={d} className="p-3 text-center text-sm font-bold"
                 style={{ color: 'var(--text-secondary)' }}>
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDay(day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[110px] p-2 border-b border-e cursor-pointer transition-all hover:bg-primary-50/20 ${
                    !inMonth ? 'opacity-40' : ''
                  }`}
                  style={{
                    borderColor: 'var(--border-color)',
                    background: today ? 'rgba(99,102,241,0.08)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${today ? 'text-primary-500' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {today && <Star size={12} className="text-primary-500" />}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const info = getTypeInfo(ev.type)
                      return (
                        <div
                          key={ev.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate font-medium"
                          style={{
                            background: `${ev.color || info.color}20`,
                            color: ev.color || info.color,
                            borderInlineStart: `3px solid ${ev.color || info.color}`,
                          }}
                          title={ev.title}
                        >
                          {info.icon} {ev.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-center font-bold"
                           style={{ color: 'var(--text-secondary)' }}>
                        +{dayEvents.length - 3} آخر
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              📅 أحداث {format(selectedDay, 'EEEE d MMMM yyyy', { locale: ar })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="btn-ghost !p-2">
              <X size={18} />
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              <AlertCircle size={40} className="mx-auto mb-2 opacity-40" />
              <p>لا توجد أحداث في هذا اليوم</p>
              {hasPermission('calendar.create') && (
                <button onClick={() => openAddModal(selectedDay)} className="btn-primary mt-3">
                  <Plus size={16} className="inline me-1" />
                  إضافة حدث
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((ev) => {
                const info = getTypeInfo(ev.type)
                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.01]"
                    style={{
                      background: `${ev.color || info.color}10`,
                      borderInlineStart: `4px solid ${ev.color || info.color}`,
                    }}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {ev.description}
                        </p>
                      )}
                      <div className="text-xs mt-1 flex items-center gap-2"
                           style={{ color: 'var(--text-secondary)' }}>
                        <span>{info.label}</span>
                        {ev.is_holiday ? <span className="text-green-600">🎉 عطلة</span> : null}
                        {ev.visible_to_parents ? <span className="text-blue-600">👨‍👩‍👧 مرئي لأولياء الأمور</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {hasPermission('calendar.edit') && (
                        <button onClick={() => openEditModal(ev)} className="btn-ghost !p-2 text-blue-500">
                          <Edit2 size={16} />
                        </button>
                      )}
                      {hasPermission('calendar.delete') && (
                        <button onClick={() => handleDelete(ev)} className="btn-ghost !p-2 text-red-500">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingEvent ? 'تعديل الحدث' : 'إضافة حدث جديد'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 hover:bg-red-500/10 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  العنوان <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-modern"
                  placeholder="مثال: امتحان الرياضيات"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">الوصف (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-modern min-h-[80px]"
                  placeholder="تفاصيل إضافية..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    تاريخ البداية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ النهاية (اختياري)</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-modern"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">النوع</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.value, color: t.color })}
                      className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        formData.type === t.value ? 'scale-105' : 'opacity-60'
                      }`}
                      style={{
                        borderColor: formData.type === t.value ? t.color : 'var(--border-color)',
                        background: formData.type === t.value ? `${t.color}15` : 'transparent',
                      }}
                    >
                      <div className="text-lg">{t.icon}</div>
                      <div>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">اللون</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formData.color}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_holiday}
                    onChange={(e) => setFormData({ ...formData, is_holiday: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">🎉 يوم عطلة</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.visible_to_parents}
                    onChange={(e) => setFormData({ ...formData, visible_to_parents: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">👨‍👩‍👧 مرئي لأولياء الأمور</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingEvent ? 'حفظ التعديلات' : 'إضافة الحدث'}
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
