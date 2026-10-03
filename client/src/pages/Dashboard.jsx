import { useState, useEffect } from 'react'
import { Users, Wallet, Receipt, AlertCircle, TrendingUp, Activity, Calendar as CalendarIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
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

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
    const [upcoming, setUpcoming] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboard()
    fetchUpcoming()
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
  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">مرحباً، {user?.full_name} 👋</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          نظرة سريعة على إحصائيات المدرسة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       title="الطلاب النشطون"    value={fmt(data?.studentsCount)}  color="#6366F1" />
        <StatCard icon={Wallet}      title="الأقساط المحصلة"   value={fmt(data?.totalPaid)}     unit="د.ع" color="#10B981" />
        <StatCard icon={Receipt}     title="مصاريف الشهر"      value={fmt(data?.monthExpenses)} unit="د.ع" color="#F59E0B" />
        <StatCard icon={AlertCircle} title="إجمالي المتأخرات"  value={fmt(data?.totalRemaining)} unit="د.ع" color="#EF4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* نسبة التحصيل */}
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

        {/* المعلمون */}
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

               {/* حضور اليوم */}
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

      {/* ============================================ */}
      {/* الأحداث القادمة من التقويم */}
      {/* ============================================ */}
      {upcoming.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <CalendarIcon size={18} className="text-primary-500" />
              الأحداث القادمة
            </h3>
            <a
              href="/calendar"
              className="text-xs font-medium text-primary-500 hover:underline"
            >
              عرض التقويم ←
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {upcoming.map((ev) => {
              const daysLeft = Math.ceil(
                (new Date(ev.start_date) - new Date()) / (1000 * 60 * 60 * 24)
              )
              const typeColors = {
                exam: '#EF4444',
                holiday: '#10B981',
                meeting: '#F59E0B',
                activity: '#8B5CF6',
                deadline: '#DC2626',
                event: '#6366F1',
              }
              const color = ev.color || typeColors[ev.type] || '#6366F1'
              const icons = {
                exam: '📝',
                holiday: '🎉',
                meeting: '👥',
                activity: '🎨',
                deadline: '⏰',
                event: '📌',
              }

              return (
                <a
                  key={ev.id}
                  href="/calendar"
                  className="p-3 rounded-xl transition-all hover:scale-[1.03] block"
                  style={{
                    background: `${color}10`,
                    borderInlineStart: `4px solid ${color}`,
                  }}
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
                      {daysLeft === 0
                        ? 'اليوم'
                        : daysLeft === 1
                        ? 'غدًا'
                        : `${daysLeft} يوم`}
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