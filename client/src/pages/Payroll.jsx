import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, Banknote, AlertCircle,
  Calculator, CheckCircle, DollarSign, Users, TrendingUp,
  Save, Printer, Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ExportButton from '../components/ExportButton'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import BulkPrintSlips from '../components/BulkPrintSlips'
const SALARY_TYPES = {
  fixed:      { label: 'مقطوع',  color: '#6366F1', icon: '💰' },
  per_lesson: { label: 'بالحصة', color: '#10B981', icon: '📚' },
  mixed:      { label: 'مركّب',  color: '#8B5CF6', icon: '🔀' },
}

const STATUSES = {
  draft:    { label: 'مسودة',    color: '#94A3B8', icon: '📝' },
  approved: { label: 'معتمد',    color: '#3B82F6', icon: '✅' },
  paid:     { label: 'مدفوع',    color: '#10B981', icon: '💵' },
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function Payroll() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [filterStatus, setFilterStatus] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showBulkPrint, setShowBulkPrint] = useState(false)
  const [previewData, setPreviewData] = useState(null)

  useEffect(() => {
    fetchRecords()
  }, [selectedYear, selectedMonth, filterStatus])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const params = { year: selectedYear, month: selectedMonth }
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/payroll', { params })
      setRecords(res.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openPreview = async () => {
    try {
      const res = await api.get('/payroll/preview', {
        params: { year: selectedYear, month: selectedMonth },
      })
      setPreviewData(res.data.data)
      setShowPreviewModal(true)
    } catch (e) {
      toast.error('فشل المعاينة')
    }
  }

  const handleGenerate = async () => {
    if (!confirm(`إنشاء كشوف رواتب شهر ${MONTHS[selectedMonth - 1]} ${selectedYear}؟\n\nسيتم استبدال الكشوف غير المدفوعة.`)) return
    try {
      await api.post('/payroll/generate', { year: selectedYear, month: selectedMonth })
      toast.success('تم إنشاء الكشوف')
      setShowPreviewModal(false)
      fetchRecords()
    } catch (e) {
      toast.error('فشل الإنشاء')
    }
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    setEditForm({
      bonus: record.bonus || 0,
      other_deductions: record.other_deductions || 0,
      manual_adjustment: record.manual_adjustment || 0,
      adjustment_note: record.adjustment_note || '',
    })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    try {
      await api.put(`/payroll/${editingRecord.id}`, editForm)
      toast.success('تم التحديث')
      setShowEditModal(false)
      fetchRecords()
    } catch (e) {
      toast.error('فشل التحديث')
    }
  }

  const handleApprove = async (record) => {
    if (!confirm(`اعتماد راتب ${record.teacher_name}؟`)) return
    try {
      await api.post(`/payroll/${record.id}/approve`)
      toast.success('تم الاعتماد')
      fetchRecords()
    } catch (e) {
      toast.error('فشل الاعتماد')
    }
  }

  const handlePay = async (record) => {
    if (!confirm(`صرف راتب ${record.teacher_name} (${fmt(record.net_salary)} د.ع)؟`)) return
    try {
      await api.post(`/payroll/${record.id}/pay`, { paid_method: 'cash' })
      toast.success('تم الصرف')
      fetchRecords()
    } catch (e) {
      toast.error('فشل الصرف')
    }
  }

  const handlePayAll = async () => {
    if (!confirm(`صرف كل الرواتب المعتمدة لشهر ${MONTHS[selectedMonth - 1]}؟`)) return
    try {
      const res = await api.post('/payroll/pay-bulk', {
        year: selectedYear,
        month: selectedMonth,
        paid_method: 'cash',
      })
      toast.success(res.data.message)
      fetchRecords()
    } catch (e) {
      toast.error('فشل الصرف الجماعي')
    }
  }

  const handleDelete = async (record) => {
    if (!confirm(`حذف راتب ${record.teacher_name}؟`)) return
    try {
      await api.delete(`/payroll/${record.id}`)
      toast.success('تم الحذف')
      fetchRecords()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')
  const getTypeInfo = (t) => SALARY_TYPES[t] || SALARY_TYPES.fixed
  const getStatusInfo = (s) => STATUSES[s] || STATUSES.draft

  // إحصائيات
  const stats = {
    totalNet: records.reduce((sum, r) => sum + (r.net_salary || 0), 0),
    totalBase: records.reduce((sum, r) => sum + (r.base_salary || 0), 0),
    totalAllowances: records.reduce((sum, r) => sum + (r.allowances || 0), 0),
    totalDeductions: records.reduce((sum, r) =>
      sum + (r.absence_deduction || 0) + (r.late_deduction || 0) +
      (r.advances_deduction || 0) + (r.other_deductions || 0), 0),
    paidCount: records.filter((r) => r.status === 'paid').length,
    approvedCount: records.filter((r) => r.status === 'approved').length,
    draftCount: records.filter((r) => r.status === 'draft').length,
  }

  // سنوات متاحة
  const years = [selectedYear - 1, selectedYear, selectedYear + 1]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="text-primary-500" size={26} />
            كشوف الرواتب
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {MONTHS[selectedMonth - 1]} {selectedYear} — {records.length} كشف
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
  <ExportButton
    data={records}
    filename={`الرواتب_${MONTHS[selectedMonth - 1]}_${selectedYear}`}
    sheetName="الرواتب"
    columns={[
      { key: 'teacher_name', label: 'المعلم' },
      { key: 'salary_type', label: 'النوع', format: (v) => getTypeInfo(v).label },
      { key: 'base_salary', label: 'الأساسي' },
      { key: 'allowances', label: 'البدلات' },
      { key: 'bonus', label: 'المكافآت' },
      { key: 'absence_deduction', label: 'خصم الغياب' },
      { key: 'late_deduction', label: 'خصم التأخير' },
      { key: 'advances_deduction', label: 'خصم السلف' },
      { key: 'other_deductions', label: 'خصومات أخرى' },
      { key: 'net_salary', label: 'الصافي' },
      { key: 'status', label: 'الحالة', format: (v) => getStatusInfo(v).label },
    ]}
  />
  {records.length > 0 && (
  <button
    onClick={() => setShowBulkPrint(true)}
    className="btn-ghost border-2 flex items-center gap-2"
    style={{ borderColor: 'var(--border-color)' }}
  >
    <Printer size={18} />
    طباعة الكشوف ({records.length})
  </button>
)}
  {hasPermission('payroll.calculate') && (
    <button
      onClick={() => navigate('/salary-config')}
      className="btn-ghost border-2 flex items-center gap-2"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <Settings size={18} />
      إعداد الرواتب
    </button>
  )}
  {hasPermission('payroll.calculate') && (
    <button onClick={openPreview} className="btn-primary flex items-center gap-2">
      <Calculator size={18} />
      حساب الشهر
    </button>
  )}
</div>
      </div>

      {/* الفلاتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium">الفترة:</label>
        <select value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input-modern !w-auto">
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input-modern !w-auto">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-modern !w-auto">
          <option value="">كل الحالات</option>
          {Object.entries(STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>

        {stats.approvedCount > 0 && hasPermission('payroll.pay') && (
          <button onClick={handlePayAll}
                  className="btn-primary flex items-center gap-2 ms-auto">
            <DollarSign size={18} />
            صرف الكل ({stats.approvedCount})
          </button>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي الصافي</p>
              <p className="text-lg font-bold text-emerald-600 truncate">{fmt(stats.totalNet)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>عدد الكشوف</p>
              <p className="text-lg font-bold">{records.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>معتمد</p>
              <p className="text-lg font-bold text-blue-500">{stats.approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مدفوع</p>
              <p className="text-lg font-bold text-emerald-600">{stats.paidCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }} className="mb-3">
              لا توجد كشوف لهذا الشهر
            </p>
            {hasPermission('payroll.calculate') && (
              <button onClick={openPreview} className="btn-primary">
                <Calculator size={18} />
                حساب الرواتب الآن
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">المعلم</th>
                  <th className="p-3 text-start">النوع</th>
                  <th className="p-3 text-start">الأساسي</th>
                  <th className="p-3 text-start">البدلات</th>
                  <th className="p-3 text-start">المكافآت</th>
                  <th className="p-3 text-start">الخصومات</th>
                  <th className="p-3 text-start">الصافي</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const typeInfo = getTypeInfo(r.salary_type)
                  const statusInfo = getStatusInfo(r.status)
                  const totalDeduct = (r.absence_deduction || 0) + (r.late_deduction || 0) +
                                      (r.advances_deduction || 0) + (r.other_deductions || 0)
                  const totalBonus = (r.bonus || 0) + (r.manual_adjustment || 0)

                  return (
                    <tr key={r.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3 font-semibold">{r.teacher_name}</td>
                      <td className="p-3">
                        <span className="badge text-xs"
                              style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {r.salary_type === 'per_lesson'
                          ? <span className="text-xs">{r.lesson_count} × {fmt(r.lesson_price)}</span>
                          : fmt(r.base_salary)}
                      </td>
                      <td className="p-3 text-blue-500">{fmt(r.allowances)}</td>
                      <td className="p-3 text-purple-500 font-bold">
  {r.bonus > 0 ? `+${fmt(r.bonus)}` : '—'}
</td>
                      <td className="p-3 text-emerald-600">
                        {totalBonus > 0 ? `+${fmt(totalBonus)}` : '—'}
                      </td>
                      <td className="p-3 text-red-500">
                        {totalDeduct > 0 ? `-${fmt(totalDeduct)}` : '—'}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">{fmt(r.net_salary)}</td>
                      <td className="p-3">
                        <span className="badge text-xs"
                              style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {r.status === 'draft' && hasPermission('payroll.calculate') && (
                            <>
                              <button onClick={() => openEdit(r)}
                                      className="btn-ghost !p-2 text-blue-500"
                                      title="تعديل">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleApprove(r)}
                                      className="btn-ghost !p-2 text-emerald-500"
                                      title="اعتماد">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={() => handleDelete(r)}
                                      className="btn-ghost !p-2 text-red-500"
                                      title="حذف">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          {r.status === 'approved' && hasPermission('payroll.pay') && (
                            <button onClick={() => handlePay(r)}
                                    className="btn-primary !py-1 !px-3 !text-xs flex items-center gap-1">
                              <DollarSign size={12} />
                              صرف
                            </button>
                          )}
                          {r.status === 'paid' && (
                            <span className="text-xs text-emerald-600 font-bold">✓ تم الصرف</span>
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

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex items-center justify-between"
                 style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Calculator className="text-primary-500" size={22} />
                  معاينة كشوف {MONTHS[selectedMonth - 1]} {selectedYear}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  إجمالي: <strong className="text-emerald-600">{fmt(previewData.grandTotal)} د.ع</strong>
                </p>
              </div>
              <button onClick={() => setShowPreviewModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b sticky top-0" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                    <th className="p-2 text-start">المعلم</th>
                    <th className="p-2 text-start">النوع</th>
                    <th className="p-2 text-start">الأساسي</th>
                    <th className="p-2 text-start">البدلات</th>
                    <th className="p-2 text-start">خصم غياب</th>
                    <th className="p-2 text-start">خصم تأخير</th>
                    <th className="p-2 text-start">سلف</th>
                    <th className="p-2 text-start">الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.records.map((r) => {
                    const typeInfo = getTypeInfo(r.salary_type)
                    return (
                      <tr key={r.teacher_id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-2 font-semibold">{r.teacher_name}</td>
                        <td className="p-2 text-xs">{typeInfo.icon} {typeInfo.label}</td>
                        <td className="p-2">{fmt(r.base_salary)}</td>
                        <td className="p-2 text-blue-500">{fmt(r.allowances)}</td>
                        <td className="p-2 text-red-500">{r.absence_deduction > 0 ? `-${fmt(r.absence_deduction)}` : '—'}</td>
                        <td className="p-2 text-amber-500">{r.late_deduction > 0 ? `-${fmt(r.late_deduction)}` : '—'}</td>
                        <td className="p-2 text-red-500">{r.advances_deduction > 0 ? `-${fmt(r.advances_deduction)}` : '—'}</td>
                        <td className="p-2 font-bold text-emerald-600">{fmt(r.net_salary)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={handleGenerate} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={18} />
                تأكيد وإنشاء الكشوف
              </button>
              <button onClick={() => setShowPreviewModal(false)} className="btn-ghost">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">تعديل راتب {editingRecord.teacher_name}</h3>
              <button onClick={() => setShowEditModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl text-sm space-y-1.5"
                   style={{ background: 'rgba(99,102,241,0.08)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>الأساسي:</span>
                  <strong>{fmt(editingRecord.base_salary)}</strong>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>البدلات:</span>
                  <strong className="text-blue-500">{fmt(editingRecord.allowances)}</strong>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>خصم غياب:</span>
                  <strong className="text-red-500">-{fmt(editingRecord.absence_deduction)}</strong>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>خصم تأخير:</span>
                  <strong className="text-amber-500">-{fmt(editingRecord.late_deduction)}</strong>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>سلف:</span>
                  <strong className="text-red-500">-{fmt(editingRecord.advances_deduction)}</strong>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">🎁 مكافأة (د.ع)</label>
                <input type="number" value={editForm.bonus}
                       onChange={(e) => setEditForm({ ...editForm, bonus: parseFloat(e.target.value) || 0 })}
                       className="input-modern" min="0" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">💰 خصومات أخرى (د.ع)</label>
                <input type="number" value={editForm.other_deductions}
                       onChange={(e) => setEditForm({ ...editForm, other_deductions: parseFloat(e.target.value) || 0 })}
                       className="input-modern" min="0" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">⚖️ تعديل يدوي (سالب = خصم، موجب = إضافة)</label>
                <input type="number" value={editForm.manual_adjustment}
                       onChange={(e) => setEditForm({ ...editForm, manual_adjustment: parseFloat(e.target.value) || 0 })}
                       className="input-modern" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظة التعديل</label>
                <textarea value={editForm.adjustment_note}
                          onChange={(e) => setEditForm({ ...editForm, adjustment_note: e.target.value })}
                          className="input-modern" rows="2"
                          placeholder="سبب التعديل..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleEditSave} className="btn-primary flex-1">حفظ</button>
                <button onClick={() => setShowEditModal(false)} className="btn-ghost">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showBulkPrint && (
  <BulkPrintSlips
    records={records}
    title={`كشوف رواتب ${MONTHS[selectedMonth - 1]} ${selectedYear}`}
    onClose={() => setShowBulkPrint(false)}
  />
)}
    </div>
  )
}