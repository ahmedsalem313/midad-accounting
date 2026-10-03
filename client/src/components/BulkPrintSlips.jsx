// client/src/components/BulkPrintSlips.jsx
import { Printer, X } from 'lucide-react'
import SalarySlip from './SalarySlip'

export default function BulkPrintSlips({ records, onClose, title = 'كشوف الرواتب' }) {
  if (!records || records.length === 0) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .bulk-print-area, .bulk-print-area * { visibility: visible !important; }
          .bulk-print-area {
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .salary-slip {
            page-break-after: always;
          }
          .no-print { display: none !important; }
          @page { size: A5 portrait; margin: 0; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
        <div className="no-print flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b"
             style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              عدد الكشوف: {records.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
              <Printer size={18} />
              طباعة الكل ({records.length})
            </button>
            <button onClick={onClose} className="btn-ghost flex items-center gap-2">
              <X size={18} />
              إغلاق
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-300 dark:bg-slate-900 p-4">
          <div className="bulk-print-area space-y-4">
            {records.map((r) => (
              <SalarySlip key={r.id} record={r} inline />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
