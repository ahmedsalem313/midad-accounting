import { useState, useEffect } from 'react'
import {
  Trophy, Medal, Award, Users, Search, TrendingUp,
  GraduationCap, Phone, User, Star, AlertTriangle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType
} from '../utils/schoolData'

export default function TopStudents() {
  const { user } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const isAdmin = user?.role === 'admin'
  const isAdvisor = user?.is_advisor === 1 || user?.is_advisor === true
  const advisorGrade = user?.advisor_grade
  const advisorSection = user?.advisor_section

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState(
    isAdvisor && advisorGrade ? advisorGrade : GRADES[0]
  )
  const [selectedSection, setSelectedSection] = useState(
    isAdvisor && advisorSection ? advisorSection : SECTIONS[0]
  )
  const [limit, setLimit] = useState(5)

  useEffect(() => {
    fetchData()
  }, [selectedGrade, selectedSection, limit])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = { limit }

      if (isAdmin) {
        params.grade = selectedGrade
        params.section = selectedSection
      } else if (isAdvisor) {
        params.grade = advisorGrade
        if (advisorSection) params.section = advisorSection
      }

      const res = await api.get('/students/top/ranking', { params })
      setStudents(res.data.data)
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const getMedalColor = (rank) => {
    if (rank === 1) return { bg: 'linear-gradient(135deg, #FCD34D, #F59E0B)', color: '#78350F' }
    if (rank === 2) return { bg: 'linear-gradient(135deg, #E5E7EB, #9CA3AF)', color: '#374151' }
    if (rank === 3) return { bg: 'linear-gradient(135deg, #FDBA74, #C2410C)', color: '#7C2D12' }
    return { bg: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#FFFFFF' }
  }

  const getScoreColor = (avg) => {
    if (avg >= 90) return '#10B981'
    if (avg >= 75) return '#3B82F6'
    if (avg >= 50) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="text-amber-500" size={26} />
          الأوائل
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {isAdmin
            ? 'ترتيب الطلاب حسب المعدل العام'
            : isAdvisor
              ? `أوائل صفك: ${advisorGrade} ${advisorSection ? '- شعبة ' + advisorSection : ''}`
              : 'لا يوجد طلاب لعرضهم'}
        </p>
      </div>

      {/* الفلاتر */}
      {/* معلومات الأوزان */}
<div className="glass-card p-4">
  <div className="flex flex-wrap gap-4 items-center text-xs">
    <div className="flex items-center gap-2">
      <span className="font-bold">⚖️ معادلة الترتيب:</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ background: '#6366F1' }}></div>
      <span>📚 المعدل × 70%</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ background: '#10B981' }}></div>
      <span>✅ الحضور × 20%</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }}></div>
      <span>🎯 السلوك × 10%</span>
    </div>
    <div className="flex items-center gap-2 text-red-500">
      <AlertTriangle size={14} />
      <span>خصم 10 نقاط عند تجاوز 30% غياب</span>
    </div>
    <div className="flex items-center gap-2 text-red-600">
      <XCircle size={14} />
      <span>استبعاد كامل عند تجاوز 60% غياب</span>
    </div>
  </div>
</div>
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        {isAdmin && (
          <>
            <label className="text-sm font-medium">الصف:</label>
            <select value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="input-modern !w-auto min-w-[160px]">
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            <label className="text-sm font-medium">الشعبة:</label>
            <select value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="input-modern !w-auto min-w-[100px]">
              {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
            </select>
          </>
        )}

        <label className="text-sm font-medium">عدد الأوائل:</label>
        <select value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="input-modern !w-auto">
          <option value={3}>أفضل 3</option>
          <option value={5}>أفضل 5</option>
          <option value={10}>أفضل 10</option>
          <option value={20}>أفضل 20</option>
        </select>
      </div>

      {/* المنصة (Podium) — للثلاثة الأوائل */}
      {!loading && students.length >= 3 && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-center mb-6 flex items-center justify-center gap-2">
            <Star className="text-amber-500" size={20} />
            منصة التتويج
          </h3>
          <div className="flex justify-center items-end gap-4">
            {/* الثاني */}
            {students[1] && (
              <div className="flex flex-col items-center" style={{ marginBottom: '40px' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-2"
                     style={{ background: getMedalColor(2).bg, color: getMedalColor(2).color }}>
                  🥈
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm truncate max-w-[120px]">{students[1].full_name}</p>
                  <p className="text-xs font-bold" style={{ color: getMedalColor(2).color }}>
                    {students[1].average}%
                  </p>
                </div>
                <div className="w-24 h-24 rounded-t-xl mt-3 flex items-center justify-center text-white font-bold text-2xl"
                     style={{ background: 'linear-gradient(135deg, #9CA3AF, #6B7280)' }}>
                  2
                </div>
              </div>
            )}

            {/* الأول */}
            {students[0] && (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-2 animate-pulse-soft"
                     style={{ background: getMedalColor(1).bg, color: getMedalColor(1).color }}>
                  🥇
                </div>
                <div className="text-center">
                  <p className="font-bold truncate max-w-[140px]">{students[0].full_name}</p>
                  <p className="text-sm font-bold" style={{ color: getMedalColor(1).color }}>
                    {students[0].average}%
                  </p>
                </div>
                <div className="w-28 h-32 rounded-t-xl mt-3 flex items-center justify-center text-white font-bold text-3xl"
                     style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  1
                </div>
              </div>
            )}

            {/* الثالث */}
            {students[2] && (
              <div className="flex flex-col items-center" style={{ marginBottom: '60px' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-2"
                     style={{ background: getMedalColor(3).bg, color: getMedalColor(3).color }}>
                  🥉
                </div>
                <div className="text-center">
                  <p className="font-bold text-xs truncate max-w-[100px]">{students[2].full_name}</p>
                  <p className="text-xs font-bold" style={{ color: getMedalColor(3).color }}>
                    {students[2].average}%
                  </p>
                </div>
                <div className="w-20 h-16 rounded-t-xl mt-3 flex items-center justify-center text-white font-bold text-xl"
                     style={{ background: 'linear-gradient(135deg, #C2410C, #9A3412)' }}>
                  3
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* الجدول الكامل */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-bold flex items-center gap-2">
            <GraduationCap size={20} />
            قائمة الأوائل ({students.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="p-10 text-center">
            <Award size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا توجد درجات مسجّلة لهذا الصف</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start w-16">الرتبة</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الصف</th>
                  <th className="p-3 text-center">المعدل</th>
<th className="p-3 text-center">الحضور</th>
<th className="p-3 text-center">السلوك</th>
<th className="p-3 text-center">الغياب</th>
<th className="p-3 text-center">النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const color = getScoreColor(s.average)
                  return (
                    <tr key={s.id} className="border-b hover:bg-amber-50/30 dark:hover:bg-amber-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {s.medal && <span className="text-2xl">{s.medal}</span>}
                          <span className="font-bold text-lg">{s.rank}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                               style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                            {s.full_name?.charAt(0)}
                          </div>
                          <span>{s.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {s.grade} {s.section && `- ${s.section}`}
                      </td>
                      <td className="p-3 text-center">
  <span className="font-bold" style={{ color: getScoreColor(s.academic_avg) }}>
    {s.academic_avg}%
  </span>
</td>
<td className="p-3 text-center">
  <span className="font-bold" style={{ color: getScoreColor(s.attendance_rate) }}>
    {s.attendance_rate}%
  </span>
</td>
<td className="p-3 text-center">
  {s.behavior_rating ? (
    <span className="badge"
          style={{
            background: s.behavior_score >= 90 ? '#10B98120' : s.behavior_score >= 70 ? '#F59E0B20' : '#EF444420',
            color: s.behavior_score >= 90 ? '#10B981' : s.behavior_score >= 70 ? '#F59E0B' : '#EF4444',
          }}>
      {s.behavior_score >= 90 ? '🌟' : s.behavior_score >= 70 ? '👍' : '⚠️'} {s.behavior_score}
    </span>
  ) : (
    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>—</span>
  )}
</td>
<td className="p-3 text-center">
  <span className="badge"
        style={{
          background: s.absence_rate >= 30 ? '#EF444420' : '#10B98120',
          color: s.absence_rate >= 30 ? '#EF4444' : '#10B981',
        }}>
    {s.absence_total} يوم ({s.absence_rate}%)
  </span>
</td>
<td className="p-3 text-center">
  <div>
    <span className="text-lg font-bold" style={{ color: getScoreColor(s.final_score) }}>
      {s.final_score}%
    </span>
    {s.penalty > 0 && (
      <div className="text-xs text-red-500 font-bold">
        (-{s.penalty} خصم)
      </div>
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
    </div>
  )
}