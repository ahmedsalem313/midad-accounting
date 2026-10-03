import { useState, useEffect } from 'react'
import { Users, Wallet, Receipt, AlertCircle, TrendingUp, Activity, Calendar as CalendarIcon, BarChart3, PieChart as PieIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import api from '../services/api'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'

const StatCard = ({ icon: Icon, title, value, unit, color }) => (
  <div className="glass-card p-5 animate-slide-up">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        <h3 className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm ms-1 font-normal" style={{ color: 'var(--text-secondary)' }}>{unit}</span>}
        </h3>
      </div>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: `${color}20`, color }}>
        <Icon size={22} />
      </div>
    </div>
  </div>
)

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState([])
  const [yearly, setYearly] = useState(null)
  const [studentsStats, setStudentsStats] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboard()
    fetchUpcoming()
    fetchYearly()
    fetchStudentsStats()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard')
      setData(res.data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcoming = async () => {
    try {
      const res = await api.get('/calendar/upcoming', { params: { limit: 5 } })
      setUpcoming(res.data.data || [])
    } catch (e) {
      console.error('فشل تحميل الأحداث القادمة:', e)
    }
  }

  const fetchYearly = async () => {
    try {
      const res = await api.get('/reports/yearly')
      setYearly(res.data.data)
    } catch (e) {
      console.error('فشل تحميل التقرير السنوي:', e)
    }
  }

  const fetchStudentsStats = async () => {
    try {
      const res = await api.get('/reports/students-stats')
      setStudentsStats(res.data.data)
    } catch (e) {
      console.error('فشل تحميل إحصائيات الطلاب:', e)
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')
  const fmtShort = (n) => {
    if (!n) return '0'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
    return n.toString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // بيانات الرسم الشهري (من /reports/yearly)
  const monthlyData = yearly?.months?.map(m => ({
    name: m.monthName.slice(0, 4),
    income: m.income,
    expense: m.expense,
    net: m.net,
  })) || []

  // بيانات دائرة توزيع الطلاب حسب الصف
  const gradeData = studentsStats?.byGrade?.map(g => ({
    name: g.grade,
    value: g.count,
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">مرحباً، {user?.full_name} 👋</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          نظرة سريعة على إحصائيات المدرسة
        </p>
      </div>

      {/* ============ البطاقات الإحصائية ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       title="الطلاب النشطون"    value={fmt(data?.studentsCount)}  color="#6366F1" />
        <StatCard icon={Wallet}      title="الأقساط المحصلة"   value={fmt(data?.totalPaid)}     unit="د.ع" color="#10B981" />
        <StatCard icon={Receipt}     title="مصاريف الشهر"      value={fmt(data?.monthExpenses)} unit="د.ع" color="#F59E0B" />
        <StatCard icon={AlertCircle} title="إجمالي المتأخرات"  value={fmt(data?.totalRemaining)} unit="د.ع" color="#EF4444" />
      </div>

      {/* ============ الصف الأول: نسبة التحصيل + المعلمون + الحضور ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> نسبة التحصيل
          </h3>
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="rgba(148,163,184,0.2)" strokeWidth="12" fill="none" />
                <circle
                  cx="64" cy="64" r="56"
                  stroke="#10B981" strokeWidth="12" fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - (data?.collectionRate || 0) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{data?.collectionRate || 0}%</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              من إجمالي {fmt(data?.totalExpected)} د.ع
            </p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Users size={18} /> المعلمون
          </h3>
          <div className="text-center py-4">
            <p className="text-5xl font-bold mb-2" style={{ color: '#6366F1' }}>
              {data?.teachersCount || 0}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>معلم نشط</p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Activity size={18} /> حضور اليوم
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">✅ حاضر</span>
              <span className="font-bold text-emerald-500">{data?.todayAttendance?.present || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">⚠️ متأخر</span>
              <span className="font-bold text-amber-500">{data?.todayAttendance?.late || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">❌ غائب</span>
              <span className="font-bold text-red-500">{data?.todayAttendance?.absent || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ الصف الثاني: رسم الإيرادات والمصاريف ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} /> الإيرادات والمصاريف الشهرية ({yearly?.year})
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtShort} />
              <Tooltip
                formatter={(value) => fmt(value) + ' د.ع'}
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8 }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" name="الإيرادات" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" name="المصاريف" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <PieIcon size={18} /> توزيع الطلاب حسب الصف
          </h3>
          {gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={gradeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {gradeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => value + ' طالب'}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-16 text-sm" style={{ color: 'var(--text-secondary)' }}>لا توجد بيانات</p>
          )}
        </div>
      </div>

      {/* ============ الصف الثالث: صافي الربح الشهري ============ */}
      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> صافي الربح الشهري ({yearly?.year})
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtShort} />
            <Tooltip
              formatter={(value) => fmt(value) + ' د.ع'}
              contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#6366F1"
              strokeWidth={3}
              name="صافي الربح"
              dot={{ r: 5, fill: '#6366F1' }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ============ الأحداث القادمة ============ */}
      {upcoming.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <CalendarIcon size={18} className="text-primary-500" />
              الأحداث القادمة
            </h3>
            <a href="/calendar" className="text-xs font-medium text-primary-500 hover:underline">
              عرض التقويم ←
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {upcoming.map((ev) => {
              const daysLeft = Math.ceil(
                (new Date(ev.start_date) - new Date()) / (1000 * 60 * 60 * 24)
              )
              const typeColors = {
                exam: '#EF4444', holiday: '#10B981', meeting: '#F59E0B',
                activity: '#8B5CF6', deadline: '#DC2626', event: '#6366F1',
              }
              const color = ev.color || typeColors[ev.type] || '#6366F1'
              const icons = {
                exam: '📝', holiday: '🎉', meeting: '👥',
                activity: '🎨', deadline: '⏰', event: '📌',
              }

              return (
                <a
                  key={ev.id}
                  href="/calendar"
                  className="p-3 rounded-xl transition-all hover:scale-[1.03] block"
                  style={{ background: `${color}10`, borderInlineStart: `4px solid ${color}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{icons[ev.type] || '📌'}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: daysLeft <= 3 ? 'rgba(239,68,68,0.15)' : `${color}20`,
                        color: daysLeft <= 3 ? '#DC2626' : color,
                      }}
                    >
                      {daysLeft === 0 ? 'اليوم' : daysLeft === 1 ? 'غدًا' : `${daysLeft} يوم`}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm truncate mb-1">{ev.title}</h4>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {format(new Date(ev.start_date), 'EEEE d MMM', { locale: ar })}
                  </p>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}