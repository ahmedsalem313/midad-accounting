// client/src/components/ExportButton.jsx
import { FileDown } from 'lucide-react'
import { exportToExcel } from '../utils/exportExcel'

export default function ExportButton({ data, columns, filename, sheetName, label = 'تصدير Excel' }) {
  const handleExport = () => {
    exportToExcel(data, columns, filename, sheetName)
  }

  return (
    <button
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      title={!data || data.length === 0 ? 'لا توجد بيانات' : 'تصدير إلى Excel'}
    >
      <FileDown size={16} />
      {label}
    </button>
  )
}