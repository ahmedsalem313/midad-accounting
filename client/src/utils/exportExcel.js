// client/src/utils/exportExcel.js
import * as XLSX from 'xlsx'

/**
 * تصدير بيانات إلى ملف Excel
 * @param {Array} data - مصفوفة من الكائنات
 * @param {Array} columns - [{ key, label, format? }]
 * @param {string} filename - اسم الملف بدون امتداد
 * @param {string} sheetName - اسم الورقة
 */
export function exportToExcel(data, columns, filename = 'تصدير', sheetName = 'البيانات') {
  if (!data || data.length === 0) {
    alert('لا توجد بيانات للتصدير')
    return
  }

  // بناء الصفوف بناءً على الأعمدة
  const rows = data.map((item) => {
    const row = {}
    for (const col of columns) {
      let value = item[col.key]
      if (col.format) {
        value = col.format(value, item)
      }
      row[col.label] = value ?? ''
    }
    return row
  })

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(rows)

  // ضبط عرض الأعمدة تلقائيًا
  const colWidths = columns.map((col) => ({
    wch: Math.max(
      col.label.length,
      ...rows.map((r) => String(r[col.label] || '').length)
    ) + 2,
  }))
  ws['!cols'] = colWidths

  // إنشاء المصنف
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // تنزيل الملف
  const dateStr = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`)
}