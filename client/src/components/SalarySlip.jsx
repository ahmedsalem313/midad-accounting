// client/src/components/SalarySlip.jsx
import { Printer, X } from 'lucide-react'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

const SALARY_TYPES = {
  fixed:      { label: 'مقطوع' },
  per_lesson: { label: 'بالحصة' },
  mixed:      { label: 'مركّب' },
}

export default function SalarySlip({ record, onClose, inline = false }) {
  if (!record) return null

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')

  const slip = (
    <div
      id={inline ? `slip-${record.id}` : 'print-slip'}
      className="salary-slip bg-white text-slate-900 mx-auto"
      style={{
        width: '148mm',
        minHeight: '210mm',
        padding: '10mm',
        direction: 'rtl',
        fontFamily: 'Cairo, sans-serif',
        pageBreakAfter: 'always',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '3px double #6366F1', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            🖋️
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>مداد المحاسبي</h1>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>نظام إدارة مدرسية متكامل</p>
          </div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '10px', color: '#64748b' }}>
          <p style={{ margin: 0 }}>التاريخ: <strong style={{ color: '#1e293b' }} dir="ltr">{new Date().toLocaleDateString('en-GB')}</strong></p>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(99,102,241,0.2)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#4338CA' }}>كشف راتب</h2>
        <p style={{ fontSize: '12px', margin: '6px 0 0 0', color: '#6366F1', fontWeight: 'bold' }}>
          {MONTHS[(record.month || 1) - 1]} {record.year}
        </p>
      </div>

      <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ background: '#f8fafc', padding: '6px 12px', borderBottom: '1.5px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
          👤 بيانات المعلم
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 12px', color: '#64748b', width: '38%' }}>الاسم</td>
              <td style={{ padding: '6px 12px', fontWeight: 'bold', color: '#1e293b' }}>{record.teacher_name}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px', color: '#64748b' }}>نوع الراتب</td>
              <td style={{ padding: '6px 12px', color: '#1e293b' }}>
                {SALARY_TYPES[record.salary_type]?.label || 'مقطوع'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ background: '#f0fdf4', padding: '6px 12px', borderBottom: '1.5px solid #86efac', fontSize: '11px', fontWeight: 'bold', color: '#166534' }}>
          ➕ الإضافات
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 12px', color: '#64748b', width: '60%' }}>الراتب الأساسي</td>
              <td style={{ padding: '6px 12px', fontWeight: 'bold', color: '#1e293b' }}>{fmt(record.base_salary)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 12px', color: '#64748b' }}>البدلات</td>
              <td style={{ padding: '6px 12px', color: '#1e293b' }}>{fmt(record.allowances)}</td>
            </tr>
           <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
  <td style={{ padding: '6px 12px', color: '#64748b', verticalAlign: 'top' }}>
    🎁 المكافآت {record.rewards_count > 0 && `(${record.rewards_count})`}
  </td>
  <td style={{ padding: '6px 12px', color: '#7c3aed', fontWeight: 'bold' }}>
    {record.bonus > 0 ? (
      <div>
        {record.rewards_list && record.rewards_list.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {record.rewards_list.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontWeight: 'normal', fontSize: '10px' }}>
                <span style={{ color: '#64748b' }}>• {r.title}</span>
                <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>+{fmt(r.amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', marginTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ color: '#1e293b', fontWeight: 'bold' }}>المجموع</span>
              <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>+{fmt(record.bonus)}</span>
            </div>
          </div>
        ) : (
          <span>+{fmt(record.bonus)}</span>
        )}
      </div>
    ) : '—'}
  </td>
</tr>
            <tr>
              <td style={{ padding: '6px 12px', color: '#64748b' }}>⚖️ تعديل يدوي</td>
              <td style={{ padding: '6px 12px', color: record.manual_adjustment >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                {record.manual_adjustment ? (record.manual_adjustment > 0 ? `+${fmt(record.manual_adjustment)}` : fmt(record.manual_adjustment)) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ background: '#fef2f2', padding: '6px 12px', borderBottom: '1.5px solid #fecaca', fontSize: '11px', fontWeight: 'bold', color: '#991b1b' }}>
          ➖ الخصومات
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 12px', color: '#64748b', width: '60%' }}>خصم الغياب ({record.absence_days || 0} يوم)</td>
              <td style={{ padding: '6px 12px', color: '#ef4444' }}>{record.absence_deduction > 0 ? `-${fmt(record.absence_deduction)}` : '—'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 12px', color: '#64748b' }}>خصم التأخير ({record.late_count || 0} مرة)</td>
              <td style={{ padding: '6px 12px', color: '#f59e0b' }}>{record.late_deduction > 0 ? `-${fmt(record.late_deduction)}` : '—'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 12px', color: '#64748b' }}>خصم السلف</td>
              <td style={{ padding: '6px 12px', color: '#ef4444' }}>{record.advances_deduction > 0 ? `-${fmt(record.advances_deduction)}` : '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px', color: '#64748b' }}>خصومات أخرى</td>
              <td style={{ padding: '6px 12px', color: '#ef4444' }}>{record.other_deductions > 0 ? `-${fmt(record.other_deductions)}` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px', fontSize: '10px', textAlign: 'center' }}>
        <div style={{ padding: '8px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <div style={{ color: '#0369a1', fontWeight: 'bold', fontSize: '14px' }}>{record.working_days || 0}</div>
          <div style={{ color: '#64748b' }}>أيام العمل</div>
        </div>
        <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div style={{ color: '#15803d', fontWeight: 'bold', fontSize: '14px' }}>{record.attendance_days || 0}</div>
          <div style={{ color: '#64748b' }}>أيام الحضور</div>
        </div>
        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <div style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '14px' }}>{record.absence_days || 0}</div>
          <div style={{ color: '#64748b' }}>أيام الغياب</div>
        </div>
        <div style={{ padding: '8px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <div style={{ color: '#b45309', fontWeight: 'bold', fontSize: '14px' }}>{record.late_count || 0}</div>
          <div style={{ color: '#64748b' }}>مرات التأخير</div>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>صافي الراتب</span>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
          {fmt(record.net_salary)}
          <span style={{ fontSize: '12px', marginRight: '4px' }}> د.ع</span>
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1.5px dashed #cbd5e1' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '22px' }}>توقيع المعلم</p>
          <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '22px' }}>ختم الإدارة</p>
          <div style={{ borderBottom: '1px solid #94a3b8' }}></div>
        </div>
      </div>

      <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
        <p style={{ margin: 0 }}>مداد المحاسبي — نظام إدارة مدرسية متكامل</p>
      </div>
    </div>
  )

  if (inline) {
    return (
      <div style={{ background: '#e2e8f0', padding: '20px', display: 'flex', justifyContent: 'center' }}>
        {slip}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-slip, #print-slip * { visibility: visible !important; }
          #print-slip {
            position: fixed !important;
            top: 0 !important; left: 0 !important; right: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          @page { size: A5 portrait; margin: 0; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="flex flex-col max-h-[95vh] w-full max-w-2xl my-4">
          <div className="flex gap-2 mb-3 justify-end">
            <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
              <Printer size={18} />
              طباعة
            </button>
            <button onClick={onClose} className="btn-ghost !bg-white/10 !text-white hover:!bg-white/20">
              <X size={18} />
              إغلاق
            </button>
          </div>
          <div className="overflow-auto rounded-2xl" style={{ background: '#e2e8f0' }}>
            {slip}
          </div>
        </div>
      </div>
    </>
  )
}
