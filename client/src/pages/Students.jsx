import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, Users,
  Phone, GraduationCap, AlertCircle, FileDown
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getGradesByType, SECTIONS, getCurrentSchoolType } from '../utils/schoolData'
import ExportButton from '../components/ExportButton'

export default function Students() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)

  function getEmptyForm() {
    return {
      student_number: '',
      full_name: '',
      grade: GRADES[0],
      section: SECTIONS[0],
      birth_date: '',
      gender: 'male',
      guardian_name: '',
      guardian_phone: '',
      guardian_phone_alt: '',
      address: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      total_fees: 0,
      notes: '',
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  useEffect(() => {
    fetchStudents()
  }, [filterGrade])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterGrade) params.grade = filterGrade
      const res = await api.get('/students', { params })

      const currentGrades = getGradesByType(schoolType)
      const filtered = res.data.data.filter((s) => currentGrades.includes(s.grade))
      setStudents(filtered)
    } catch (e) {
      toast.error('فشل تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter((s) => {
    if (filterGender && s.gender !== filterGender) return false

    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.guardian_name?.toLowerCase().includes(q) ||
      s.student_number?.toLowerCase().includes(q) ||
      s.guardian_phone?.includes(q)
    )
  })

  const openAddModal = () => {
    setEditingStudent(null)
    setFormData(getEmptyForm())
    setShowModal(true)
  }

  const openEditModal = (student) => {
    setEditingStudent(student)
    setFormData({
      student_number: student.student_number || '',
      full_name: student.full_name || '',
      grade: student.grade || GRADES[0],
      section: student.section || SECTIONS[0],
      birth_date: student.birth_date || '',
      gender: student.gender || 'male',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      guardian_phone_alt: student.guardian_phone_alt || '',
      address: student.address || '',
      enrollment_date: student.enrollment_date || '',
      total_fees: student.total_fees || 0,
      notes: student.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.full_name || !formData.grade || !formData.guardian_name || !formData.guardian_phone) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }

    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, formData)
        toast.success('تم التحديث بنجاح')
      } else {
        await api.post('/students', formData)
        toast.success('تمت الإضافة بنجاح')
      }
      setShowModal(false)
      fetchStudents()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleDelete = async (student) => {
    if (!confirm(`هل أنت متأكد من حذف الطالب: ${student.full_name}؟`)) return
    try {
      await api.delete(`/students/${student.id}`)
      toast.success('تم الحذف')
      fetchStudents()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const stats = {
    total: filteredStudents.length,
    male: filteredStudents.filter((s) => s.gender !== 'female').length,
    female: filteredStudents.filter((s) => s.gender === 'female').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-primary-500" size={26} />
            إدارة الطلاب
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {schoolType === 'primary' ? '🎒 مدرسة ابتدائية' :
             schoolType === 'secondary' ? '📚 مدرسة إعدادية' :
             '🏫 مدرسة مختلطة'} —
            إجمالي: {students.length} طالب
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <ExportButton
            data={filteredStudents}
            filename="قائمة_الطلاب"
            sheetName="الطلاب"
            columns={[
              { key: 'student_number', label: 'الرقم' },
              { key: 'full_name', label: 'الاسم الكامل' },
              { key: 'grade', label: 'الصف' },
              { key: 'section', label: 'الشعبة' },
              { key: 'gender', label: 'الجنس', format: (v) => (v === 'female' ? 'أنثى' : 'ذكر') },
              { key: 'guardian_name', label: 'ولي الأمر' },
              { key: 'guardian_phone', label: 'الهاتف' },
              { key: 'guardian_phone_alt', label: 'هاتف بديل' },
              { key: 'total_fees', label: 'الرسوم الكلية' },
              { key: 'address', label: 'العنوان' },
              { key: 'notes', label: 'ملاحظات' },
            ]}
          />
          {hasPermission('students.create') && (
            <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة طالب
            </button>
          )}
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
              <span className="text-xl">👦</span>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>بنين</p>
              <p className="text-xl font-bold text-blue-500">{stats.male}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(236,72,153,0.15)', color: '#EC4899' }}>
              <span className="text-xl">👧</span>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>بنات</p>
              <p className="text-xl font-bold text-pink-500">{stats.female}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="بحث بالاسم، ولي الأمر، الرقم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern ps-10"
          />
        </div>

        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="input-modern !w-auto min-w-[180px]"
        >
          <option value="">كل الصفوف</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="input-modern !w-auto min-w-[140px]"
        >
          <option value="">كل الأجناس</option>
          <option value="male">👦 بنين</option>
          <option value="female">👧 بنات</option>
        </select>

        <div className="text-xs px-3 py-2 rounded-lg whitespace-nowrap font-semibold"
             style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
          {filteredStudents.length} / {students.length} طالب
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا يوجد طلاب</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">اسم الطالب</th>
                  <th className="p-3 text-center">الجنس</th>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-start">ولي الأمر</th>
                  <th className="p-3 text-start">الهاتف</th>
                  <th className="p-3 text-start">الرسوم</th>
                  <th className="p-3 text-center">حالة الغياب</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => (
                  <tr key={s.id}
                      className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                    <td className="p-3 font-semibold">
                      <Link
                        to={`/students/${s.id}`}
                        className="text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="p-3 text-center">
                      <span title={s.gender === 'female' ? 'أنثى' : 'ذكر'} className="text-lg">
                        {s.gender === 'female' ? '👧' : '👦'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="badge-info">
                        <GraduationCap size={12} />
                        {s.grade} {s.section && `- ${s.section}`}
                      </span>
                    </td>
                    <td className="p-3">{s.guardian_name}</td>
                    <td className="p-3" dir="ltr">
                      <span className="flex items-center gap-1">
                        <Phone size={12} style={{ color: 'var(--text-secondary)' }} />
                        {s.guardian_phone}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-emerald-600">
                      {(s.total_fees || 0).toLocaleString('ar-IQ')} د.ع
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const level = s.absence_level || 0
                        if (level === 0) return <span className="badge-success text-xs">✓ نشط</span>
                        if (level === 1) return <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>🔔 إنذار</span>
                        if (level === 2) return <span className="badge" style={{ background: '#FED7AA', color: '#C2410C' }}>⚠️ إنذار 2</span>
                        if (level === 3) return <span className="badge" style={{ background: '#FECACA', color: '#B91C1C' }}>🟠 تعهد</span>
                        if (level === 4) return <span className="badge" style={{ background: '#FCA5A5', color: '#7F1D1D' }}>❌ راسب</span>
                        return <span className="badge-info text-xs">—</span>
                      })()}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        {hasPermission('students.edit') && (
                          <button
                            onClick={() => openEditModal(s)}
                            className="btn-ghost !p-2 text-blue-500 hover:text-blue-700"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {hasPermission('students.delete') && (
                          <button
                            onClick={() => handleDelete(s)}
                            className="btn-ghost !p-2 text-red-500 hover:text-red-700"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost !p-2 hover:bg-red-500/10 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">رقم الطالب</label>
                  <input
                    type="text"
                    value={formData.student_number}
                    onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                    className="input-modern"
                    placeholder="اختياري"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    الصف <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="input-modern"
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">الشعبة</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="input-modern"
                  >
                    {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="input-modern"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    الجنس <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'male' })}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: formData.gender === 'male' ? '#3B82F6' : 'var(--border-color)',
                        background: formData.gender === 'male' ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
                      }}
                    >
                      <span className="text-xl">👦</span>
                      <div className="text-xs font-bold mt-1">ذكر</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'female' })}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: formData.gender === 'female' ? '#EC4899' : 'var(--border-color)',
                        background: formData.gender === 'female' ? 'rgba(236,72,153,0.1)' : 'var(--bg-card)',
                      }}
                    >
                      <span className="text-xl">👧</span>
                      <div className="text-xs font-bold mt-1">أنثى</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    اسم ولي الأمر <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    هاتف ولي الأمر <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                    className="input-modern"
                    placeholder="07XXXXXXXXX"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">هاتف بديل</label>
                  <input
                    type="text"
                    value={formData.guardian_phone_alt}
                    onChange={(e) => setFormData({ ...formData, guardian_phone_alt: e.target.value })}
                    className="input-modern"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">الرسوم الكلية (د.ع)</label>
                  <input
                    type="number"
                    value={formData.total_fees}
                    onChange={(e) => setFormData({ ...formData, total_fees: parseFloat(e.target.value) || 0 })}
                    className="input-modern"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">العنوان</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input-modern"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-modern"
                    rows="3"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1">
                  {editingStudent ? 'حفظ التعديلات' : 'إضافة الطالب'}
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