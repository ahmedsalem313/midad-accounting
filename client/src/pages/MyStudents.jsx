import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Search, Eye, Award, CheckSquare, GraduationCap,
  AlertCircle, TrendingUp, FileText, User, MessageSquare, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function MyStudents() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [info, setInfo] = useState(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users/me/students')
      setStudents(res.data.data)
      setInfo({
        isAdmin: res.data.isAdmin,
        isAdvisor: res.data.isAdvisor,
        advisorInfo: res.data.advisorInfo,
      })
    } catch (e) {
      toast.error('فشل تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.guardian_name?.toLowerCase().includes(q) ||
      s.guardian_phone?.includes(q)
    )
  })

  const getAbsenceBadge = (level) => {
    if (level === 0) return { label: 'نشط', color: '#10B981', icon: '✓' }
    if (level === 1) return { label: 'إنذار', color: '#F59E0B', icon: '🔔' }
    if (level === 2) return { label: 'إنذار 2', color: '#EA580C', icon: '⚠️' }
    if (level === 3) return { label: 'تعهد', color: '#DC2626', icon: '🟠' }
    if (level === 4) return { label: 'راسب', color: '#7F1D1D', icon: '❌' }
    return { label: '—', color: '#64748B', icon: '—' }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="text-primary-500" size={26} />
          {info?.isAdmin ? 'كل الطلاب' : 'طلابي'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {info?.isAdmin
            ? 'كل طلاب المدرسة'
            : info?.isAdvisor
              ? `صف الإرشاد: ${info.advisorInfo?.grade} ${info.advisorInfo?.section ? '- شعبة ' + info.advisorInfo.section : ''}`
              : 'أنت لست مرشداً لأي صف'}
        </p>
      </div>

      {/* إذا لم يكن مرشداً ولا مديراً */}
      {!info?.isAdmin && !info?.isAdvisor && (
        <div className="glass-card p-10 text-center">
          <AlertCircle size={48} className="mx-auto mb-3 text-amber-500" />
          <h3 className="text-xl font-bold mb-2">أنت لست مرشداً</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            تواصل مع المدير لتعيينك مرشداً لصف
          </p>
        </div>
      )}

      {/* المحتوى */}
      {(info?.isAdmin || info?.isAdvisor) && (
        <>
          {/* إحصائيات */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الطلاب</p>
                  <p className="text-xl font-bold">{students.length}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  <CheckSquare size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>نشطون</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {students.filter(s => s.absence_level === 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>في خطر</p>
                  <p className="text-xl font-bold text-amber-500">
                    {students.filter(s => s.absence_level >= 2).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>راسبون</p>
                  <p className="text-xl font-bold text-red-500">
                    {students.filter(s => s.absence_level >= 4).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* بحث */}
          <div className="glass-card p-4">
            <div className="relative">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                      style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 بحث بالاسم أو ولي الأمر..."
                className="input-modern ps-10"
              />
            </div>
          </div>

          {/* جدول */}
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-10 text-center">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : filtered.length === 0 ? (
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
                      <th className="p-3 text-start">الطالب</th>
                      <th className="p-3 text-start">الصف</th>
                      <th className="p-3 text-start">ولي الأمر</th>
                      <th className="p-3 text-start">الهاتف</th>
                      <th className="p-3 text-center">حالة الغياب</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const absInfo = getAbsenceBadge(s.absence_level)
                      return (
                        <tr key={s.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                            style={{ borderColor: 'var(--border-color)' }}>
                          <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                          <td className="p-3 font-semibold">{s.full_name}</td>
                          <td className="p-3 text-xs">
                            {s.grade} {s.section && `- ${s.section}`}
                          </td>
                          <td className="p-3 text-xs">{s.guardian_name}</td>
                          <td className="p-3 text-xs" dir="ltr">{s.guardian_phone}</td>
                          <td className="p-3 text-center">
                            <span className="badge" style={{ background: `${absInfo.color}20`, color: absInfo.color }}>
                              {absInfo.icon} {absInfo.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => navigate(`/students/${s.id}`)}
                                className="btn-ghost !p-2 text-blue-500"
                                title="تفاصيل الطالب"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => navigate(`/behavior?student=${s.id}`)}
                                className="btn-ghost !p-2 text-emerald-500"
                                title="تقييم السلوك"
                              >
                                <Award size={16} />
                              </button>
                              <button
  onClick={() => navigate(`/students/${s.id}/notes`)}
  className="btn-ghost !p-2 text-purple-500"
  title="الملاحظات"
>
  <MessageSquare size={16} />
</button>
<button
  onClick={() => navigate(`/students/${s.id}/absences`)}
  className="btn-ghost !p-2 text-red-500"
  title="إدارة الغيابات"
>
  <Calendar size={16} />
</button>
                              <button
                                onClick={() => navigate(`/grades`)}
                                className="btn-ghost !p-2 text-purple-500"
                                title="الدرجات"
                              >
                                <GraduationCap size={16} />
                              </button>
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
        </>
      )}
    </div>
  )
}