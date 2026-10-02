import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users,
  Calendar, Download, Printer, FileText, PieChart as PieIcon,
  ArrowUpRight, ArrowDownRight, Wallet, Receipt, AlertCircle,
  CheckCircle
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getGradesByType, getCurrentSchoolType } from '../utils/schoolData'

// ============================================
// ثوابت
// ============================================
const TABS = [
  { id: 'comprehensive', label: 'شامل',         icon: FileText },
  { id: 'yearly',        label: 'سنوي',         icon: BarChart3 },
  { id: 'balance',       label: 'الميزانية',    icon: Wallet },
  { id: 'outstanding',   label: 'المتأخرون',    icon: AlertCircle },
]

const CATEGORY_NAMES = {
  salaries: 'رواتب', rent: 'إيجار', electricity: 'كهرباء', water: 'ماء',
  internet: 'إنترنت', stationery: 'قرطاسية', maintenance: 'صيانة',
  cleaning: 'نظافة', transport: 'نقل', food: 'طعام', other: 'أخرى',
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                '#3B82F6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#64748B']

// ============================================
// المكوّن الرئيسي
// ============================================
export default function Reports() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [activeTab, setActiveTab] = useState('comprehensive')
  const [loading, setLoading] = useState(false)

  // فلتر التاريخ
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [fromDate, setFromDate] = useState(firstOfMonth.toISOString().split('T')[0])
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0])

  // البيانات
  const [comprehensive, setComprehensive] = useState(null)
  const [yearly, setYearly] = useState(null)
  const [balance, setBalance] = useState(null)
  const [outstanding, setOutstanding] = useState(null)

  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

  // فلاتر المتأخرين
  const [outstandingGrade, setOutstandingGrade] = useState('')
  const [outstandingFromDate, setOutstandingFromDate] = useState('')
  const [outstandingToDate, setOutstandingToDate] = useState('')

  // ============================================
  // تحميل البيانات عند تغيير التبويب
  // ============================================
  useEffect(() => {
    if (activeTab === 'comprehensive') fetchComprehensive()
    else if (activeTab === 'yearly') fetchYearly()
    else if (activeTab === 'balance') fetchBalance()
    else if (activeTab === 'outstanding') fetchOutstanding()
  }, [activeTab, selectedYear])

  // ============================================
  // دوال الجلب
  // ============================================
  const fetchComprehensive = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/comprehensive', {
        params: { from_date: fromDate, to_date: toDate },
      })
      setComprehensive(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }

  const fetchYearly = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/yearly', { params: { year: selectedYear } })
      setYearly(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }

  const fetchBalance = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/balance')
      setBalance(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }

  const fetchOutstanding = async () => {
    setLoading(true)
    try {
      const params = {}
      if (outstandingGrade) params.grade = outstandingGrade
      if (outstandingFromDate) params.from_date = outstandingFromDate
      if (outstandingToDate) params.to_date = outstandingToDate

      const res = await api.get('/reports/outstanding', { params })
      setOutstanding(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // دوال مساعدة
  // ============================================
  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  const exportOutstandingToExcel = () => {
    if (!outstanding?.students?.length) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const data = outstanding.students.map((s, i) => ({
      'الرقم': i + 1,
      'اسم الطالب': s.full_name,
      'الصف': s.grade,
      'الشعبة': s.section || '',
      'ولي الأمر': s.guardian_name || '',
      'الهاتف': s.guardian_phone || '',
      'الرسوم الكلية': s.total_fees,
      'المدفوع': s.total_paid,
      'المتبقي': s.remaining,
      'تاريخ آخر دفعة': s.last_payment_date || 'لم يدفع',
      'أيام منذ آخر دفعة': s.days_since_payment ?? '—',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المتأخرون')

    const filename = `المتأخرون_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, filename)

    toast.success('تم التصدير بنجاح')
  }

  const printOutstanding = () => {
    window.print()
  }

  // ============================================
  // العرض
  // ============================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="text-primary-500" size={26} />
          التقارير المالية
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          تحليلات مالية شاملة للمدرسة
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-all ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-slate-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' } : {}}
            >
              <Icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* المحتوى */}
      {loading ? (
        <div className="glass-card p-10 text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
        </div>
      ) : (
        <>
          {/* ============ تبويب شامل ============ */}
          {activeTab === 'comprehensive' && comprehensive && (
            <>
              <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
                <label className="text-sm font-medium">من:</label>
                <input type="date" value={fromDate}
                       onChange={(e) => setFromDate(e.target.value)}
                       className="input-modern !w-auto" />
                <label className="text-sm font-medium">إلى:</label>
                <input type="date" value={toDate}
                       onChange={(e) => setToDate(e.target.value)}
                       className="input-modern !w-auto" />
                <button onClick={fetchComprehensive} className="btn-primary">
                  تحديث
                </button>
                <button onClick={() => window.print()} className="btn-ghost border-2"
                        style={{ borderColor: 'var(--border-color)' }}>
                  <Printer size={16} /> طباعة
                </button>
              </div>

              {/* بطاقات ملخص */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>الإيرادات</p>
                      <h3 className="text-xl font-bold text-emerald-600">{fmt(comprehensive.summary.totalIncome)}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {comprehensive.summary.incomeCount} دفعة
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                      <TrendingUp size={20} />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>المصاريف</p>
                      <h3 className="text-xl font-bold text-red-500">{fmt(comprehensive.summary.totalExpenses)}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {comprehensive.summary.expensesCount} مصروف
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                      <TrendingDown size={20} />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>صافي الربح</p>
                      <h3 className={`text-xl font-bold ${comprehensive.summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(comprehensive.summary.netProfit)}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {comprehensive.summary.netProfit >= 0 ? '✅ ربح' : '⚠️ خسارة'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{
                           background: comprehensive.summary.netProfit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                           color: comprehensive.summary.netProfit >= 0 ? '#10B981' : '#EF4444',
                         }}>
                      <DollarSign size={20} />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>نسبة التحصيل</p>
                      <h3 className="text-xl font-bold" style={{ color: '#8B5CF6' }}>
                        {comprehensive.summary.collectionRate}%
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        من {fmt(comprehensive.summary.totalExpected)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                      <PieIcon size={20} />
                    </div>
                  </div>
                </div>
              </div>

              {/* الإحصائيات العامة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي الرسوم</p>
                  <p className="text-lg font-bold">{fmt(comprehensive.summary.totalExpected)}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي المحصل</p>
                  <p className="text-lg font-bold text-emerald-600">{fmt(comprehensive.summary.totalCollected)}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>إجمالي المتأخرات</p>
                  <p className="text-lg font-bold text-red-500">{fmt(comprehensive.summary.totalRemaining)}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>عدد الطلاب</p>
                  <p className="text-lg font-bold">{comprehensive.studentsStats.active}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    من {comprehensive.studentsStats.total}
                  </p>
                </div>
              </div>

              {/* الرسم البياني */}
              {comprehensive.expensesByCategory.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="font-bold mb-4">📊 المصاريف حسب الفئة</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={comprehensive.expensesByCategory.map((c) => ({
                          name: CATEGORY_NAMES[c.category] || c.category,
                          value: c.total,
                        }))}
                        cx="50%" cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {comprehensive.expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmt(value) + ' د.ع'} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* تفاصيل المصاريف */}
              {comprehensive.expensesByCategory.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <h3 className="font-bold">تفصيل المصاريف</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <th className="p-3 text-start">الفئة</th>
                        <th className="p-3 text-start">العدد</th>
                        <th className="p-3 text-start">الإجمالي</th>
                        <th className="p-3 text-start">النسبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprehensive.expensesByCategory.map((c, i) => {
                        const percent = comprehensive.summary.totalExpenses > 0
                          ? (c.total / comprehensive.summary.totalExpenses) * 100
                          : 0
                        return (
                          <tr key={c.category} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="p-3 font-medium">{CATEGORY_NAMES[c.category] || c.category}</td>
                            <td className="p-3">{c.count}</td>
                            <td className="p-3 font-bold text-red-500">{fmt(c.total)} د.ع</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full overflow-hidden"
                                     style={{ background: 'var(--border-color)' }}>
                                  <div className="h-full rounded-full"
                                       style={{ width: `${percent}%`, background: COLORS[i % COLORS.length] }} />
                                </div>
                                <span className="text-xs font-semibold w-12">
                                  {percent.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ============ تبويب سنوي ============ */}
          {activeTab === 'yearly' && yearly && (
            <>
              <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
                <label className="text-sm font-medium">السنة:</label>
                <select value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input-modern !w-auto">
                  {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button onClick={fetchYearly} className="btn-primary">تحديث</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                      <TrendingUp size={22} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الإيرادات</p>
                      <p className="text-xl font-bold text-emerald-600">{fmt(yearly.totals.income)}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                      <TrendingDown size={22} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي المصاريف</p>
                      <p className="text-xl font-bold text-red-500">{fmt(yearly.totals.expense)}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                         style={{
                           background: yearly.totals.net >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                           color: yearly.totals.net >= 0 ? '#10B981' : '#EF4444',
                         }}>
                      <DollarSign size={22} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>صافي الربح</p>
                      <p className={`text-xl font-bold ${yearly.totals.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(yearly.totals.net)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-bold mb-4">📈 الإيرادات والمصاريف خلال {yearly.year}</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={yearly.months}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="monthName" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => fmt(value) + ' د.ع'}
                      contentStyle={{
                        background: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(31,38,135,0.15)',
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3}
                          fill="url(#incomeGrad)" name="الإيرادات" />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3}
                          fill="url(#expenseGrad)" name="المصاريف" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="p-3 text-start">الشهر</th>
                      <th className="p-3 text-start">الإيرادات</th>
                      <th className="p-3 text-start">المصاريف</th>
                      <th className="p-3 text-start">الصافي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearly.months.map((m) => (
                      <tr key={m.month} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-3 font-medium">{m.monthName}</td>
                        <td className="p-3 text-emerald-600">{fmt(m.income)}</td>
                        <td className="p-3 text-red-500">{fmt(m.expense)}</td>
                        <td className={`p-3 font-bold ${m.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fmt(m.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(99,102,241,0.08)', borderTop: '2px solid #6366F1' }}>
                      <td className="p-3 font-bold">الإجمالي</td>
                      <td className="p-3 font-bold text-emerald-600">{fmt(yearly.totals.income)}</td>
                      <td className="p-3 font-bold text-red-500">{fmt(yearly.totals.expense)}</td>
                      <td className={`p-3 font-bold ${yearly.totals.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(yearly.totals.net)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* ============ تبويب الميزانية ============ */}
          {activeTab === 'balance' && balance && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-emerald-600">
                    <ArrowUpRight size={20} />
                    الأصول
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-xl"
                         style={{ background: 'rgba(16,185,129,0.08)' }}>
                      <span>إجمالي المحصل</span>
                      <span className="font-bold">{fmt(balance.assets.collected)} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl"
                         style={{ background: 'rgba(245,158,11,0.08)' }}>
                      <span>المتأخرات (ديون)</span>
                      <span className="font-bold text-amber-600">{fmt(balance.assets.outstanding)} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl"
                         style={{ background: 'rgba(99,102,241,0.15)', border: '2px solid #6366F1' }}>
                      <span className="font-bold">الإجمالي</span>
                      <span className="font-bold text-primary-600">{fmt(balance.assets.total)} د.ع</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-600">
                    <ArrowDownRight size={20} />
                    الالتزامات
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-xl"
                         style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <span>المصاريف</span>
                      <span className="font-bold">{fmt(balance.liabilities.expenses)} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl"
                         style={{ background: 'rgba(139,92,246,0.08)' }}>
                      <span>الرواتب المدفوعة</span>
                      <span className="font-bold text-purple-600">{fmt(balance.liabilities.payrolls)} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl"
                         style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <span>السلف</span>
                      <span className="font-bold text-blue-600">{fmt(balance.liabilities.advances)} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl"
                         style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid #EF4444' }}>
                      <span className="font-bold">الإجمالي</span>
                      <span className="font-bold text-red-600">{fmt(balance.liabilities.total)} د.ع</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`glass-card p-6 ${
                balance.net >= 0
                  ? 'border-2 border-emerald-500'
                  : 'border-2 border-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                      صافي المركز المالي
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      (المحصل - المصاريف - الرواتب)
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={`text-3xl font-bold ${balance.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmt(balance.net)} د.ع
                    </p>
                    <p className="text-sm mt-1">
                      {balance.net >= 0 ? '✅ ربح' : '⚠️ خسارة'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============ تبويب المتأخرين ============ */}
          {activeTab === 'outstanding' && outstanding && (
            <>
              {/* فلاتر */}
              <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
                <label className="text-sm font-medium">الصف:</label>
                <select
                  value={outstandingGrade}
                  onChange={(e) => setOutstandingGrade(e.target.value)}
                  className="input-modern !w-auto min-w-[150px]"
                >
                  <option value="">كل الصفوف</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>

                <label className="text-sm font-medium">آخر دفعة من:</label>
                <input
                  type="date"
                  value={outstandingFromDate}
                  onChange={(e) => setOutstandingFromDate(e.target.value)}
                  className="input-modern !w-auto"
                />

                <label className="text-sm font-medium">إلى:</label>
                <input
                  type="date"
                  value={outstandingToDate}
                  onChange={(e) => setOutstandingToDate(e.target.value)}
                  className="input-modern !w-auto"
                />

                <button onClick={fetchOutstanding} className="btn-primary">
                  تطبيق
                </button>

                {(outstandingGrade || outstandingFromDate || outstandingToDate) && (
                  <button
                    onClick={() => {
                      setOutstandingGrade('')
                      setOutstandingFromDate('')
                      setOutstandingToDate('')
                    }}
                    className="btn-ghost text-red-500"
                  >
                    مسح الفلاتر
                  </button>
                )}

                <div className="ms-auto flex gap-2">
                  <button
                    onClick={exportOutstandingToExcel}
                    className="btn-ghost border-2 flex items-center gap-2"
                    style={{ borderColor: 'rgba(16,185,129,0.4)', color: '#10B981' }}
                  >
                    <Download size={16} />
                    Excel
                  </button>
                  <button
                    onClick={printOutstanding}
                    className="btn-ghost border-2 flex items-center gap-2"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <Printer size={16} />
                    طباعة
                  </button>
                </div>
              </div>

              {/* الإحصائيات */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>عدد المتأخرين</p>
                      <p className="text-xl font-bold text-red-500">{outstanding.count}</p>
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
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي المتأخرات</p>
                      <p className="text-xl font-bold text-amber-600">{fmt(outstanding.total)} د.ع</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                      <Users size={22} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>متوسط المتأخرات</p>
                      <p className="text-xl font-bold text-primary-600">
                        {outstanding.count > 0 ? fmt(Math.round(outstanding.total / outstanding.count)) : 0} د.ع
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* إحصائيات حسب الصف */}
              {Object.keys(outstanding.byGrade).length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="font-bold mb-3">📊 المتأخرات حسب الصف</h3>
                  <div className="space-y-2">
                    {Object.entries(outstanding.byGrade)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([grade, info]) => {
                        const percent = outstanding.total > 0 ? (info.total / outstanding.total) * 100 : 0
                        return (
                          <div key={grade} className="flex items-center gap-3">
                            <div className="w-40 text-sm font-medium truncate">{grade}</div>
                            <div className="flex-1 h-3 rounded-full overflow-hidden"
                                 style={{ background: 'var(--border-color)' }}>
                              <div className="h-full rounded-full"
                                   style={{ width: `${percent}%`, background: '#EF4444' }} />
                            </div>
                            <div className="text-end text-sm w-40">
                              <span className="font-bold text-red-500">{fmt(info.total)}</span>
                              <span className="text-xs ms-1" style={{ color: 'var(--text-secondary)' }}>
                                ({info.count} طالب)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* الجدول */}
              <div className="glass-card overflow-hidden">
                {outstanding.students.length === 0 ? (
                  <div className="p-10 text-center">
                    <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
                    <p style={{ color: 'var(--text-secondary)' }}>لا يوجد متأخرون 🎉</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <th className="p-3 text-start">#</th>
                          <th className="p-3 text-start">الطالب</th>
                          <th className="p-3 text-start">الصف</th>
                          <th className="p-3 text-start">ولي الأمر</th>
                          <th className="p-3 text-start">الهاتف</th>
                          <th className="p-3 text-start">الرسوم</th>
                          <th className="p-3 text-start">المدفوع</th>
                          <th className="p-3 text-start">المتبقي</th>
                          <th className="p-3 text-start">آخر دفعة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstanding.students.map((s, i) => (
                          <tr key={s.id} className="border-b hover:bg-red-50/40 dark:hover:bg-red-900/10"
                              style={{ borderColor: 'var(--border-color)' }}>
                            <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                            <td className="p-3 font-semibold">{s.full_name}</td>
                            <td className="p-3 text-xs">{s.grade} {s.section && `- ${s.section}`}</td>
                            <td className="p-3 text-xs">{s.guardian_name}</td>
                            <td className="p-3 text-xs" dir="ltr">{s.guardian_phone}</td>
                            <td className="p-3">{fmt(s.total_fees)}</td>
                            <td className="p-3 text-emerald-600">{fmt(s.total_paid)}</td>
                            <td className="p-3 font-bold text-red-500">{fmt(s.remaining)} د.ع</td>
                            <td className="p-3 text-xs">
                              {s.last_payment_date ? (
                                <>
                                  <span dir="ltr">{s.last_payment_date}</span>
                                  <br />
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    ({s.days_since_payment} يوم)
                                  </span>
                                </>
                              ) : (
                                <span className="badge-danger text-xs">لم يدفع</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}