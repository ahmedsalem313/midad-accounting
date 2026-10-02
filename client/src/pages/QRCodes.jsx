import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  QrCode, Printer, School, User, Search, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  getGradesByType, SECTIONS, getCurrentSchoolType
} from '../utils/schoolData'

export default function QRCodes() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [activeTab, setActiveTab] = useState('general')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [schoolName, setSchoolName] = useState('مدرسة مداد النموذجية')
  const [showPhone, setShowPhone] = useState(false)
  const [serverIP, setServerIP] = useState(null)
  const [ipLoaded, setIpLoaded] = useState(false)

  // ============================================
  // جلب رابط الموقع — ديناميكي
  // ============================================
  // ⚠️ IP الجهاز - يُحدَّث عند تغييره
const MANUAL_IP = '192.168.110.191'

const getBaseUrl = () => {
  const port = window.location.port || '5173'
  const protocol = window.location.protocol
  const hostname = window.location.hostname

  // 1) إذا فُتح من IP → استخدمه
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}:${port}`
  }

  // 2) إذا السيرفر رجّع IP صحيح → استخدمه
  if (serverIP && serverIP !== 'localhost' && serverIP !== '127.0.0.1') {
    return `http://${serverIP}:${port}`
  }

  // 3) fallback: IP يدوي
  return `http://${MANUAL_IP}:${port}`
}
  const baseUrl = getBaseUrl()
  const generalUrl = `${baseUrl}#/parent-login`

  // ============================================
  // جلب البيانات
  // ============================================
  useEffect(() => {
    fetchSettings()
    fetchServerIP()
  }, [])

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents()
    }
  }, [activeTab, filterGrade, filterSection])

  const fetchServerIP = async () => {
    try {
      const res = await api.get('/network-info')
      const ip = res.data.data.primary
      setServerIP(ip)
      setIpLoaded(true)
      console.log('✅ IP السيرفر:', ip)
    } catch (e) {
      console.error('فشل جلب IP:', e)
      setServerIP(window.location.hostname)
      setIpLoaded(true)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings')
      const data = res.data.data || {}
      setSchoolName(data.school_name || 'مدرسة مداد النموذجية')
    } catch (e) {
      console.error(e)
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterGrade) params.grade = filterGrade
      if (filterSection) params.section = filterSection

      const res = await api.get('/students', { params })
      setStudents(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل الطلاب')
    } finally {
      setLoading(false)
    }
  }

  const printPage = () => {
    window.print()
  }

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.guardian_phone?.includes(q) ||
      s.guardian_name?.toLowerCase().includes(q)
    )
  })

  // ============================================
  // رابط QR لطالب محدد
  // ============================================
  const getStudentUrl = (student) => {
  const phone = student.guardian_phone || ''
  return `${baseUrl}#/parent-login?phone=${phone}`
}

  return (
    <>
      {/* أنماط الطباعة */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            padding: 10mm !important;
            background: white !important;
            color: black !important;
            direction: rtl !important;
          }
          @page { size: A4 portrait; margin: 10mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="text-primary-500" size={26} />
              رموز QR
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              رموز للطباعة — يدخل ولي الأمر بمسحها بكاميرا هاتفه
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPhone(!showPhone)}
              className="btn-ghost border-2 flex items-center gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {showPhone ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPhone ? 'إخفاء الأرقام' : 'إظهار الأرقام'}
            </button>
            <button
              onClick={printPage}
              className="btn-primary flex items-center gap-2"
            >
              <Printer size={18} />
              طباعة
            </button>
          </div>
        </div>

        {/* تنبيه IP */}
        {ipLoaded && !serverIP && (
          <div className="glass-card p-3 no-print"
               style={{ background: 'rgba(245,158,11,0.1)' }}>
            <p className="text-sm text-amber-700">
              ⚠️ لم نتمكن من تحديد IP الجهاز. الرموز قد لا تعمل على الموبايل.
            </p>
          </div>
        )}

        {/* معلومات URL */}
        {ipLoaded && serverIP && (
          <div className="glass-card p-3 no-print"
               style={{ background: 'rgba(16,185,129,0.08)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              🔗 رابط البوابة: <strong dir="ltr">{generalUrl}</strong>
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="glass-card p-2 flex flex-wrap gap-1 no-print">
          {[
            { id: 'general',  label: 'لوحة عامة',       icon: School },
            { id: 'students', label: 'بطاقات الطلاب',    icon: User },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-all ${
                  isActive ? 'text-white shadow-lg' : 'text-slate-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' } : {}}
              >
                <Icon size={18} />
                <span className="text-sm">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* الفلاتر */}
        {activeTab === 'students' && (
          <div className="glass-card p-4 flex flex-wrap gap-3 items-center no-print">
            <div className="flex-1 min-w-[240px] relative">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                      style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 بحث بالطالب، ولي الأمر، الهاتف..."
                className="input-modern ps-10"
              />
            </div>

            <select value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="input-modern !w-auto min-w-[160px]">
              <option value="">كل الصفوف</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            <select value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="input-modern !w-auto min-w-[100px]">
              <option value="">كل الشعب</option>
              {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
            </select>

            <div className="text-xs px-3 py-2 rounded-lg font-semibold"
                 style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
              {filteredStudents.length} طالب
            </div>
          </div>
        )}

        {/* منطقة الطباعة */}
        <div id="print-area">
          {/* ========== لوحة عامة ========== */}
          {activeTab === 'general' && (
            <div className="bg-white text-slate-900 mx-auto"
                 style={{
                   width: '210mm',
                   minHeight: '297mm',
                   padding: '20mm',
                   direction: 'rtl',
                   fontFamily: 'Cairo, sans-serif',
                 }}>
              <div style={{
                border: '3px solid #6366F1',
                borderRadius: '20px',
                padding: '30px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  fontSize: '50px',
                }}>
                  🖋️
                </div>

                <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, color: '#4338CA' }}>
                  {schoolName}
                </h1>
                <p style={{ fontSize: '18px', color: '#64748b', margin: '8px 0 30px 0' }}>
                  بوابة أولياء الأمور
                </p>

                <div style={{
                  padding: '20px',
                  background: '#EEF2FF',
                  borderRadius: '16px',
                  marginBottom: '24px',
                }}>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#4F46E5' }}>
                    📱 امسح الرمز بكاميرا هاتفك
                  </p>
                </div>

                <div style={{
                  display: 'inline-block',
                  padding: '20px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '3px solid #e2e8f0',
                }}>
                  <QRCodeSVG
                    value={generalUrl}
                    size={320}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div style={{ marginTop: '30px' }}>
                  <p style={{ fontSize: '18px', color: '#1e293b', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                    🔐 خطوات الدخول:
                  </p>
                  <div style={{ fontSize: '15px', color: '#475569', lineHeight: 2 }}>
                    <p style={{ margin: '5px 0' }}><strong>1.</strong> افتح كاميرا الهاتف</p>
                    <p style={{ margin: '5px 0' }}><strong>2.</strong> وجّهها نحو الرمز</p>
                    <p style={{ margin: '5px 0' }}><strong>3.</strong> اضغط على الرابط الظاهر</p>
                    <p style={{ margin: '5px 0' }}><strong>4.</strong> أدخل رقم هاتفك</p>
                  </div>
                </div>

                <div style={{
                  marginTop: '30px',
                  paddingTop: '20px',
                  borderTop: '2px dashed #cbd5e1',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}>
                  {generalUrl}
                </div>
              </div>
            </div>
          )}

          {/* ========== بطاقات الطلاب ========== */}
          {activeTab === 'students' && (
            <div className="bg-white text-slate-900"
                 style={{
                   minHeight: '297mm',
                   padding: '10mm',
                   direction: 'rtl',
                   fontFamily: 'Cairo, sans-serif',
                 }}>
              {loading ? (
                <div className="p-10 text-center">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  لا يوجد طلاب
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '15px',
                }}>
                  {filteredStudents.map((student) => (
                    <div key={student.id} style={{
                      border: '2px solid #6366F1',
                      borderRadius: '12px',
                      padding: '15px',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))',
                      pageBreakInside: 'avoid',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        paddingBottom: '10px',
                        borderBottom: '1px dashed #e2e8f0',
                        marginBottom: '10px',
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '20px',
                          flexShrink: 0,
                        }}>
                          🖋️
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                            {schoolName}
                          </p>
                          <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0 0 0' }}>
                            {student.full_name}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                        <div style={{
                          padding: '8px',
                          background: 'white',
                          borderRadius: '10px',
                          border: '2px solid #e2e8f0',
                        }}>
                          <QRCodeSVG
                            value={getStudentUrl(student)}
                            size={140}
                            level="M"
                          />
                        </div>
                      </div>

                      <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center' }}>
                        <p style={{ margin: '3px 0' }}>
                          🎓 {student.grade} {student.section && `- ${student.section}`}
                        </p>
                        <p style={{ margin: '3px 0' }}>
                          👤 {student.guardian_name}
                        </p>
                        {showPhone && student.guardian_phone && (
                          <p style={{ margin: '3px 0', fontFamily: 'monospace', fontWeight: 'bold', color: '#4338CA' }}>
                            📱 {student.guardian_phone}
                          </p>
                        )}
                      </div>

                      <div style={{
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px dashed #e2e8f0',
                        fontSize: '9px',
                        color: '#94a3b8',
                        textAlign: 'center',
                      }}>
                        امسح للدخول لبوابة أولياء الأمور
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}