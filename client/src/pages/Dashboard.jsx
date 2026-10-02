import { useState, useEffect } from 'react'
import { Users, Wallet, Receipt, AlertCircle, TrendingUp, Activity } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

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
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboard()
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
    </div>
  )
}