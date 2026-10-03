import { useState, useEffect } from 'react'
import {
  Gift, Plus, Search, Edit, Trash2, X, Save, Award, Star,
  Target, Shirt, BookOpen, Trophy, DollarSign, CheckCircle,
  Clock, User, Calendar, TrendingUp, Filter, Coins
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ExportButton from '../components/ExportButton'
import { useAuth } from '../contexts/AuthContext'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function Rewards() {
  const { hasPermission, user } = useAuth()
  const [rewards, setRewards] = useState([])
  const [teachers, setTeachers] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPaid, setFilterPaid] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [showModal, setShowModal] = useState(false)
  const [editingReward, setEditingReward] = useState(null)

  function getEmptyForm() {
    return {
      teacher_id: '',
      category: 'attendance',
      title: '',
      description: '',
      amount: 0,
      reward_month: new Date().getMonth() + 1,
      reward_year: new Date().getFullYear(),
      notes: '',
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  useEffect(() => {
    fetchData()
  }, [filterCategory, filterPaid])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [rewardsRes, usersRes, catsRes] = await Promise.all([
        api.get('/rewards', {
          params: {
            category: filterCategory || undefined,
            paid: filterPaid || undefined,
          },
        }),
        api.get('/users'),
        api.get('/rewards/meta/categories'),
      ])

      setRewards(rewardsRes.data.data)
      const teachersList = usersRes.data.data.filter(u =>
        u.role === 'teacher' || u.role === 'admin' || u.role === 'accountant'
      )
      setTeachers(teachersList)
      setCategories(catsRes.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingReward(null)
    setFormData(getEmptyForm())
    setShowModal(true)
  }

  const openEdit = (reward) => {
    setEditingReward(reward)
    setFormData({
      teacher_id: reward.teacher_id,
      category: reward.category,
      title: reward.title,
      description: reward.description || '',
      amount: reward.amount,
      reward_month: reward.reward_month,
      reward_year: reward.reward_year,
      notes: reward.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.teacher_id || !formData.title || !formData.amount) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }

    try {
      if (editingReward) {
        await api.put(`/rewards/${editingReward.id}`, formData)
        toast.success('تم التحديث')
      } else {
        await api.post('/rewards', formData)
        toast.success('تم إضافة المكافأة')
      }
      setShowModal(false)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحفظ')
    }
  }

  const handleDelete = async (reward) => {
    if (!confirm(`حذف مكافأة "${reward.title}"؟`)) return
    try {
      await api.delete(`/rewards/${reward.id}`)
      toast.success('تم الحذف')
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const handlePay = async (reward) => {
    if (!confirm(`صرف مكافأة "${reward.title}" بمبلغ ${fmt(reward.amount)} د.ع؟`)) return
    try {
      await api.post(`/rewards/${reward.id}/pay`)
      toast.success('تم الصرف')
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الصرف')
    }
  }

  const handlePayPeriod = async () => {
    if (!confirm(`صرف كل مكافآت ${MONTHS[selectedMonth - 1]} ${selectedYear}؟`)) return
    try {
      const res = await api.post('/rewards/pay-period', {
        year: selectedYear,
        month: selectedMonth,
      })
      toast.success(res.data.message)
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الصرف')
    }
  }

  const getCategoryInfo = (value) => categories.find(c => c.value === value) ||
    { label_ar: value, icon: '🎁' }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  const filtered = rewards.filter((r) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      r.teacher_name?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    )
  })

  // إحصائيات
  const stats = {
    total: rewards.length,
    totalAmount: rewards.reduce((s, r) => s + r.amount, 0),
    paid: rewards.filter(r => r.paid === 1).length,
    paidAmount: rewards.filter(r => r.paid === 1).reduce((s, r) => s + r.amount, 0),
    pending: rewards.filter(r => r.paid === 0).length,
    pendingAmount: rewards.filter(r => r.paid === 0).reduce((s, r) => s + r.amount, 0),
  }

  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="text-primary-500" size={26} />
            مكافآت المعلمين
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إدارة المكافآت الشهرية للمعلمين
          </p>
        </div>

        <div className="flex gap-2">
  
  {hasPermission('rewards.create') && (
    <button onClick={openAdd} className="btn-primary flex items-center gap-2">
      <Plus size={18} />
      إضافة مكافأة
    </button>
  )}
</div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <Gift size={22} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي المكافآت</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>الإجمالي المالي</p>
              <p className="text-lg font-bold text-amber-600">{fmt(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>تم الصرف</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(stats.paidAmount)}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{stats.paid} مكافأة</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>قيد الانتظار</p>
              <p className="text-lg font-bold text-red-500">{fmt(stats.pendingAmount)}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{stats.pending} مكافأة</p>
            </div>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث بالمعلم، العنوان..."
            className="input-modern ps-10"
          />
        </div>

        <select value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-modern !w-auto min-w-[180px]">
          <option value="">كل التصنيفات</option>
          {categories.map(c => (
            <option key={c.value} value={c.value}>{c.icon} {c.label_ar}</option>
          ))}
        </select>

        <select value={filterPaid}
                onChange={(e) => setFilterPaid(e.target.value)}
                className="input-modern !w-auto min-w-[140px]">
          <option value="">الكل</option>
          <option value="false">قيد الانتظار</option>
          <option value="true">تم الصرف</option>
        </select>
      </div>

      {/* جدول المكافآت */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Gift size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>
              {rewards.length === 0 ? 'لا توجد مكافآت بعد' : 'لا توجد نتائج مطابقة'}
            </p>
            {hasPermission('rewards.create') && rewards.length === 0 && (
              <button onClick={openAdd} className="btn-primary mt-4">
                <Plus size={18} />
                إضافة أول مكافأة
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">المعلم</th>
                  <th className="p-3 text-start">التصنيف</th>
                  <th className="p-3 text-start">العنوان</th>
                  <th className="p-3 text-start">المبلغ</th>
                  <th className="p-3 text-start">الشهر</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const catInfo = getCategoryInfo(r.category)
                  return (
                    <tr key={r.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 font-semibold">{r.teacher_name}</td>
                      <td className="p-3">
                        <span className="badge-info">
                          {catInfo.icon} {catInfo.label_ar}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{r.title}</div>
                        {r.description && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">
                        {fmt(r.amount)} د.ع
                      </td>
                      <td className="p-3 text-xs">
                        {MONTHS[r.reward_month - 1]} {r.reward_year}
                      </td>
                      <td className="p-3">
                        {r.paid === 1 ? (
  <span className="badge-success">
    <CheckCircle size={12} /> مضمّنة في الراتب
  </span>
) : (
  <span className="badge-info">
    <Clock size={12} /> ستُضاف للراتب
  </span>
)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {r.paid === 0 && hasPermission('rewards.edit') && (
                            <button
                              onClick={() => openEdit(r)}
                              className="btn-ghost !p-2 text-blue-500"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {r.paid === 0 && hasPermission('rewards.delete') && (
                            <button
                              onClick={() => handleDelete(r)}
                              className="btn-ghost !p-2 text-red-500"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {r.paid === 1 && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              ✓ تم الصرف
                            </span>
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

      {/* نافذة الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingReward ? 'تعديل المكافأة' : 'إضافة مكافأة جديدة'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost !p-2 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* المعلم */}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  المعلم <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="input-modern"
                  required
                  disabled={!!editingReward}
                >
                  <option value="">اختر المعلم...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.role === 'teacher' ? 'معلم' :
                                      t.role === 'accountant' ? 'محاسب' : 'مدير'})
                    </option>
                  ))}
                </select>
              </div>

              {/* التصنيف */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  التصنيف <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.map((c) => {
                    const isActive = formData.category === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: c.value })}
                        className="p-3 rounded-xl border-2 transition-all text-center"
                        style={{
                          borderColor: isActive ? '#6366F1' : 'var(--border-color)',
                          background: isActive ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
                        }}
                      >
                        <div className="text-2xl mb-1">{c.icon}</div>
                        <div className="text-xs font-bold"
                             style={{ color: isActive ? '#6366F1' : 'var(--text-primary)' }}>
                          {c.label_ar}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* العنوان */}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  العنوان <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-modern"
                  placeholder="مثال: التزام كامل بالدوام - أيلول"
                  required
                />
              </div>

              {/* الوصف */}
              <div>
                <label className="text-sm font-medium block mb-1.5">الوصف (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-modern"
                  rows="2"
                  placeholder="تفاصيل إضافية..."
                />
              </div>

              {/* المبلغ */}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  المبلغ (د.ع) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="input-modern"
                  min="1"
                  required
                />
              </div>

              {/* الشهر والسنة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">الشهر المستحق</label>
                  <select
                    value={formData.reward_month}
                    onChange={(e) => setFormData({ ...formData, reward_month: parseInt(e.target.value) })}
                    className="input-modern"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">السنة</label>
                  <select
                    value={formData.reward_year}
                    onChange={(e) => setFormData({ ...formData, reward_year: parseInt(e.target.value) })}
                    className="input-modern"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ملاحظات */}
              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-modern"
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingReward ? 'حفظ التعديلات' : 'إضافة المكافأة'}
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