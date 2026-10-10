import { useState, useEffect } from 'react'
import {
  MessageCircle, Send, Users, FileText, AlertCircle,
  CheckCircle, XCircle, Loader, Smartphone, DollarSign,
  GraduationCap, Megaphone, RefreshCw, Wifi, WifiOff, Trash2,
  Eye, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getGradesByType, getCurrentSchoolType } from '../utils/schoolData'

const TABS = [
  { id: 'status',    label: 'الحالة',         icon: Wifi },
  { id: 'fees',      label: 'تذكير الأقساط',  icon: DollarSign },
  { id: 'grades',    label: 'إرسال النتائج',  icon: GraduationCap },
  { id: 'bulk',      label: 'رسالة جماعية',   icon: Megaphone },
  { id: 'log',       label: 'سجل الرسائل',    icon: FileText },
]

export default function WhatsApp() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [activeTab, setActiveTab] = useState('status')
  const [status, setStatus] = useState({ status: 'disconnected', info: null })
  const [students, setStudents] = useState([])
  const [messages, setMessages] = useState([])
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  // نموذج الأقساط
  const [feesForm, setFeesForm] = useState({
    grade: '',
    min_remaining: 0,
  })

  // نموذج الدرجات
  const [gradeForm, setGradeForm] = useState({
    student_id: '',
  })

  // نموذج الرسالة الجماعية
  const [bulkForm, setBulkForm] = useState({
    grade: '',
    section: '',
    message: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (activeTab === 'status' || activeTab === 'log') {
      const interval = setInterval(fetchStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [statusRes, studentsRes, messagesRes, statsRes] = await Promise.all([
        api.get('/whatsapp/status'),
        api.get('/students'),
        api.get('/whatsapp/messages', { params: { limit: 50 } }),
        api.get('/whatsapp/stats'),
      ])
      setStatus(statusRes.data.data)
      setStudents(studentsRes.data.data)
      setMessages(messagesRes.data.data)
      setStats(statsRes.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status')
      setStatus(res.data.data)
    } catch (e) {
      // صامت
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await api.get('/whatsapp/messages', { params: { limit: 50 } })
      setMessages(res.data.data)
    } catch (e) {}
  }

  const handleSendFees = async () => {
    if (!confirm('إرسال تذكيرات لكل المتأخرين؟')) return

    setSending(true)
    try {
      const res = await api.post('/whatsapp/send-fee-reminders', feesForm)
      toast.success(res.data.message)
      fetchMessages()
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الإرسال')
    } finally {
      setSending(false)
    }
  }

const handleSendGrades = async () => {
  if (!gradeForm.student_id) {
    toast.error('اختر الطالب')
    return
  }

  const student = students.find((s) => s.id === parseInt(gradeForm.student_id))
  if (!confirm(`إرسال كشف درجات PDF للطالب ${student?.full_name} لولي الأمر؟`)) return

  setSending(true)
  try {
    const res = await api.post(`/whatsapp/send-grades/${gradeForm.student_id}`, {
      format: 'pdf',
    })
    toast.success(res.data.message)
    fetchMessages()
    fetchAll()
  } catch (e) {
    toast.error(e.response?.data?.error || 'فشل الإرسال')
  } finally {
    setSending(false)
  }
}

  const handleSendBulk = async () => {
    if (!bulkForm.message) {
      toast.error('اكتب الرسالة')
      return
    }

    if (!confirm(`إرسال الرسالة لجميع طلاب ${bulkForm.grade || 'المدرسة'}؟`)) return

    setSending(true)
    try {
      const res = await api.post('/whatsapp/send-bulk', bulkForm)
      toast.success(res.data.message)
      setBulkForm({ ...bulkForm, message: '' })
      fetchMessages()
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الإرسال')
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('قطع الاتصال بحساب واتساب؟')) return
    try {
      await api.post('/whatsapp/logout')
      toast.success('تم قطع الاتصال')
      fetchStatus()
    } catch (e) {
      toast.error('فشل')
    }
  }
  // ============================================
  // طباعة الرسالة
  // ============================================
  const handlePrintMessage = (msg) => {
    const schoolName = localStorage.getItem('midad_school_name') || 'مداد المحاسبي'

    const printHTML = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>طباعة الرسالة</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Cairo', sans-serif;
            padding: 30px;
            background: white;
            color: #1e293b;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 15px;
            border-bottom: 3px double #6366F1;
            margin-bottom: 20px;
          }
          .header img { height: 60px; }
          .header h1 {
            font-size: 20px;
            color: #6366F1;
          }
          .title {
            text-align: center;
            background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .title h2 { font-size: 16px; color: #4338CA; }
          .info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 10px;
          }
          .info-item {
            font-size: 12px;
            display: flex;
            gap: 6px;
          }
          .info-item strong { color: #6366F1; }
          .message-box {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            background: white;
            white-space: pre-wrap;
            line-height: 1.8;
            font-size: 13px;
          }
          .message-label {
            background: #6366F1;
            color: white;
            padding: 8px 12px;
            border-radius: 8px 8px 0 0;
            margin: -20px -20px 15px -20px;
            font-weight: 700;
            font-size: 12px;
          }
          .footer {
            text-align: center;
            color: #94a3b8;
            font-size: 10px;
            padding-top: 15px;
            border-top: 1px dashed #cbd5e1;
          }
          @media print {
            body { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${window.location.origin}/logo.png" alt="Logo" onerror="this.style.display='none'">
            <h1>${schoolName}</h1>
          </div>
          <div style="font-size: 11px; color: #64748b;">
            تاريخ الطباعة: <strong>${new Date().toLocaleString('en-GB')}</strong>
          </div>
        </div>

        <div class="title">
          <h2>📄 نسخة من رسالة واتساب</h2>
        </div>

        <div class="info">
          <div class="info-item">
            <strong>📱 رقم المستلم:</strong>
            <span dir="ltr">${msg.phone}</span>
          </div>
          <div class="info-item">
            <strong>📅 تاريخ الإرسال:</strong>
            <span dir="ltr">${msg.sent_at ? new Date(msg.sent_at).toLocaleString('en-GB') : '—'}</span>
          </div>
          <div class="info-item">
            <strong>📌 الحالة:</strong>
            <span>${msg.status === 'sent' ? '✅ مرسلة' : msg.status === 'failed' ? '❌ فشلت' : '⏳ ينتظر'}</span>
          </div>
          <div class="info-item">
            <strong>🏷️ النوع:</strong>
            <span>${msg.template || '—'}</span>
          </div>
        </div>

        <div class="message-box">
          <div class="message-label">📄 نص الرسالة:</div>
          ${msg.message || '—'}
        </div>

        <div class="footer">
          هذا المستند صادر إلكترونيًا من ${schoolName} — نظام مداد المحاسبي
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=800,height=900')
    printWindow.document.write(printHTML)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 500)
  }

  // ============================================
  // تصدير الرسالة PDF
  // ============================================
  const handleExportPDF = async (msg) => {
    try {
      const schoolName = localStorage.getItem('midad_school_name') || 'مداد المحاسبي'

      // استخدم نفس HTML الطباعة
      const printHTML = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>رسالة واتساب</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Cairo', sans-serif;
              padding: 30px;
              background: white;
              color: #1e293b;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-bottom: 15px;
              border-bottom: 3px double #6366F1;
              margin-bottom: 20px;
            }
            .header img { height: 60px; }
            .header h1 { font-size: 20px; color: #6366F1; }
            .title {
              text-align: center;
              background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
              padding: 12px;
              border-radius: 10px;
              margin-bottom: 20px;
            }
            .title h2 { font-size: 16px; color: #4338CA; }
            .info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 10px;
            }
            .info-item { font-size: 12px; display: flex; gap: 6px; }
            .info-item strong { color: #6366F1; }
            .message-box {
              border: 2px solid #e2e8f0;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 20px;
              background: white;
              white-space: pre-wrap;
              line-height: 1.8;
              font-size: 13px;
            }
            .message-label {
              background: #6366F1;
              color: white;
              padding: 8px 12px;
              border-radius: 8px 8px 0 0;
              margin: -20px -20px 15px -20px;
              font-weight: 700;
              font-size: 12px;
            }
            .footer {
              text-align: center;
              color: #94a3b8;
              font-size: 10px;
              padding-top: 15px;
              border-top: 1px dashed #cbd5e1;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${window.location.origin}/logo.png" alt="Logo" onerror="this.style.display='none'">
              <h1>${schoolName}</h1>
            </div>
            <div style="font-size: 11px; color: #64748b;">
              تاريخ التصدير: <strong>${new Date().toLocaleString('en-GB')}</strong>
            </div>
          </div>

          <div class="title">
            <h2>📄 نسخة من رسالة واتساب</h2>
          </div>

          <div class="info">
            <div class="info-item">
              <strong>📱 رقم المستلم:</strong>
              <span dir="ltr">${msg.phone}</span>
            </div>
            <div class="info-item">
              <strong>📅 تاريخ الإرسال:</strong>
              <span dir="ltr">${msg.sent_at ? new Date(msg.sent_at).toLocaleString('en-GB') : '—'}</span>
            </div>
            <div class="info-item">
              <strong>📌 الحالة:</strong>
              <span>${msg.status === 'sent' ? '✅ مرسلة' : msg.status === 'failed' ? '❌ فشلت' : '⏳ ينتظر'}</span>
            </div>
            <div class="info-item">
              <strong>🏷️ النوع:</strong>
              <span>${msg.template || '—'}</span>
            </div>
          </div>

          <div class="message-box">
            <div class="message-label">📄 نص الرسالة:</div>
            ${msg.message || '—'}
          </div>

          <div class="footer">
            هذا المستند صادر إلكترونيًا من ${schoolName} — نظام مداد المحاسبي
          </div>
        </body>
        </html>
      `

      // افتح نافذة جديدة واطبع كـ PDF
      const printWindow = window.open('', '_blank', 'width=800,height=900')
      printWindow.document.write(printHTML)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.focus()
        // يُنبه المستخدم: اختر "Save as PDF"
        toast('اختر "Save as PDF" من نافذة الطباعة', { icon: '💡', duration: 4000 })
        printWindow.print()
      }, 500)
    } catch (e) {
      console.error(e)
      toast.error('فشل التصدير')
    }
  }
  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  const isReady = status.status === 'ready'
  const isConnecting = status.status === 'connecting'
  const isQR = status.status === 'qr'

  // إحصائيات المتأخرين
  const outstandingStudents = students.filter((s) => {
    // نحتاج نجلبها من API منفصل، لكن هنا نعتمد على البيانات
    return true
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="text-primary-500" size={26} />
            واتساب
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إرسال الرسائل لأولياء الأمور
          </p>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${
          isReady
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : isQR || isConnecting
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
        }`}>
          {isReady ? (
            <>
              <CheckCircle size={18} className="text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                متصل
              </span>
            </>
          ) : isQR || isConnecting ? (
            <>
              <Loader size={18} className="text-amber-500 animate-spin" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {isQR ? 'بانتظار المسح' : 'جاري الاتصال...'}
              </span>
            </>
          ) : (
            <>
              <WifiOff size={18} className="text-red-500" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                غير متصل
              </span>
            </>
          )}
        </div>
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
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-all ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-slate-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
              style={
                isActive
                  ? { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }
                  : {}
              }
            >
              <Icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab: Status */}
      {activeTab === 'status' && (
        <div className="space-y-5">
          <div className="glass-card p-6">
            {isReady ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                     style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <CheckCircle size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-600 mb-2">
                  ✅ واتساب متصل
                </h3>
                {status.info && (
                  <div className="space-y-1 mt-4">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      الرقم: <strong dir="ltr">+{status.info.number}</strong>
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      الاسم: <strong>{status.info.name}</strong>
                    </p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="btn-ghost text-red-500 border-2 mt-6"
                  style={{ borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  <WifiOff size={18} />
                  قطع الاتصال
                </button>
              </div>
            ) : isQR && status.qr ? (
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">📱 امسح رمز QR</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  من هاتفك: واتساب → الأجهزة المرتبطة → ربط جهاز
                </p>
                <div className="bg-white p-6 rounded-2xl inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(status.qr)}`}
                    alt="QR"
                    className="w-72 h-72"
                  />
                </div>
                <p className="text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
                  <RefreshCw size={12} className="inline animate-spin me-1" />
                  يتم التحديث تلقائياً
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <WifiOff size={48} className="mx-auto text-red-500 mb-3" />
                <h3 className="text-xl font-bold mb-2">غير متصل</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {status.status === 'error' ? 'حدث خطأ — أعد تشغيل السيرفر' : 'السيرفر يعمل على الاتصال...'}
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مرسلة</p>
                  <p className="text-xl font-bold text-emerald-600">{stats.sent || 0}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                  <Loader size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>قيد الإرسال</p>
                  <p className="text-xl font-bold text-amber-500">{stats.pending || 0}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                  <XCircle size={20} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>فاشلة</p>
                  <p className="text-xl font-bold text-red-500">{stats.failed || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Fees */}
      {activeTab === 'fees' && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-xl"
               style={{ background: 'rgba(99,102,241,0.08)' }}>
            <DollarSign className="text-primary-500 flex-shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="font-bold">إرسال تذكيرات الأقساط</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                يرسل رسالة لكل ولي أمر يوجد عليه متأخرات. الرسالة تتضمن اسم الطالب والمبلغ المتبقي.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">الصف (اختياري)</label>
              <select
                value={feesForm.grade}
                onChange={(e) => setFeesForm({ ...feesForm, grade: e.target.value })}
                className="input-modern"
              >
                <option value="">كل الصفوف</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">
                الحد الأدنى للمتأخرات (د.ع)
              </label>
              <input
                type="number"
                value={feesForm.min_remaining}
                onChange={(e) => setFeesForm({ ...feesForm, min_remaining: parseFloat(e.target.value) || 0 })}
                className="input-modern"
                placeholder="0 = الكل"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                0 = كل المتأخرين بأي مبلغ
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl text-xs"
               style={{ background: 'rgba(245,158,11,0.1)', color: '#92400e' }}>
            ⚠️ الإرسال يستغرق ~2 ثانية لكل رسالة لتجنب حظر الرقم
          </div>

          <button
            onClick={handleSendFees}
            disabled={!isReady || sending}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-3"
          >
            {sending ? (
              <>
                <Loader size={18} className="animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send size={18} />
                إرسال التذكيرات
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab: Grades */}
      {activeTab === 'grades' && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-xl"
               style={{ background: 'rgba(99,102,241,0.08)' }}>
            <GraduationCap className="text-primary-500 flex-shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="font-bold">إرسال كشف درجات طالب</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                يرسل لولي الأمر قائمة بكل درجات الطالب + المعدل العام
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">اختر الطالب</label>
            <select
              value={gradeForm.student_id}
              onChange={(e) => setGradeForm({ ...gradeForm, student_id: e.target.value })}
              className="input-modern"
            >
              <option value="">اختر...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} — {s.grade} {s.section && `- ${s.section}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSendGrades}
            disabled={!isReady || sending || !gradeForm.student_id}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-3"
          >
            {sending ? (
              <>
                <Loader size={18} className="animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send size={18} />
                إرسال النتائج
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab: Bulk */}
      {activeTab === 'bulk' && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-xl"
               style={{ background: 'rgba(99,102,241,0.08)' }}>
            <Megaphone className="text-primary-500 flex-shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="font-bold">رسالة جماعية</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                أرسل رسالة لكل أولياء الأمور في صف محدد
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">الصف</label>
              <select
                value={bulkForm.grade}
                onChange={(e) => setBulkForm({ ...bulkForm, grade: e.target.value })}
                className="input-modern"
              >
                <option value="">كل الصفوف</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">الشعبة (اختياري)</label>
              <input
                type="text"
                value={bulkForm.section}
                onChange={(e) => setBulkForm({ ...bulkForm, section: e.target.value })}
                className="input-modern"
                placeholder="اترك فارغاً للكل"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">نص الرسالة</label>
            <textarea
              value={bulkForm.message}
              onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
              className="input-modern"
              rows="5"
              placeholder={`اكتب رسالتك هنا...

يمكنك استخدام:
{اسم_الطالب} → يتغير تلقائياً لكل طالب
{اسم_ولي_الأمر} → يتغير تلقائياً لكل ولي أمر`}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
  💡 مثال: عزيزي {'{اسم_ولي_الأمر}'}، غداً عطلة رسمية.
</p>
          </div>

          <button
            onClick={handleSendBulk}
            disabled={!isReady || sending || !bulkForm.message}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-3"
          >
            {sending ? (
              <>
                <Loader size={18} className="animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send size={18} />
                إرسال جماعي
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab: Log */}
      {activeTab === 'log' && (
        <div className="glass-card overflow-hidden">
          {messages.length === 0 ? (
            <div className="p-10 text-center">
              <FileText size={48} className="mx-auto mb-3 text-slate-400" />
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد رسائل</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="p-3 text-start">#</th>
                    <th className="p-3 text-start">الرقم</th>
                    <th className="p-3 text-start">الرسالة</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-start">التاريخ</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m, i) => (
                    <tr
                      key={m.id}
                      className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 cursor-pointer transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => setSelectedMessage(m)}
                    >
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3" dir="ltr">{m.phone}</td>
                      <td className="p-3 max-w-[300px] text-xs">
                        {m.message?.substring(0, 80)}
                        {m.message?.length > 80 && '...'}
                      </td>
                      <td className="p-3">
                        {m.status === 'sent' && <span className="badge-success">✅ مرسلة</span>}
                        {m.status === 'pending' && <span className="badge-warning">⏳ ينتظر</span>}
                        {m.status === 'failed' && <span className="badge-danger">❌ فشلت</span>}
                      </td>
                      <td className="p-3 text-xs" dir="ltr">
                        {new Date(m.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMessage(m)
                          }}
                          className="btn-ghost !p-2 text-primary-500 hover:text-primary-700"
                          title="عرض الرسالة"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: عرض الرسالة */}
      {selectedMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="glass-card w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-primary-500" size={22} />
                تفاصيل الرسالة
              </h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="btn-ghost !p-2 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* البيانات */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between p-3 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.08)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>رقم المستلم:</span>
                <strong dir="ltr">{selectedMessage.phone}</strong>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.08)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>التاريخ:</span>
                <strong dir="ltr">
                  {new Date(selectedMessage.created_at).toLocaleString('en-GB')}
                </strong>
              </div>

              {selectedMessage.sent_at && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>وقت الإرسال:</span>
                  <strong className="text-emerald-600" dir="ltr">
                    {new Date(selectedMessage.sent_at).toLocaleString('en-GB')}
                  </strong>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.08)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>الحالة:</span>
                {selectedMessage.status === 'sent' && <span className="badge-success">✅ مرسلة</span>}
                {selectedMessage.status === 'pending' && <span className="badge-warning">⏳ ينتظر</span>}
                {selectedMessage.status === 'failed' && <span className="badge-danger">❌ فشلت</span>}
              </div>

              {selectedMessage.error && (
                <div className="p-3 rounded-xl"
                     style={{ background: 'rgba(239,68,68,0.1)', color: '#991B1B' }}>
                  <p className="text-xs font-bold mb-1">⚠️ سبب الفشل:</p>
                  <p className="text-xs">{selectedMessage.error}</p>
                </div>
              )}
            </div>

            {/* نص الرسالة */}
            <div className="mb-5">
              <label className="text-sm font-bold mb-2 block flex items-center gap-2">
                📄 نص الرسالة:
              </label>
              <div
                className="p-4 rounded-xl max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontFamily: 'Cairo, sans-serif',
                  direction: 'rtl',
                }}
              >
                {selectedMessage.message || '—'}
              </div>
            </div>

            {/* أزرار */}
            <div className="flex gap-2 pt-2 flex-wrap">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedMessage.message || '')
                  toast.success('تم نسخ الرسالة')
                }}
                className="btn-ghost flex-1 flex items-center justify-center gap-2 border-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                📋 نسخ
              </button>

              <button
                onClick={() => handlePrintMessage(selectedMessage)}
                className="btn-ghost flex-1 flex items-center justify-center gap-2 border-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                🖨️ طباعة
              </button>

              <button
                onClick={() => handleExportPDF(selectedMessage)}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                📄 PDF
              </button>

              <button
                onClick={() => setSelectedMessage(null)}
                className="btn-ghost"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}