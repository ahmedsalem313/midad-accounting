import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, Receipt, AlertCircle,
  TrendingDown, DollarSign, Calendar, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ExportButton from '../components/ExportButton'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIES = [
  { value: 'salaries',    label: 'رواتب',        icon: '👥', color: '#6366F1' },
  { value: 'rent',        label: 'إيجار',        icon: '🏢', color: '#8B5CF6' },
  { value: 'electricity', label: 'كهرباء',       icon: '⚡', color: '#F59E0B' },
  { value: 'water',       label: 'ماء',          icon: '💧', color: '#3B82F6' },
  { value: 'internet',    label: 'إنترنت',       icon: '🌐', color: '#06B6D4' },
  { value: 'stationery',  label: 'قرطاسية',      icon: '📚', color: '#10B981' },
  { value: 'maintenance', label: 'صيانة',        icon: '🔧', color: '#F97316' },
  { value: 'cleaning',    label: 'نظافة',        icon: '🧹', color: '#84CC16' },
  { value: 'transport',   label: 'نقل',          icon: '🚌', color: '#EC4899' },
  { value: 'food',        label: 'طعام',         icon: '🍽️', color: '#EF4444' },
  { value: 'other',       label: 'أخرى',         icon: '📦', color: '#64748B' },
]

const METHODS = [
  { value: 'cash',     label: 'نقدي',    icon: '💵' },
  { value: 'transfer', label: 'تحويل',   icon: '🏦' },
  { value: 'check',    label: 'شيك',     icon: '📝' },
  { value: 'card',     label: 'بطاقة',   icon: '💳' },
]

export default function Expenses() {
  const { hasPermission } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
 const [filterMonth, setFilterMonth] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  function getEmptyForm() {
    return {
      category: 'salaries',
      description: '',
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      receipt_number: '',
      notes: '',
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  useEffect(() => {
    fetchExpenses()
  }, [filterCategory, filterMonth])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterCategory) params.category = filterCategory
      if (filterMonth) {
        params.from_date = `${filterMonth}-01`
        params.to_date = `${filterMonth}-31`
      }
      const res = await api.get('/expenses', { params })
      setExpenses(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل المصاريف')
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      e.description?.toLowerCase().includes(q) ||
      e.notes?.toLowerCase().includes(q) ||
      e.receipt_number?.toLowerCase().includes(q) ||
      String(e.amount).includes(q.replace(/[^\d]/g, ''))
    )
  })

  const total = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)

  // إحصائيات حسب الفئة
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    total: filteredExpenses
      .filter((e) => e.category === c.value)
      .reduce((s, e) => s + (e.amount || 0), 0),
    count: filteredExpenses.filter((e) => e.category === c.value).length,
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total)

  const openAddModal = () => {
    setEditingExpense(null)
    setFormData(getEmptyForm())
    setShowModal(true)
  }

  const openEditModal = (expense) => {
    setEditingExpense(expense)
    setFormData({
      category: expense.category || 'salaries',
      description: expense.description || '',
      amount: expense.amount || 0,
      expense_date: expense.expense_date || '',
      payment_method: expense.payment_method || 'cash',
      receipt_number: expense.receipt_number || '',
      notes: expense.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.category || !formData.amount || !formData.expense_date) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }

    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, formData)
        toast.success('تم التحديث')
      } else {
        await api.post('/expenses', formData)
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      fetchExpenses()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleDelete = async (expense) => {
    if (!confirm(`حذف مصروف "${getCategory(expense.category).label}" بمبلغ ${expense.amount}؟`)) return
    try {
      await api.delete(`/expenses/${expense.id}`)
      toast.success('تم الحذف')
      fetchExpenses()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')
  const getCategory = (v) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[10]
  const getMethod = (v) => METHODS.find((m) => m.value === v) || METHODS[0]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="text-primary-500" size={26} />
            المصاريف
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إجمالي: {expenses.length} مصروف
          </p>
        </div>

        <div className="flex gap-2">
  <ExportButton
    data={filteredExpenses}
    filename="المصاريف"
    sheetName="المصاريف"
    columns={[
      { key: 'expense_date', label: 'التاريخ' },
      { key: 'category', label: 'الفئة', format: (v) => getCategory(v).label },
      { key: 'description', label: 'الوصف' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'payment_method', label: 'طريقة الدفع', format: (v) => getMethod(v).label },
      { key: 'receipt_number', label: 'رقم الوصل' },
      { key: 'notes', label: 'ملاحظات' },
    ]}
  />
  {hasPermission('expenses.create') && (
    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
      <Plus size={18} />
      إضافة مصروف
    </button>
  )}
</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي المصاريف</p>
              <h3 className="text-2xl font-bold text-red-500">{fmt(total)}</h3>
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
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>عدد العمليات</p>
              <h3 className="text-2xl font-bold">{expenses.length}</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مصروف</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: '#6366F120', color: '#6366F1' }}>
              <Receipt size={22} />
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>متوسط المصروف</p>
              <h3 className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>
                {expenses.length > 0 ? fmt(Math.round(total / expenses.length)) : 0}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>د.ع</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
              <DollarSign size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Category */}
      {byCategory.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            📊 التوزيع حسب الفئة
          </h3>
          <div className="space-y-2">
            {byCategory.map((c) => {
              const percent = total > 0 ? (c.total / total) * 100 : 0
              return (
                <div key={c.value} className="flex items-center gap-3">
                  <div className="w-32 flex items-center gap-2 text-sm">
                    <span>{c.icon}</span>
                    <span className="truncate">{c.label}</span>
                  </div>
                  <div className="flex-1 h-3 rounded-full overflow-hidden"
                       style={{ background: 'var(--border-color)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percent}%`,
                        background: c.color,
                      }}
                    />
                  </div>
                  <div className="w-32 text-end text-sm">
                    <span className="font-bold">{fmt(c.total)}</span>
                    <span className="text-xs ms-1" style={{ color: 'var(--text-secondary)' }}>
                      ({Math.round(percent)}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="🔍 ابحث في الوصف، الملاحظات، المبلغ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern ps-10 pe-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 -translate-y-1/2 end-3 text-red-500"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-modern !w-auto min-w-[160px]"
        >
          <option value="">كل الفئات</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>

        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="input-modern !w-auto"
        />

        <div className="text-xs px-3 py-2 rounded-lg whitespace-nowrap font-semibold"
             style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
          {filteredExpenses.length} مصروف
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>
              {search ? 'لا توجد نتائج' : 'لا توجد مصاريف'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">الفئة</th>
                  <th className="p-3 text-start">الوصف</th>
                  <th className="p-3 text-start">المبلغ</th>
                  <th className="p-3 text-start">طريقة الدفع</th>
                  <th className="p-3 text-start">التاريخ</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e, i) => {
                  const cat = getCategory(e.category)
                  const method = getMethod(e.payment_method)
                  return (
                    <tr key={e.id}
                        className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3">
                        <span className="badge" style={{ background: `${cat.color}20`, color: cat.color }}>
                          {cat.icon} {cat.label}
                        </span>
                      </td>
                      <td className="p-3">{e.description || '-'}</td>
                      <td className="p-3 font-bold text-red-500">{fmt(e.amount)} د.ع</td>
                      <td className="p-3 text-xs">{method.icon} {method.label}</td>
                      <td className="p-3 text-xs" dir="ltr">{e.expense_date}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {hasPermission('expenses.edit') && (
                            <button
                              onClick={() => openEditModal(e)}
                              className="btn-ghost !p-2 text-blue-500 hover:text-blue-700"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {hasPermission('expenses.delete') && (
                            <button
                              onClick={() => handleDelete(e)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost !p-2 hover:bg-red-500/10 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* الفئة */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  الفئة <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: c.value })}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: formData.category === c.value ? c.color : 'var(--border-color)',
                        background: formData.category === c.value ? `${c.color}15` : 'var(--bg-card)',
                      }}
                    >
                      <div className="text-xl mb-1">{c.icon}</div>
                      <div className="text-xs font-medium">{c.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    المبلغ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="input-modern"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    التاريخ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">الوصف</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-modern"
                    placeholder="مثال: رواتب شهر أيلول"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">طريقة الدفع</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="input-modern"
                  >
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">رقم الوصل</label>
                  <input
                    type="text"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                    className="input-modern"
                    dir="ltr"
                  />
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
                  {editingExpense ? 'حفظ التعديلات' : 'إضافة المصروف'}
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