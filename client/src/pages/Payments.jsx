import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, Wallet, AlertCircle,
  TrendingUp, TrendingDown, DollarSign, Printer,
  MessageCircle, User, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ExportButton from '../components/ExportButton'
import { useAuth } from '../contexts/AuthContext'
import FullReceipt from './FullReceipt'
const METHODS = [
  { value: 'cash',     label: 'نقدي',    icon: '💵' },
  { value: 'transfer', label: 'تحويل',   icon: '🏦' },
  { value: 'check',    label: 'شيك',     icon: '📝' },
  { value: 'card',     label: 'بطاقة',   icon: '💳' },
]

// ============================================
// مكوّن بحث الطالب المتقدم
// ============================================
function StudentPicker({ students, onSelect }) {
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [open, setOpen] = useState(false)

  const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))].sort()
  const sections = [...new Set(students.map((s) => s.section).filter(Boolean))].sort()

  const filtered = students.filter((s) => {
    if (filterGrade && s.grade !== filterGrade) return false
    if (filterSection && s.section !== filterSection) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.guardian_name?.toLowerCase().includes(q) ||
      s.guardian_phone?.includes(q) ||
      s.student_number?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={filterGrade}
          onChange={(e) => { setFilterGrade(e.target.value); setOpen(true) }}
          className="input-modern !text-sm"
        >
          <option value="">📚 كل الصفوف</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={filterSection}
          onChange={(e) => { setFilterSection(e.target.value); setOpen(true) }}
          className="input-modern !text-sm"
        >
          <option value="">🏷️ كل الشعب</option>
          {sections.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
        </select>
      </div>

      <div className="relative">
        <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="ابحث باسم الطالب، ولي الأمر، الهاتف..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="input-modern ps-10 pe-20"
        />
        <span className="absolute top-1/2 -translate-y-1/2 end-3 text-xs font-semibold px-2 py-1 rounded"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
          {filtered.length} نتيجة
        </span>
      </div>

      {open && (
        <div className="border rounded-xl overflow-hidden max-h-64 overflow-y-auto"
             style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              <AlertCircle size={32} className="mx-auto mb-2 text-slate-400" />
              لا يوجد طلاب مطابقون
            </div>
          ) : (
            filtered.slice(0, 50).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onSelect(s); setOpen(false) }}
                className="w-full flex items-center gap-3 p-3 text-start border-b transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  {s.full_name?.charAt(0) || '؟'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{s.full_name}</p>
                  <div className="flex flex-wrap gap-x-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>📚 {s.grade}{s.section && ` - ${s.section}`}</span>
                    {s.guardian_name && <span>👤 {s.guardian_name}</span>}
                    {s.guardian_phone && <span dir="ltr">📞 {s.guardian_phone}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// المكوّن الرئيسي
// ============================================
export default function Payments() {
  const { hasPermission } = useAuth()
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(null)
  const [fullReceiptStudentId, setFullReceiptStudentId] = useState(null)
  const [editingPayment, setEditingPayment] = useState(null)
  const [studentStats, setStudentStats] = useState(null)
  const [loadingStudent, setLoadingStudent] = useState(false)

  function getEmptyForm() {
    return {
      student_id: '',
      amount: 0,
      paid_amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      payment_date: new Date().toISOString().split('T')[0],
      method: 'cash',
      notes: '',
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  useEffect(() => {
    fetchAll()
  }, [])

  // عند اختيار طالب → اجلب إحصائياته
  useEffect(() => {
    if (formData.student_id && !editingPayment) {
      fetchStudentStats(formData.student_id)
    }
  }, [formData.student_id])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [paymentsRes, studentsRes] = await Promise.all([
        api.get('/payments'),
        api.get('/students'),
      ])
      setPayments(paymentsRes.data.data)
      setStudents(studentsRes.data.data)

      const totalExpected = studentsRes.data.data.reduce((s, st) => s + (st.total_fees || 0), 0)
      const totalPaid = paymentsRes.data.data.reduce((s, p) => s + (p.paid_amount || 0), 0)
      const remaining = totalExpected - totalPaid
      setStats({
        totalExpected,
        totalPaid,
        remaining,
        rate: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0,
      })
    } catch (e) {
      toast.error('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentStats = async (studentId) => {
    try {
      setLoadingStudent(true)
      const res = await api.get(`/payments/student/${studentId}/stats`)
      setStudentStats(res.data.data)
      // تعبئة المبلغ الإجمالي تلقائياً
      setFormData((prev) => ({
        ...prev,
        amount: res.data.data.total_fees,
      }))
    } catch (e) {
      console.error(e)
      setStudentStats(null)
    } finally {
      setLoadingStudent(false)
    }
  }

  const filteredPayments = payments.filter((p) => {
    if (filterMethod && p.method !== filterMethod) return false
    if (!search.trim()) return true

    const q = search.trim().toLowerCase()
    const searchableText = [
      p.student_name,
      p.receipt_number,
      p.notes,
      p.grade,
      p.section,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const amountMatch = q.replace(/[^\d]/g, '')
    const amountHit = amountMatch && (
      String(p.amount).includes(amountMatch) ||
      String(p.paid_amount).includes(amountMatch)
    )

    return searchableText.includes(q) || amountHit
  })

  const openAddModal = () => {
    setEditingPayment(null)
    setFormData(getEmptyForm())
    setStudentStats(null)
    setShowModal(true)
  }

  const openEditModal = (payment) => {
    setEditingPayment(payment)
    setFormData({
      student_id: payment.student_id,
      amount: payment.amount || 0,
      paid_amount: payment.paid_amount || 0,
      due_date: payment.due_date || '',
      payment_date: payment.payment_date || '',
      method: payment.method || 'cash',
      notes: payment.notes || '',
    })
    // جلب إحصائيات الطالب أيضاً
    fetchStudentStats(payment.student_id)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.student_id || !formData.amount) {
      toast.error('يرجى اختيار الطالب وإدخال المبلغ')
      return
    }
    if (formData.paid_amount <= 0) {
      toast.error('يرجى إدخال المبلغ المدفوع')
      return
    }

    try {
      if (editingPayment) {
        await api.put(`/payments/${editingPayment.id}`, formData)
        toast.success('تم التحديث')
      } else {
        const res = await api.post('/payments', formData)
        toast.success(`تم التسجيل - إيصال: ${res.data.data.receipt_number}`)
      }
      setShowModal(false)
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleDelete = async (payment) => {
    if (!confirm(`حذف دفعة ${payment.student_name} بمبلغ ${payment.paid_amount}؟`)) return
    try {
      await api.delete(`/payments/${payment.id}`)
      toast.success('تم الحذف')
      fetchAll()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const handlePrint = (payment) => {
    setShowReceipt(payment)
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')
  const methodLabel = (m) => METHODS.find((x) => x.value === m) || METHODS[0]
  const selectedStudent = students.find((s) => s.id === formData.student_id)

  // حسابات فورية
  const currentPaid = studentStats?.total_paid || 0
  const thisPayment = parseFloat(formData.paid_amount) || 0
  const totalAfter = currentPaid + thisPayment
  const remainingAfter = Math.max(0, (studentStats?.total_fees || 0) - totalAfter)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="text-primary-500" size={26} />
            الأقساط والمدفوعات
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إجمالي: {payments.length} دفعة
          </p>
        </div>

       <div className="flex gap-2">
  <ExportButton
    data={filteredPayments}
    filename="الأقساط"
    sheetName="المدفوعات"
    columns={[
      { key: 'receipt_number', label: 'رقم الإيصال' },
      { key: 'student_name', label: 'الطالب' },
      { key: 'grade', label: 'الصف' },
      { key: 'section', label: 'الشعبة' },
      { key: 'amount', label: 'المبلغ الكلي' },
      { key: 'paid_amount', label: 'المدفوع' },
      { key: 'method', label: 'طريقة الدفع' },
      { key: 'payment_date', label: 'تاريخ الدفع' },
      { key: 'notes', label: 'ملاحظات' },
    ]}
  />
  {hasPermission('payments.create') && (
    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
      <Plus size={18} />
      تسجيل دفعة
    </button>
  )}
</div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي متوقع</p>
                <h3 className="text-2xl font-bold">{fmt(stats.totalExpected)}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{ background: '#6366F120', color: '#6366F1' }}>
                <DollarSign size={22} />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي محصل</p>
                <h3 className="text-2xl font-bold text-emerald-600">{fmt(stats.totalPaid)}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{ background: '#10B98120', color: '#10B981' }}>
                <TrendingUp size={22} />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>متبقي</p>
                <h3 className="text-2xl font-bold text-red-500">{fmt(stats.remaining)}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{ background: '#EF444420', color: '#EF4444' }}>
                <TrendingDown size={22} />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>نسبة التحصيل</p>
                <h3 className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{stats.rate}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
                <TrendingUp size={22} />
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden"
                 style={{ background: 'var(--border-color)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${stats.rate}%`,
                  background: 'linear-gradient(90deg, #10B981, #6366F1)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[280px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="🔍 ابحث: اسم الطالب، رقم الإيصال، المبلغ، الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern ps-10 pe-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 -translate-y-1/2 end-3 text-red-500 hover:text-red-700"
              title="مسح البحث"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="input-modern !w-auto min-w-[160px]"
        >
          <option value="">كل الطرق</option>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
          ))}
        </select>

        <div className="text-xs px-3 py-2 rounded-lg whitespace-nowrap font-semibold"
             style={{
               color: 'var(--text-secondary)',
               background: 'rgba(99,102,241,0.08)',
             }}>
          {filteredPayments.length} / {payments.length} نتيجة
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>
              {search ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد دفعات'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">رقم الإيصال</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-start">المبلغ</th>
                  <th className="p-3 text-start">المدفوع</th>
                  <th className="p-3 text-start">الطريقة</th>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const method = methodLabel(p.method)
                  return (
                    <tr key={p.id}
                        className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 font-mono text-xs" style={{ color: '#6366F1' }}>
                        {p.receipt_number}
                      </td>
                      <td className="p-3 font-semibold">{p.student_name}</td>
                      <td className="p-3 text-xs">{p.grade} {p.section && `- ${p.section}`}</td>
                      <td className="p-3">{fmt(p.amount)}</td>
                      <td className="p-3 font-semibold text-emerald-600">{fmt(p.paid_amount)}</td>
                      <td className="p-3">
                        <span className="badge-info">{method.icon} {method.label}</span>
                      </td>
                      <td className="p-3 text-xs" dir="ltr">{p.payment_date}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                       {hasPermission('payments.print') && (
  <>
    <button
      onClick={() => handlePrint(p)}
      className="btn-ghost !p-2 text-emerald-500 hover:text-emerald-700"
      title="طباعة إيصال هذه الدفعة"
    >
      <Printer size={16} />
    </button>
    <button
      onClick={() => setFullReceiptStudentId(p.student_id)}
      className="btn-ghost !p-2 text-primary-500 hover:text-primary-700"
      title="كشف حساب شامل للطالب"
    >
      <FileText size={16} />
    </button>
  </>
)}
                          {hasPermission('payments.edit') && (
                            <button
                              onClick={() => openEditModal(p)}
                              className="btn-ghost !p-2 text-blue-500 hover:text-blue-700"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {hasPermission('payments.delete') && (
                            <button
                              onClick={() => handleDelete(p)}
                              className="btn-ghost !p-2 text-red-500 hover:text-red-700"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingPayment ? 'تعديل الدفعة' : 'تسجيل دفعة جديدة'}
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
                {/* اختيار الطالب */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">
                    الطالب <span className="text-red-500">*</span>
                  </label>

                  {editingPayment ? (
                    <div className="input-modern" style={{ background: 'rgba(148,163,184,0.15)' }}>
                      {selectedStudent?.full_name || 'الطالب'}
                    </div>
                  ) : formData.student_id && selectedStudent ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2"
                         style={{ borderColor: '#10B981', background: 'rgba(16,185,129,0.08)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                           style={{ background: 'linear-gradient(135deg, #10B981, #6366F1)' }}>
                        {selectedStudent.full_name?.charAt(0) || '؟'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{selectedStudent.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {selectedStudent.grade}
                          {selectedStudent.section && ` - شعبة ${selectedStudent.section}`}
                          {selectedStudent.guardian_name && ` • ${selectedStudent.guardian_name}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, student_id: '', amount: 0 })
                          setStudentStats(null)
                        }}
                        className="btn-ghost !p-2 text-red-500"
                        title="تغيير الطالب"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <StudentPicker
                      students={students}
                      onSelect={(s) => setFormData({ ...formData, student_id: s.id })}
                    />
                  )}
                </div>

                {/* بطاقة معلومات مالية للطالب */}
                {selectedStudent && studentStats && (
                  <div className="md:col-span-2 p-4 rounded-xl border-2"
                       style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                      📊 الحالة المالية للطالب
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>الرسوم الكلية</p>
                        <p className="font-bold text-sm">{fmt(studentStats.total_fees)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي المُحصَّل</p>
                        <p className="font-bold text-sm text-emerald-600">{fmt(studentStats.total_paid)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>المتبقي حالياً</p>
                        <p className="font-bold text-sm text-red-500">{fmt(studentStats.remaining)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* المبلغ الإجمالي - للقراءة فقط */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    المبلغ الإجمالي <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>(يُملأ تلقائياً)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    readOnly
                    className="input-modern"
                    style={{ background: 'rgba(148,163,184,0.15)', cursor: 'not-allowed' }}
                  />
                </div>

                {/* المبلغ المدفوع الآن */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    المبلغ المدفوع الآن <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) || 0 })}
                    className="input-modern"
                    placeholder="المبلغ الذي يدفعه الطالب الآن"
                    min="0"
                    step="any"
                  />
                </div>

                {/* حالة مالية جديدة بعد الدفع */}
                {selectedStudent && studentStats && formData.paid_amount > 0 && (
                  <div className="md:col-span-2 p-4 rounded-xl border-2 animate-fade-in"
                       style={{
                         borderColor: remainingAfter === 0 ? '#10B981' : 'rgba(99,102,241,0.3)',
                         background: remainingAfter === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.05)',
                       }}>
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                      {remainingAfter === 0 ? '✅ بعد هذه الدفعة سيُسدَّد كامل المبلغ!' : '🎯 الحالة المالية بعد هذه الدفعة'}
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>المبلغ المُحصَّل الكلي</p>
                        <p className="font-bold text-sm text-primary-600">{fmt(totalAfter)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
                      </div>
                      <div className="p-3 rounded-xl"
                           style={{ background: remainingAfter === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>المتبقي بعد الدفع</p>
                        <p className={`font-bold text-sm ${remainingAfter === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fmt(remainingAfter)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.1)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>نسبة التحصيل</p>
                        <p className="font-bold text-sm" style={{ color: '#8B5CF6' }}>
                          {studentStats.total_fees > 0
                            ? Math.round((totalAfter / studentStats.total_fees) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full overflow-hidden"
                         style={{ background: 'var(--border-color)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${studentStats.total_fees > 0 ? Math.min(100, (totalAfter / studentStats.total_fees) * 100) : 0}%`,
                          background: remainingAfter === 0
                            ? 'linear-gradient(90deg, #10B981, #059669)'
                            : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input-modern"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">تاريخ الدفع</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="input-modern"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">طريقة الدفع</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, method: m.value })}
                        className="p-3 rounded-xl border-2 transition-all text-center"
                        style={{
                          borderColor: formData.method === m.value ? '#6366F1' : 'var(--border-color)',
                          background: formData.method === m.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
                        }}
                      >
                        <div className="text-xl mb-1">{m.icon}</div>
                        <div className="text-xs font-medium">{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-modern"
                                        rows="2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1">
                  {editingPayment ? 'حفظ التعديلات' : 'تسجيل الدفعة'}
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

      {/* Modal: Receipt - A5 */}
{showReceipt && (
  <>
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #print-receipt, #print-receipt * { visibility: visible !important; }
        #print-receipt {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 148mm !important;
          min-height: 210mm !important;
          margin: 0 !important;
          padding: 10mm !important;
          background: white !important;
          color: black !important;
          direction: rtl !important;
          font-family: 'Cairo', sans-serif !important;
        }
        @page { size: A5 portrait; margin: 0; }
      }
    `}</style>

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-auto">
      <div className="flex flex-col max-h-[95vh] w-full max-w-2xl my-4">
        {/* أزرار */}
        <div className="flex gap-2 mb-3 justify-end">
          <button
            onClick={() => window.print()}
            className="btn-primary flex items-center gap-2"
          >
            <Printer size={18} />
            طباعة الإيصال
          </button>
          <button
            onClick={() => setShowReceipt(null)}
            className="btn-ghost !bg-white/10 !text-white hover:!bg-white/20"
          >
            <X size={18} />
            إغلاق
          </button>
        </div>

        {/* الإيصال */}
        <div className="overflow-auto rounded-2xl" style={{ background: '#e2e8f0' }}>
          <div
            id="print-receipt"
            className="bg-white text-slate-900 mx-auto"
            style={{
              width: '148mm',
              minHeight: '210mm',
              padding: '10mm',
              direction: 'rtl',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '3px double #6366F1', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
  src="/logo.png"
  alt="مداد"
  style={{
    width: '90px',
    height: '90px',
    objectFit: 'contain',
  }}
/>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>مداد المحاسبي</h1>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>نظام إدارة مدرسية متكامل</p>
                </div>
              </div>
              <div style={{ textAlign: 'left', fontSize: '10px', color: '#64748b' }}>
                <p style={{ margin: 0 }}>التاريخ: <strong style={{ color: '#1e293b' }} dir="ltr">{showReceipt.payment_date}</strong></p>
                <p style={{ margin: '4px 0 0 0' }}>الوقت: <strong style={{ color: '#1e293b' }} dir="ltr">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></p>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', padding: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(99,102,241,0.2)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#4338CA' }}>إيصال استلام دفعة</h2>
              <p style={{ fontSize: '12px', fontFamily: 'monospace', margin: '6px 0 0 0', color: '#6366F1', fontWeight: 'bold', letterSpacing: '1px' }}>
                {showReceipt.receipt_number}
              </p>
            </div>

            {/* Student Info */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '6px 12px', borderBottom: '1.5px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                📋 بيانات الطالب
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 12px', color: '#64748b', width: '38%' }}>اسم الطالب</td>
                    <td style={{ padding: '6px 12px', fontWeight: 'bold', color: '#1e293b' }}>{showReceipt.student_name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>الصف</td>
                    <td style={{ padding: '6px 12px', color: '#1e293b' }}>
                      {showReceipt.grade} {showReceipt.section && `- شعبة ${showReceipt.section}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Details */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '6px 12px', borderBottom: '1.5px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                💰 تفاصيل الدفعة
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 12px', color: '#64748b', width: '38%' }}>المبلغ الإجمالي</td>
                    <td style={{ padding: '6px 12px', color: '#1e293b' }}>{(showReceipt.amount || 0).toLocaleString('ar-IQ')} د.ع</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>طريقة الدفع</td>
                    <td style={{ padding: '6px 12px', color: '#1e293b' }}>
                      {methodLabel(showReceipt.method).icon} {methodLabel(showReceipt.method).label}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>المبلغ المدفوع</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {(showReceipt.paid_amount || 0).toLocaleString('ar-IQ')}
                <span style={{ fontSize: '12px', marginRight: '4px' }}> د.ع</span>
              </span>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1.5px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '22px' }}>توقيع المستلم</p>
                <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
              </div>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '22px' }}>ختم المدرسة</p>
                <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
              <p style={{ margin: 0 }}>شكراً لتعاونكم معنا 🌟</p>
              <p style={{ margin: '4px 0 0 0' }}>مداد المحاسبي — نظام إدارة مدرسية</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
)}      {/* كشف حساب شامل */}
      {fullReceiptStudentId && (
        <FullReceipt
          studentId={fullReceiptStudentId}
          onClose={() => setFullReceiptStudentId(null)}
        />
      )}
    </div>
  )
}