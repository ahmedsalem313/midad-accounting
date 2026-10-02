import { useState, useEffect } from 'react'
import { X, Printer, User, Phone, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const METHOD_LABELS = {
  cash: { label: 'نقدي', icon: '💵' },
  transfer: { label: 'تحويل', icon: '🏦' },
  check: { label: 'شيك', icon: '📝' },
  card: { label: 'بطاقة', icon: '💳' },
}

export default function FullReceipt({ studentId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [studentId])

  const fetchData = async () => {
    try {
      const res = await api.get(`/payments/student/${studentId}/all`)
      setData(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل الإيصال')
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

  const { student, payments, summary, schoolName } = data
  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')
  const getMethod = (m) => METHOD_LABELS[m] || METHOD_LABELS.cash

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-full-receipt, #print-full-receipt * { visibility: visible !important; }
          #print-full-receipt {
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

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto">
        <div className="flex flex-col max-h-[95vh] w-full max-w-4xl my-4">

          {/* أزرار التحكم */}
          <div className="flex gap-2 mb-3 justify-end">
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

          {/* الإيصال */}
          <div className="overflow-auto rounded-2xl" style={{ background: '#e2e8f0' }}>
            <div
              id="print-full-receipt"
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
                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
                      {schoolName}
                    </h1>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      كشف حساب شامل
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '10px', color: '#64748b' }}>
                  <p style={{ margin: 0 }}>
                    التاريخ: <strong style={{ color: '#1e293b' }} dir="ltr">
                      {new Date().toLocaleDateString('en-GB')}
                    </strong>
                  </p>
                  <p style={{ margin: '4px 0 0 0' }}>
                    الوقت: <strong style={{ color: '#1e293b' }} dir="ltr">
                      {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </p>
                </div>
              </div>

              {/* العنوان */}
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                borderRadius: '10px',
                marginBottom: '18px',
                border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#4338CA' }}>
                  كشف حساب الطالب
                </h2>
              </div>

              {/* بيانات الطالب */}
              <div style={{
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '16px',
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px', color: '#64748b', width: '25%' }}>الاسم</td>
                      <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#1e293b', width: '25%' }}>
                        {student.full_name}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b', width: '25%' }}>الصف</td>
                      <td style={{ padding: '10px 16px', color: '#1e293b', width: '25%' }}>
                        {student.grade} {student.section && `- ${student.section}`}
                      </td>
                    </tr>
                    {student.student_code && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>الرقم الأكاديمي</td>
                        <td style={{ padding: '10px 16px', color: '#1e293b' }} dir="ltr">
                          {student.student_code}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>رقم ولي الأمر</td>
                        <td style={{ padding: '10px 16px', color: '#1e293b' }} dir="ltr">
                          {student.guardian_phone}
                        </td>
                      </tr>
                    )}
                    {student.guardian_name && (
                      <tr>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>ولي الأمر</td>
                        <td colSpan="3" style={{ padding: '10px 16px', color: '#1e293b' }}>
                          {student.guardian_name}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ملخص الحساب */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '18px',
              }}>
                <div style={{
                  padding: '14px',
                  background: '#EEF2FF',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px 0' }}>إجمالي الرسوم</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#4338CA' }}>
                    {fmt(summary.totalFees)}
                  </p>
                </div>

                <div style={{
                  padding: '14px',
                  background: '#D1FAE5',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px 0' }}>إجمالي المدفوع</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#059669' }}>
                    {fmt(summary.totalPaid)}
                  </p>
                </div>

                <div style={{
                  padding: '14px',
                  background: summary.remaining > 0 ? '#FEE2E2' : '#D1FAE5',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px 0' }}>المتبقي</p>
                  <p style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    margin: 0,
                    color: summary.remaining > 0 ? '#DC2626' : '#059669',
                  }}>
                    {fmt(summary.remaining)}
                  </p>
                </div>

                <div style={{
                  padding: '14px',
                  background: '#E0E7FF',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px 0' }}>نسبة التحصيل</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#6366F1' }}>
                    {summary.collectionRate}%
                  </p>
                </div>
              </div>

              {/* جدول الدفعات */}
              <div style={{
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  padding: '10px 16px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}>
                  💰 سجل الدفعات ({summary.paymentCount} دفعة)
                </div>

                {payments.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لا توجد دفعات مسجلة حتى الآن
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>#</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>رقم الإيصال</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>التاريخ</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>المبلغ</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>المدفوع</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>الطريقة</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => {
                        const method = getMethod(p.method)
                        return (
                          <tr key={p.id} style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: i % 2 === 0 ? 'white' : '#fafbff',
                          }}>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>
                              {i + 1}
                            </td>
                            <td style={{
                              padding: '8px',
                              textAlign: 'right',
                              fontFamily: 'monospace',
                              color: '#6366F1',
                              fontWeight: 'bold',
                            }}>
                              {p.receipt_number}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }} dir="ltr">
                              {p.payment_date}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {fmt(p.amount)}
                            </td>
                            <td style={{
                              padding: '8px',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              color: '#059669',
                            }}>
                              {fmt(p.paid_amount)}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {method.icon} {method.label}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                              {p.notes || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{
                        background: '#EEF2FF',
                        borderTop: '2px solid #6366F1',
                        fontWeight: 'bold',
                      }}>
                        <td colSpan="3" style={{ padding: '12px', textAlign: 'center', color: '#4338CA' }}>
                          الإجمالي
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#4338CA' }}>
                          {fmt(summary.totalFees)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontSize: '13px' }}>
                          {fmt(summary.totalPaid)}
                        </td>
                        <td colSpan="2" style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: summary.remaining > 0 ? '#FEE2E2' : '#D1FAE5',
                            color: summary.remaining > 0 ? '#DC2626' : '#059669',
                            fontSize: '11px',
                          }}>
                            {summary.remaining > 0
                              ? `متبقي: ${fmt(summary.remaining)}`
                              : '✅ مسدد بالكامل'}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
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
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '30px' }}>المحاسب</p>
                  <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '30px' }}>ختم المدرسة</p>
                  <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                marginTop: '20px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'center',
                fontSize: '9px',
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