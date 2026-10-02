import { useState, useEffect } from 'react'
import { X, Printer, FileText, List } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import {
  getSubjectByCode, EXAM_TYPES, getGradeInfo
} from '../utils/schoolData'

export default function StudentReport({ studentId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('summary') // 'summary' | 'detailed'

  useEffect(() => {
    fetchReport()
  }, [studentId])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/grades/student/${studentId}/report`)
      setData(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) return null

  const { student, grades, average } = data

  // تجميع الدرجات حسب المادة
  const grouped = {}
  for (const g of grades) {
    if (!grouped[g.subject]) grouped[g.subject] = {}
    grouped[g.subject][g.exam_type] = g
  }

  const subjects = Object.keys(grouped)

  const getScoreColor = (percent) => {
    if (percent >= 90) return '#10B981'
    if (percent >= 75) return '#3B82F6'
    if (percent >= 50) return '#F59E0B'
    return '#EF4444'
  }

  const getSubjectAverage = (subjectGrades) => {
    const values = Object.values(subjectGrades)
    if (values.length === 0) return 0
    const totalScore = values.reduce((s, g) => s + (g.score || 0), 0)
    const totalMax = values.reduce((s, g) => s + (g.max_score || 0), 0)
    return totalMax > 0 ? (totalScore / totalMax) * 100 : 0
  }

  // حساب معدل فرع معين داخل مادة مركبة
  const getComponentAverage = (subjectGrades, componentName) => {
    const values = Object.values(subjectGrades)
    let totalScore = 0
    let totalMax = 0

    for (const g of values) {
      if (g.components?.items) {
        const item = g.components.items.find((it) => it.name === componentName)
        if (item) {
          totalScore += parseFloat(item.score) || 0
          totalMax += parseFloat(item.max_score) || 0
        }
      }
    }
    return totalMax > 0 ? (totalScore / totalMax) * 100 : 0
  }

  // جلب قيمة فرع لامتحان معين
  const getComponentScore = (subjectGrades, examType, componentName) => {
    const g = subjectGrades[examType]
    if (!g?.components?.items) return null
    const item = g.components.items.find((it) => it.name === componentName)
    if (!item) return null
    return { score: item.score, max: item.max_score }
  }

  // استخراج كل الفروع الفريدة لمادة
  const getAllComponents = (subjectGrades) => {
    const names = new Set()
    for (const g of Object.values(subjectGrades)) {
      if (g.components?.items) {
        g.components.items.forEach((it) => names.add(it.name))
      }
    }
    return Array.from(names)
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-report, #print-report * { visibility: visible !important; }
          #print-report {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            background: white !important;
            color: black !important;
            direction: rtl !important;
            font-family: 'Cairo', sans-serif !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-auto">
        <div className="flex flex-col max-h-[95vh] w-full max-w-4xl my-4">
          {/* أزرار التحكم */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {/* زر التقرير المختصر */}
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                viewMode === 'summary'
                  ? 'bg-white text-primary-600 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FileText size={18} />
              تقرير مختصر
            </button>

            {/* زر التقرير المفصل */}
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                viewMode === 'detailed'
                  ? 'bg-white text-primary-600 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <List size={18} />
              تقرير مفصل
            </button>

            <div className="flex-1"></div>

            <button
              onClick={() => window.print()}
              className="btn-primary flex items-center gap-2"
            >
              <Printer size={18} />
              طباعة A4
            </button>
            <button
              onClick={onClose}
              className="btn-ghost !bg-white/10 !text-white hover:!bg-white/20"
            >
              <X size={18} />
              إغلاق
            </button>
          </div>

          {/* التقرير */}
          <div className="overflow-auto rounded-2xl" style={{ background: '#e2e8f0' }}>
            <div
              id="print-report"
              className="bg-white text-slate-900 mx-auto"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '15mm',
                direction: 'rtl',
                fontFamily: 'Cairo, sans-serif',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: '3px double #6366F1',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '30px',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  }}>
                    🖋️
                  </div>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
                      مداد المحاسبي
                    </h1>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      نظام إدارة مدرسية متكامل
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '11px', color: '#64748b' }}>
                  <p style={{ margin: 0 }}>التاريخ: <strong style={{ color: '#1e293b' }} dir="ltr">{new Date().toLocaleDateString('en-GB')}</strong></p>
                  <p style={{ margin: '4px 0 0 0' }}>العام الدراسي: <strong style={{ color: '#1e293b' }}>2026-2027</strong></p>
                </div>
              </div>

              {/* Title */}
              <div style={{
                textAlign: 'center',
                padding: '14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#4338CA' }}>
                  كشف درجات الطالب
                  <span style={{ fontSize: '13px', marginRight: '10px', color: '#64748b', fontWeight: 'normal' }}>
                    ({viewMode === 'summary' ? 'مختصر' : 'مفصل'})
                  </span>
                </h2>
              </div>

              {/* بيانات الطالب */}
              <div style={{
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '18px',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  padding: '10px 16px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}>
                  👤 بيانات الطالب
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px', color: '#64748b', width: '35%' }}>اسم الطالب</td>
                      <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#1e293b' }}>{student.full_name}</td>
                    </tr>
                    <tr style={{ borderBottom: student.guardian_name ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: '#64748b' }}>الصف</td>
                      <td style={{ padding: '10px 16px', color: '#1e293b' }}>
                        {student.grade} {student.section && `- شعبة ${student.section}`}
                      </td>
                    </tr>
                    {student.guardian_name && (
                      <tr>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>ولي الأمر</td>
                        <td style={{ padding: '10px 16px', color: '#1e293b' }}>{student.guardian_name}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* المعدل العام */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                background: average >= 50
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: 'white',
                borderRadius: '12px',
                marginBottom: '20px',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>المعدل العام</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 'bold' }}>
                    {average.toFixed(2)}%
                  </p>
                </div>
                <div style={{ fontSize: '42px' }}>
                  {average >= 90 ? '🏆' : average >= 75 ? '⭐' : average >= 50 ? '✅' : '⚠️'}
                </div>
              </div>

              {/* جدول الدرجات */}
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
                marginBottom: '20px',
              }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white' }}>
                    <th style={{ padding: '10px', textAlign: 'start', border: '1px solid #e2e8f0' }}>
                      {viewMode === 'summary' ? 'المادة' : 'المادة / الفرع'}
                    </th>
                    {EXAM_TYPES.map((t) => (
                      <th key={t.value} style={{ padding: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        {t.label}
                      </th>
                    ))}
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #e2e8f0', background: '#4338CA' }}>
                      المتوسط
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subjCode) => {
                    const subject = getSubjectByCode(subjCode)
                    const subjectGrades = grouped[subjCode]
                    const avg = getSubjectAverage(subjectGrades)
                    const avgColor = getScoreColor(avg)
                    const components = viewMode === 'detailed' ? getAllComponents(subjectGrades) : []

                    return (
                      <>
                        {/* سطر المادة الرئيسية */}
                        <tr key={subjCode} style={{
                          borderBottom: viewMode === 'detailed' ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                          background: viewMode === 'detailed' ? '#eef2ff' : 'transparent',
                        }}>
                          <td style={{
                            padding: '10px',
                            fontWeight: 'bold',
                            background: viewMode === 'detailed' ? '#eef2ff' : '#f8fafc',
                            fontSize: viewMode === 'detailed' ? '13px' : '12px',
                          }}>
                            {subject?.icon} {subject?.name}
                          </td>
                          {EXAM_TYPES.map((t) => {
                            const g = subjectGrades[t.value]
                            if (!g) {
                              return (
                                <td key={t.value} style={{ padding: '8px', textAlign: 'center', color: '#cbd5e1', background: viewMode === 'detailed' ? '#eef2ff' : 'transparent' }}>
                                  —
                                </td>
                              )
                            }
                            const percent = (g.score / g.max_score) * 100
                            const c = getScoreColor(percent)
                            return (
                              <td key={t.value} style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: c,
                                fontWeight: 'bold',
                                background: viewMode === 'detailed' ? '#eef2ff' : 'transparent',
                              }}>
                                {g.score}/{g.max_score}
                                <br />
                                <span style={{ fontSize: '10px', opacity: 0.8 }}>({Math.round(percent)}%)</span>
                              </td>
                            )
                          })}
                          <td style={{
                            padding: '8px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: avgColor,
                            background: viewMode === 'detailed' ? '#eef2ff' : `${avgColor}10`,
                          }}>
                            {avg.toFixed(1)}%
                          </td>
                        </tr>

                        {/* أسطر الفروع (في الوضع المفصل فقط) */}
                        {viewMode === 'detailed' && components.map((compName) => {
                          const compAvg = getComponentAverage(subjectGrades, compName)
                          const compColor = getScoreColor(compAvg)

                          return (
                            <tr key={`${subjCode}-${compName}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{
                                padding: '8px 10px 8px 30px',
                                color: '#475569',
                                fontSize: '11px',
                                background: '#fafbff',
                              }}>
                                <span style={{ color: '#94a3b8', marginLeft: '8px' }}>└─</span>
                                {' '}{compName}
                              </td>
                              {EXAM_TYPES.map((t) => {
                                const comp = getComponentScore(subjectGrades, t.value, compName)
                                if (!comp) {
                                  return (
                                    <td key={t.value} style={{
                                      padding: '6px',
                                      textAlign: 'center',
                                      color: '#cbd5e1',
                                      fontSize: '11px',
                                      background: '#fafbff',
                                    }}>
                                      —
                                    </td>
                                  )
                                }
                                const percent = comp.max > 0 ? (comp.score / comp.max) * 100 : 0
                                const c = getScoreColor(percent)
                                return (
                                  <td key={t.value} style={{
                                    padding: '6px',
                                    textAlign: 'center',
                                    color: c,
                                    fontSize: '11px',
                                    background: '#fafbff',
                                  }}>
                                    {comp.score}/{comp.max}
                                  </td>
                                )
                              })}
                              <td style={{
                                padding: '6px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                color: compColor,
                                fontSize: '11px',
                                background: '#fafbff',
                              }}>
                                {compAvg.toFixed(1)}%
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
              </table>

              {/* ملاحظات */}
              <div style={{
                padding: '12px',
                background: '#fef3c7',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#92400e',
                marginBottom: '20px',
                border: '1px solid #fde68a',
              }}>
                <strong>ملاحظات:</strong> {' '}
                {viewMode === 'summary'
                  ? 'الدرجات معروضة بشكل تراكمي. النسبة المئوية محسوبة لكل امتحان على حدة.'
                  : 'التقرير المفصل يعرض الفروع الفرعية لكل مادة مركبة (مثل: اللغة العربية والاجتماعيات).'}
              </div>

              {/* التواقيع */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '2px dashed #cbd5e1',
              }}>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '30px' }}>ولي الأمر</p>
                  <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '30px' }}>المدير</p>
                  <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                marginTop: '20px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'center',
                fontSize: '10px',
                color: '#94a3b8',
              }}>
                <p style={{ margin: 0 }}>هذا الكشف صادر إلكترونياً من مداد المحاسبي — نظام إدارة مدرسية</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}