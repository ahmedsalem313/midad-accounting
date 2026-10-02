import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
// توليد كشف درجات PDF
// ============================================
export async function generateGradeReport(student, grades, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `كشف درجات - ${student.full_name}`,
          Author: options.schoolName || 'مداد المحاسبي',
        },
      })

      const chunks = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // ============================================
      // الترويسة
      // ============================================
      const pageWidth = doc.page.width
      const margin = 40

      // شريط علوي ملون
      doc.rect(0, 0, pageWidth, 100).fill('#6366F1')

      // شعار
      doc.fontSize(36).fillColor('#FFFFFF').text('🖋️', margin, 30)

      // اسم المدرسة
      doc
        .fontSize(22)
        .fillColor('#FFFFFF')
        .text(options.schoolName || 'مداد المحاسبي', 100, 35)

      doc
        .fontSize(11)
        .fillColor('#E0E7FF')
        .text('نظام إدارة مدرسية متكامل', 100, 65)

      // التاريخ على اليسار
      doc
        .fontSize(10)
        .fillColor('#E0E7FF')
        .text(
          `التاريخ: ${new Date().toLocaleDateString('en-GB')}`,
          0,
          45,
          { align: 'left', width: pageWidth - margin }
        )

      // ============================================
      // العنوان الرئيسي
      // ============================================
      doc
        .fontSize(18)
        .fillColor('#4338CA')
        .text('كشف درجات الطالب', 0, 130, { align: 'center', width: pageWidth })

      // ============================================
      // بيانات الطالب
      // ============================================
      doc.y = 175

      // صندوق معلومات الطالب
      const infoY = doc.y
      doc.roundedRect(margin, infoY, pageWidth - margin * 2, 80, 8).fill('#EEF2FF')

      doc.fillColor('#4338CA').fontSize(12).text('👤 بيانات الطالب', margin + 15, infoY + 12)

      doc.fillColor('#475569').fontSize(10)
      doc.text('الاسم:', margin + 15, infoY + 38)
      doc.fillColor('#1e293b').fontSize(11).text(student.full_name, margin + 60, infoY + 38)

      doc.fillColor('#475569').fontSize(10)
      doc.text('الصف:', margin + 15, infoY + 58)
      doc.fillColor('#1e293b').fontSize(11).text(
        `${student.grade}${student.section ? ' - شعبة ' + student.section : ''}`,
        margin + 60,
        infoY + 58
      )

      if (student.guardian_name) {
        doc.fillColor('#475569').fontSize(10)
        doc.text('ولي الأمر:', margin + 250, infoY + 38)
        doc.fillColor('#1e293b').fontSize(11).text(student.guardian_name, margin + 320, infoY + 38)
      }

      // ============================================
      // جدول الدرجات
      // ============================================
      const tableTop = infoY + 110
      const tableWidth = pageWidth - margin * 2
      const colWidths = [tableWidth * 0.4, tableWidth * 0.2, tableWidth * 0.2, tableWidth * 0.2]
      const headers = ['المادة', 'الدرجة', 'العظمى', 'النسبة']
      const headerY = tableTop

      // رأس الجدول
      let xPos = margin
      doc.rect(margin, headerY, tableWidth, 30).fill('#6366F1')

      headers.forEach((header, i) => {
        doc
          .fontSize(12)
          .fillColor('#FFFFFF')
          .text(header, xPos + 10, headerY + 9, {
            width: colWidths[i] - 20,
            align: 'center',
          })
        xPos += colWidths[i]
      })

      // صفوف الجدول
      let rowY = headerY + 30
      let totalScore = 0
      let totalMax = 0

      grades.forEach((grade, index) => {
        const rowHeight = 28
        const bgColor = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF'

        // خلفية الصف
        doc.rect(margin, rowY, tableWidth, rowHeight).fill(bgColor)

        const percentage = grade.max_score > 0 ? (grade.score / grade.max_score) * 100 : 0
        totalScore += grade.score
        totalMax += grade.max_score

        // لون النسبة
        let percentColor = '#EF4444'
        if (percentage >= 90) percentColor = '#10B981'
        else if (percentage >= 75) percentColor = '#3B82F6'
        else if (percentage >= 50) percentColor = '#F59E0B'

        // الحدود
        doc.strokeColor('#E2E8F0').lineWidth(0.5)
        doc.rect(margin, rowY, tableWidth, rowHeight).stroke()

        xPos = margin

        // اسم المادة
        doc
          .fontSize(11)
          .fillColor('#1e293b')
          .text(grade.subject || grade.subject_name || '-', xPos + 10, rowY + 9, {
            width: colWidths[0] - 20,
            align: 'right',
          })
        xPos += colWidths[0]

        // الدرجة
        doc
          .fontSize(11)
          .fillColor('#1e293b')
          .text(String(grade.score), xPos + 10, rowY + 9, {
            width: colWidths[1] - 20,
            align: 'center',
          })
        xPos += colWidths[1]

        // العظمى
        doc
          .fontSize(11)
          .fillColor('#64748b')
          .text(String(grade.max_score), xPos + 10, rowY + 9, {
            width: colWidths[2] - 20,
            align: 'center',
          })
        xPos += colWidths[2]

        // النسبة
        doc
          .fontSize(11)
          .fillColor(percentColor)
          .text(`${percentage.toFixed(1)}%`, xPos + 10, rowY + 9, {
            width: colWidths[3] - 20,
            align: 'center',
          })

        rowY += rowHeight
      })

      // ============================================
      // المجموع
      // ============================================
      const summaryY = rowY + 15

      // صندوق المجموع
      doc.roundedRect(margin, summaryY, tableWidth, 60, 8).fill('#EEF2FF')

      const avg = totalMax > 0 ? (totalScore / totalMax) * 100 : 0

      doc.fillColor('#4338CA').fontSize(11).text('النتيجة الإجمالية', margin + 15, summaryY + 10)
      doc.fillColor('#1e293b').fontSize(13).text(`${totalScore} / ${totalMax}`, margin + 15, summaryY + 30)

      doc.fillColor('#4338CA').fontSize(11).text('المعدل العام', pageWidth - margin - 200, summaryY + 10)
      doc
        .fillColor(avg >= 50 ? '#10B981' : '#EF4444')
        .fontSize(20)
        .text(`${avg.toFixed(2)}%`, pageWidth - margin - 200, summaryY + 26)

      // ============================================
      // التذييل
      // ============================================
      const footerY = summaryY + 100

      // خط فاصل
      doc
        .strokeColor('#CBD5E1')
        .lineWidth(1)
        .dash(5, { space: 5 })
        .moveTo(margin, footerY)
        .lineTo(pageWidth - margin, footerY)
        .stroke()
        .undash()

      // التوقيعات
      doc.fillColor('#64748b').fontSize(10)
      doc.text('توقيع ولي الأمر', margin + 30, footerY + 30)
      doc.text('ختم المدرسة', pageWidth - margin - 130, footerY + 30)

      doc
        .moveTo(margin + 30, footerY + 60)
        .lineTo(margin + 150, footerY + 60)
        .stroke()
      doc
        .moveTo(pageWidth - margin - 130, footerY + 60)
        .lineTo(pageWidth - margin, footerY + 60)
        .stroke()

      // تذييل
      doc
        .fillColor('#94A3B8')
        .fontSize(9)
        .text(
          'هذا الكشف صادر إلكترونياً من مداد المحاسبي — نظام إدارة مدرسية',
          0,
          doc.page.height - 30,
          { align: 'center', width: pageWidth }
        )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}