import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Plus, Search, Edit, Trash2, X, Save,
  AlertCircle, CheckCircle, Heart, Star, Pin, PinOff,
  Eye, EyeOff, User, Phone, ArrowRight, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// تصنيفات الملاحظات
// ============================================
const CATEGORIES = [
  {
    value: 'behavior',
    label: 'سلوكية',
    icon: '🎯',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.12)',
  },
  {
    value: 'academic',
    label: 'أكاديمية',
    icon: '📚',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    value: 'health',
    label: 'صحية',
    icon: '💊',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
  },
  {
    value: 'general',
    label: 'عامة',
    icon: '💬',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
]

export default function StudentNotes() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [formData, setFormData] = useState(getEmptyForm())

  function getEmptyForm() {
    return {
      category: 'behavior',
      title: '',
      content: '',
      is_public: false,
      is_pinned: false,
    }
  }

  useEffect(() => {
    if (studentId) {
      fetchNotes()
    } else {
      fetchAllNotes()
    }
  }, [studentId, filterCategory])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterCategory) params.category = filterCategory
      const res = await api.get(`/notes/student/${studentId}`, { params })
      setData(res.data.data)
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل تحميل الملاحظات')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllNotes = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterCategory) params.category = filterCategory
      const res = await api.get('/notes', { params })
      setData({ student: null, notes: res.data.data, stats: null })
    } catch (e) {
      toast.error('فشل تحميل الملاحظات')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingNote(null)
    setFormData(getEmptyForm())
    setShowModal(true)
  }

  const openEdit = (note) => {
    setEditingNote(note)
    setFormData({
      category: note.category,
      title: note.title || '',
      content: note.content,
      is_public: note.is_public === 1,
      is_pinned: note.is_pinned === 1,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.content.trim()) {
      toast.error('المحتوى مطلوب')
      return
    }

    try {
      if (editingNote) {
        await api.put(`/notes/${editingNote.id}`, formData)
        toast.success('تم التحديث')
      } else {
        await api.post('/notes', {
          ...formData,
          student_id: parseInt(studentId),
        })
        toast.success('تم إضافة الملاحظة')
      }
      setShowModal(false)
      setFormData(getEmptyForm())
      setEditingNote(null)
      if (studentId) fetchNotes()
      else fetchAllNotes()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDelete = async (note) => {
    if (!confirm('حذف هذه الملاحظة؟')) return
    try {
      await api.delete(`/notes/${note.id}`)
      toast.success('تم الحذف')
      if (studentId) fetchNotes()
      else fetchAllNotes()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const togglePin = async (note) => {
    try {
      await api.put(`/notes/${note.id}`, { is_pinned: !note.is_pinned })
      toast.success(note.is_pinned ? 'تم إلغاء التثبيت' : 'تم التثبيت')
      if (studentId) fetchNotes()
      else fetchAllNotes()
    } catch (e) {
      toast.error('فشل')
    }
  }

  const getCategoryInfo = (value) => CATEGORIES.find(c => c.value === value) || CATEGORIES[3]

  const filteredNotes = data?.notes?.filter(n => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      n.content?.toLowerCase().includes(q) ||
      n.title?.toLowerCase().includes(q) ||
      n.student_name?.toLowerCase().includes(q)
    )
  }) || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {studentId && (
            <button
              onClick={() => navigate(-1)}
              className="btn-ghost !p-2"
              title="رجوع"
            >
              <ArrowRight size={20} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="text-primary-500" size={26} />
              {studentId && data?.student ? `ملاحظات: ${data.student.full_name}` : 'كل الملاحظات'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {studentId && data?.student
                ? `${data.student.grade} ${data.student.section ? '- شعبة ' + data.student.section : ''}`
                : `إجمالي: ${filteredNotes.length} ملاحظة`}
            </p>
          </div>
        </div>

        {hasPermission('notes.create') && studentId && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة ملاحظة
          </button>
        )}
      </div>

      {/* بيانات الطالب (إذا كان محدداً) */}
      {studentId && data?.student && (
        <div className="glass-card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              {data.student.full_name?.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{data.student.full_name}</p>
              <div className="flex flex-wrap gap-3 text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                <span>👤 {data.student.guardian_name}</span>
                <span dir="ltr">📞 {data.student.guardian_phone}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الإحصائيات */}
      {studentId && data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="glass-card p-3 text-center">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الإجمالي</p>
            <p className="text-xl font-bold">{data.stats.total}</p>
          </div>
          <div className="glass-card p-3 text-center" style={{ borderColor: CATEGORIES[0].color }}>
            <p className="text-sm mb-1">{CATEGORIES[0].icon} سلوكية</p>
            <p className="text-lg font-bold" style={{ color: CATEGORIES[0].color }}>{data.stats.behavior}</p>
          </div>
          <div className="glass-card p-3 text-center" style={{ borderColor: CATEGORIES[1].color }}>
            <p className="text-sm mb-1">{CATEGORIES[1].icon} أكاديمية</p>
            <p className="text-lg font-bold" style={{ color: CATEGORIES[1].color }}>{data.stats.academic}</p>
          </div>
          <div className="glass-card p-3 text-center" style={{ borderColor: CATEGORIES[2].color }}>
            <p className="text-sm mb-1">{CATEGORIES[2].icon} صحية</p>
            <p className="text-lg font-bold" style={{ color: CATEGORIES[2].color }}>{data.stats.health}</p>
          </div>
          <div className="glass-card p-3 text-center" style={{ borderColor: '#8B5CF6' }}>
            <p className="text-sm mb-1">👁️ عامة</p>
            <p className="text-lg font-bold" style={{ color: '#8B5CF6' }}>{data.stats.public}</p>
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث في الملاحظات..."
            className="input-modern ps-10"
          />
        </div>

        <select value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-modern !w-auto min-w-[180px]">
          <option value="">كل التصنيفات</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      {/* قائمة الملاحظات */}
      {loading ? (
        <div className="glass-card p-10 text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <MessageSquare size={48} className="mx-auto mb-3 text-slate-400" />
          <p style={{ color: 'var(--text-secondary)' }}>
            {search || filterCategory ? 'لا توجد نتائج' : 'لا توجد ملاحظات بعد'}
          </p>
          {hasPermission('notes.create') && studentId && (
            <button onClick={openAdd} className="btn-primary mt-4">
              <Plus size={18} />
              إضافة أول ملاحظة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const catInfo = getCategoryInfo(note.category)
            const isOwner = note.teacher_id === user?.id
            const canEdit = isOwner || user?.role === 'admin'

            return (
              <div key={note.id}
                   className="glass-card p-5 transition-all hover:scale-[1.01]"
                   style={{
                     borderRight: `4px solid ${catInfo.color}`,
                     background: note.is_pinned ? `${catInfo.color}08` : undefined,
                   }}>
                <div className="flex items-start gap-4">
                  {/* أيقونة التصنيف */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                       style={{ background: catInfo.bg }}>
                    {catInfo.icon}
                  </div>

                  {/* المحتوى */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {note.is_pinned === 1 && (
                          <Pin size={16} className="text-amber-500" />
                        )}
                        <span className="badge"
                              style={{ background: catInfo.bg, color: catInfo.color }}>
                          {catInfo.icon} {catInfo.label}
                        </span>
                        {note.is_public === 1 && (
                          <span className="badge-info text-xs">
                            <Eye size={12} /> مرئية لولي الأمر
                          </span>
                        )}
                      </div>

                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                        {new Date(note.created_at).toLocaleString('en-GB')}
                      </div>
                    </div>

                    {note.title && (
                      <h4 className="font-bold text-lg mb-1">{note.title}</h4>
                    )}

                    {!studentId && note.student_name && (
                      <div className="flex items-center gap-2 mb-2 p-2 rounded-lg"
                           style={{ background: 'rgba(99,102,241,0.08)' }}>
                        <User size={14} style={{ color: '#6366F1' }} />
                        <button
                          onClick={() => navigate(`/students/${note.student_id}/notes`)}
                          className="text-sm font-semibold hover:underline"
                          style={{ color: '#6366F1' }}
                        >
                          {note.student_name}
                        </button>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {note.student_grade} {note.student_section && `- ${note.student_section}`}
                        </span>
                      </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap mb-3">{note.content}</p>

                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>👤 {note.teacher_name}</span>
                      {note.updated_at !== note.created_at && (
                        <span>· (تم التعديل)</span>
                      )}
                    </div>
                  </div>

                  {/* الإجراءات */}
                  {(canEdit || hasPermission('notes.edit')) && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => togglePin(note)}
                            className="btn-ghost !p-2 text-amber-500"
                            title={note.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                          >
                            {note.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                          </button>
                          <button
                            onClick={() => openEdit(note)}
                            className="btn-ghost !p-2 text-blue-500"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(note)}
                            className="btn-ghost !p-2 text-red-500"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost !p-2 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* التصنيف */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  التصنيف <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: c.value })}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: formData.category === c.value ? c.color : 'var(--border-color)',
                        background: formData.category === c.value ? c.bg : 'var(--bg-card)',
                      }}
                    >
                      <div className="text-2xl mb-1">{c.icon}</div>
                      <div className="text-xs font-bold"
                           style={{ color: formData.category === c.value ? c.color : 'var(--text-primary)' }}>
                        {c.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  العنوان (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-modern"
                  placeholder="مثال: تحسن ملحوظ في الرياضيات"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  المحتوى <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="input-modern"
                  rows="5"
                  placeholder="اكتب ملاحظتك..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer"
                       style={{
                         borderColor: formData.is_public ? '#10B981' : 'var(--border-color)',
                         background: formData.is_public ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
                       }}>
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-bold">👁️ مرئية لولي الأمر</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      ستظهر في بوابة ولي الأمر
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer"
                       style={{
                         borderColor: formData.is_pinned ? '#F59E0B' : 'var(--border-color)',
                         background: formData.is_pinned ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
                       }}>
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <div>
                    <p className="text-sm font-bold">📌 تثبيت</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      تظهر في الأعلى دائماً
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingNote ? 'حفظ التعديلات' : 'إضافة الملاحظة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost"
                >
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