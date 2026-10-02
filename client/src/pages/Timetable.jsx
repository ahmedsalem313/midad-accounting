import { useState, useEffect } from 'react'
import {
  Plus, X, Calendar, Trash2, Users, Clock, Save, LayoutGrid
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType,
  getSubjectsForGrade, getSubjectByCode,
} from '../utils/schoolData'

// ============================================
// كل أيام الأسبوع
// ============================================
const ALL_DAYS = [
  { value: 0, label: 'السبت' },
  { value: 1, label: 'الأحد' },
  { value: 2, label: 'الاثنين' },
  { value: 3, label: 'الثلاثاء' },
  { value: 4, label: 'الأربعاء' },
  { value: 5, label: 'الخميس' },
  { value: 6, label: 'الجمعة' },
]

// قراءة الأيام المختارة من الإعدادات
function getWorkingDays() {
  const saved = localStorage.getItem('midad_working_days')
  const days = saved ? JSON.parse(saved) : [0, 1, 2, 3, 4, 5]
  return ALL_DAYS.filter((d) => days.includes(d.value))
}

const PERIODS = [
  { num: 1, start: '08:00', end: '08:45' },
  { num: 2, start: '08:45', end: '09:30' },
  { num: 3, start: '09:30', end: '10:15' },
  { num: 4, start: '10:35', end: '11:20' },
  { num: 5, start: '11:20', end: '12:05' },
  { num: 6, start: '12:05', end: '12:50' },
]

export default function Timetable() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)
  const DAYS = getWorkingDays()

  const [selectedGrade, setSelectedGrade] = useState(GRADES[0])
  const [selectedSection, setSelectedSection] = useState(SECTIONS[0])
  const [timetable, setTimetable] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [formData, setFormData] = useState({
    subject: '',
    teacher_id: '',
    room: '',
  })

  const subjects = getSubjectsForGrade(selectedGrade)

  useEffect(() => {
    fetchTeachers()
  }, [])

  useEffect(() => {
    if (selectedGrade && selectedSection) {
      fetchTimetable()
    }
  }, [selectedGrade, selectedSection])

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/users')
      const list = res.data.data.filter((u) => u.role === 'teacher' || u.role === 'admin')
      setTeachers(list)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchTimetable = async () => {
    try {
      setLoading(true)
      const res = await api.get('/timetable', {
        params: { grade: selectedGrade, section: selectedSection },
      })
      setTimetable(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل الجدول')
    } finally {
      setLoading(false)
    }
  }

  const openAddCell = (day, period) => {
    setEditingCell({ day, period })
    setFormData({ subject: subjects[0]?.code || '', teacher_id: '', room: '' })
    setShowModal(true)
  }

  const openEditCell = (entry) => {
    setEditingCell({ day: entry.day_of_week, period: entry.period, id: entry.id })
    setFormData({
      subject: entry.subject,
      teacher_id: entry.teacher_id,
      room: entry.room || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subject || !formData.teacher_id) {
      toast.error('يرجى اختيار المادة والمدرس')
      return
    }

    const periodInfo = PERIODS.find((p) => p.num === editingCell.period)

    const payload = {
      grade: selectedGrade,
      section: selectedSection,
      day_of_week: editingCell.day,
      period: editingCell.period,
      start_time: periodInfo.start,
      end_time: periodInfo.end,
      subject: formData.subject,
      teacher_id: parseInt(formData.teacher_id),
      room: formData.room,
    }

    try {
      if (editingCell.id) {
        await api.put(`/timetable/${editingCell.id}`, payload)
        toast.success('تم التحديث')
      } else {
        await api.post('/timetable', payload)
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      fetchTimetable()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleDelete = async (entry) => {
    if (!confirm('حذف هذه الحصة؟')) return
    try {
      await api.delete(`/timetable/${entry.id}`)
      toast.success('تم الحذف')
      fetchTimetable()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const handleClearAll = async () => {
    if (!confirm(`حذف الجدول كاملاً لصف ${selectedGrade} شعبة ${selectedSection}؟`)) return
    try {
      await api.delete(`/timetable/class/${selectedGrade}/${selectedSection}`)
      toast.success('تم حذف الجدول')
      fetchTimetable()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const getEntry = (day, period) => {
    return timetable.find((t) => t.day_of_week === day && t.period === period)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-primary-500" size={26} />
            جدول الحصص
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {schoolType === 'primary' ? '🎒 مدرسة ابتدائية' : '📚 مدرسة ثانوية'}
            {' • '}
            {DAYS.length} أيام دوام
          </p>
        </div>

        {hasPermission('timetable.edit') && timetable.length > 0 && (
          <button onClick={handleClearAll} className="btn-ghost text-red-500 border-2"
                  style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <Trash2 size={18} />
            حذف الجدول
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <LayoutGrid size={18} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-medium">الصف:</span>
        </div>

        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="input-modern !w-auto min-w-[180px]"
        >
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <span className="text-sm font-medium ms-2">الشعبة:</span>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="input-modern !w-auto min-w-[120px]"
        >
          {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
        </select>

        <div className="text-xs px-3 py-2 rounded-lg font-semibold ms-auto"
             style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
          {timetable.length} حصة مسجلة
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-start border-b font-bold sticky start-0 z-10"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', minWidth: '100px' }}>
                    <Clock size={16} className="inline me-1" />
                    الوقت
                  </th>
                  {DAYS.map((d) => (
                    <th key={d.value}
                        className="p-3 text-center border-b font-bold"
                        style={{ borderColor: 'var(--border-color)', minWidth: '140px' }}>
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p.num}>
                    <td className="p-2 border-b font-semibold sticky start-0"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <div className="text-xs">
                        <div>الحصة {p.num}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                          {p.start} - {p.end}
                        </div>
                      </div>
                    </td>

                    {DAYS.map((d) => {
                      const entry = getEntry(d.value, p.num)
                      const subject = entry ? getSubjectByCode(entry.subject) : null
                      const teacher = entry ? teachers.find((t) => t.id === entry.teacher_id) : null

                      return (
                        <td key={`${d.value}-${p.num}`}
                            className="p-1 border-b align-top"
                            style={{ borderColor: 'var(--border-color)' }}>
                          {entry ? (
                            <div className="p-2 rounded-lg cursor-pointer group relative transition-all hover:scale-[1.02]"
                                 style={{
                                   background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
                                   border: '1px solid rgba(99,102,241,0.3)',
                                 }}
                                 onClick={() => hasPermission('timetable.edit') && openEditCell(entry)}>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-lg">{subject?.icon}</span>
                                <span className="font-bold text-xs">{subject?.name}</span>
                              </div>
                              <div className="text-xs flex items-center gap-1"
                                   style={{ color: 'var(--text-secondary)' }}>
                                <Users size={11} />
                                {teacher?.full_name?.split(' ')[0] || 'غير محدد'}
                              </div>
                              {hasPermission('timetable.edit') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(entry)
                                  }}
                                  className="absolute top-1 end-1 opacity-0 group-hover:opacity-100 transition-opacity
                                             w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white">
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ) : (
                            hasPermission('timetable.create') && (
                              <button
                                onClick={() => openAddCell(d.value, p.num)}
                                className="w-full h-full min-h-[60px] rounded-lg border-2 border-dashed
                                           flex items-center justify-center text-xs transition-all
                                           hover:border-primary-500 hover:bg-primary-50/30"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                <Plus size={16} />
                              </button>
                            )
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingCell?.id ? 'تعديل الحصة' : 'إضافة حصة'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 hover:bg-red-500/10 text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-3"
                 style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Calendar size={18} style={{ color: '#6366F1' }} />
              <div>
                <strong>{ALL_DAYS.find((d) => d.value === editingCell.day)?.label}</strong>
                {' — '}
                <strong>الحصة {editingCell.period}</strong>
                <span className="text-xs ms-2" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                  ({PERIODS.find((p) => p.num === editingCell.period)?.start}
                  - {PERIODS.find((p) => p.num === editingCell.period)?.end})
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  المادة <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input-modern"
                  required
                >
                  <option value="">اختر المادة...</option>
                  {subjects.map((s) => (
                    <option key={s.code} value={s.code}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  المدرس <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="input-modern"
                  required
                >
                  <option value="">اختر المدرس...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">القاعة (اختياري)</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="input-modern"
                  placeholder="مثال: قاعة 1"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingCell?.id ? 'حفظ التعديلات' : 'إضافة الحصة'}
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