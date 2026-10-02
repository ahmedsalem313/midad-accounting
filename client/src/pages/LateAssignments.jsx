import { useState, useEffect } from 'react'
import {
  AlertTriangle, Search, Phone, User, Users,
  BookOpen, CheckCircle, XCircle, Clock, TrendingDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType
} from '../utils/schoolData'

export default function LateAssignments() {
  const { user } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const isAdmin = user?.role === 'admin'
  const isAdvisor = user?.is_advisor === 1 || user?.is_advisor === true
  const advisorGrade = user?.advisor_grade
  const advisorSection = user?.advisor_section

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = {}

      if (isAdmin) {
        if (filterGrade) params.grade = filterGrade
        if (filterSection) params.section = filterSection
      } else if (isAdvisor) {
        params.grade = advisorGrade
        if (advisorSection) params.section = advisorSection
      }

      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate

      const res = await api.get('/assignments/reports/late', { params })
      setStudents(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل البيانات')
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

  // إحصائيات عامة
  const stats = {
    total: students.length,
    totalLate: students.reduce((sum, s) => sum + (s.late_count || 0), 0),
    totalNotSubmitted: students.reduce((sum, s) => sum + (s.not_submitted_count || 0), 0),
  }

  const getSeverity = (student) => {
    const total = (student.late_count || 0) + (student.not_submitted_count || 0)
    if (total >= 5) return { level: 'critical', label: 'خطير', color: '#DC2626' }
    if (total >= 3) return { level: 'high', label: 'مقلق', color: '#EA580C' }
    if (total >= 1) return { level: 'medium', label: 'يحتاج متابعة', color: '#F59E0B' }
    return { level: 'ok', label: 'جيد', color: '#10B981' }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={26} />
          المتأخرون في الواجبات
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {isAdmin
            ? 'متابعة الطلاب المتأخرين عن تسليم الواجبات'
            : isAdvisor
              ? `طلاب صفك: ${advisorGrade} ${advisorSection ? '- شعبة ' + advisorSection : ''}`
              : 'لا يوجد طلاب لعرضهم'}
        </p>
      </div>

      {/* بطاقات إحصائية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>عدد الطلاب</p>
              <p className="text-xl font-bold text-amber-600">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(234,88,12,0.15)', color: '#EA580C' }}>
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي التأخيرات</p>
              <p className="text-xl font-bold text-orange-600">{stats.totalLate}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(220,38,38,0.15)', color: '#DC2626' }}>
              <XCircle size={22} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>لم يُسلِّموا</p>
              <p className="text-xl font-bold text-red-600">{stats.totalNotSubmitted}</p>
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
            placeholder="🔍 بحث بالطالب أو ولي الأمر..."
            className="input-modern ps-10"
          />
        </div>

        {isAdmin && (
          <>
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
                    className="input-modern !w-auto min-w-[150px]">
              <option value="">كل الصفوف</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)}
                    className="input-modern !w-auto min-w-[100px]">
              <option value="">كل الشعب</option>
              {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
            </select>
          </>
        )}

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
               className="input-modern !w-auto" placeholder="من" />

        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
               className="input-modern !w-auto" placeholder="إلى" />

        <button onClick={fetchData} className="btn-primary">
          تطبيق الفلاتر
        </button>
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
            <p style={{ color: 'var(--text-secondary)' }}>
              {students.length === 0 ? 'لا توجد بيانات' : 'لا توجد نتائج مطابقة'}
            </p>
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
                  <th className="p-3 text-center">الواجبات الكلية</th>
                  <th className="p-3 text-center">تأخيرات</th>
                  <th className="p-3 text-center">لم يُسلِّم</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const sev = getSeverity(s)
                  return (
                    <tr key={s.student_id} className="border-b hover:bg-amber-50/30 dark:hover:bg-amber-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3 font-semibold">{s.full_name}</td>
                      <td className="p-3 text-xs">{s.grade} {s.section && `- ${s.section}`}</td>
                      <td className="p-3 text-xs">{s.guardian_name}</td>
                      <td className="p-3 text-xs" dir="ltr">{s.guardian_phone}</td>
                      <td className="p-3 text-center font-bold">{s.total_assignments}</td>
                      <td className="p-3 text-center">
                        <span className="badge-warning">{s.late_count}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="badge-danger">{s.not_submitted_count}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="badge"
                              style={{ background: sev.color + '20', color: sev.color, fontWeight: 'bold' }}>
                          {sev.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}