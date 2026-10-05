// server/services/pdfGenerator.js
import PDFDocument from 'pdfkit'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import arabicReshaperPkg from 'arabic-reshaper'
const arabicReshaper = arabicReshaperPkg.default || arabicReshaperPkg
import bidiFactory from 'bidi-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const bidi = bidiFactory()

// مسار الخط العربي
const FONT_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Cairo-Regular.ttf')
const FONT_BOLD_PATH = FONT_PATH // سنستخدم نفس الخط
const FONT_NAME = 'Cairo'

// ============================================
// تحويل النص العربي ليظهر بشكل صحيح في PDF
// ============================================
function ar(text) {
  if (text === null || text === undefined) return ''
  const str = String(text)

  // إعادة ترتيب الحروف العربية (reshaping)
  const reshaped = arabicReshaper.reshape(str)

  // إعادة ترتيب الاتجاه (bidi)
  const bidiText = bidi.getEmbeddingLevels(reshaped, 'rtl')
  const reordered = bidi.getReorderedString(reshaped, bidiText)

  return reordered
}

// ============================================
// تسجيل الخط في PDFKit
// ============================================
function registerFonts(doc) {
  doc.registerFont(FONT_NAME, FONT_PATH)
  doc.registerFont('Cairo-Bold', FONT_BOLD_PATH)
}

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

      registerFonts(doc)

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

      // اسم المدرسة (وسط الترويسة)
      doc
        .font(FONT_NAME)
        .fontSize(22)
        .fillColor('#FFFFFF')
        .text(ar(options.schoolName || 'مداد المحاسبي'), 0, 30, {
          align: 'center',
          width: pageWidth,
        })

      doc
        .fontSize(11)
        .fillColor('#E0E7FF')
        .text(ar('نظام إدارة مدرسية متكامل'), 0, 62, {
          align: 'center',
          width: pageWidth,
        })

      // التاريخ على اليسار (بالإنجليزية)
      doc
        .font(FONT_NAME)
        .fontSize(10)
        .fillColor('#E0E7FF')
        .text(
          `Date: ${new Date().toLocaleDateString('en-GB')}`,
          margin,
          45,
          { align: 'left', width: pageWidth - margin * 2 }
        )

      // ============================================
      // العنوان الرئيسي
      // ============================================
      doc
        .font(FONT_NAME)
        .fontSize(18)
        .fillColor('#4338CA')
        .text(ar('كشف درجات الطالب'), 0, 130, {
          align: 'center',
          width: pageWidth,
        })

      // ============================================
      // بيانات الطالب
      // ============================================
      const infoY = 175
      const boxWidth = pageWidth - margin * 2

      doc.roundedRect(margin, infoY, boxWidth, 90, 8).fill('#EEF2FF')

      // عنوان الصندوق
      doc
        .font(FONT_NAME)
        .fontSize(12)
        .fillColor('#4338CA')
        .text(ar('بيانات الطالب'), 0, infoY + 12, {
          align: 'center',
          width: pageWidth,
        })

      // الصف الأول: الاسم + ولي الأمر
      doc.font(FONT_NAME).fontSize(10).fillColor('#475569')
      doc.text(ar('الاسم:'), margin + 15, infoY + 42)
      doc.fontSize(11).fillColor('#1e293b')
      doc.text(ar(student.full_name), margin + 60, infoY + 42, { width: 180 })

      if (student.guardian_name) {
        doc.font(FONT_NAME).fontSize(10).fillColor('#475569')
        doc.text(ar('ولي الأمر:'), pageWidth / 2 + 20, infoY + 42)
        doc.fontSize(11).fillColor('#1e293b')
        doc.text(ar(student.guardian_name), pageWidth / 2 + 85, infoY + 42, { width: 180 })
      }

      // الصف الثاني: الصف + الشعبة
      doc.font(FONT_NAME).fontSize(10).fillColor('#475569')
      doc.text(ar('الصف:'), margin + 15, infoY + 65)
      doc.fontSize(11).fillColor('#1e293b')
      doc.text(
        ar(`${student.grade}${student.section ? ' - شعبة ' + student.section : ''}`),
        margin + 60,
        infoY + 65,
        { width: 180 }
      )

      // ============================================
      // جدول الدرجات
      // ============================================
      const tableTop = infoY + 110
      const tableWidth = pageWidth - margin * 2
      const colWidths = [
        tableWidth * 0.4,
        tableWidth * 0.2,
        tableWidth * 0.2,
        tableWidth * 0.2,
      ]
      const headers = ['المادة', 'الدرجة', 'العظمى', 'النسبة']
      const headerY = tableTop

      // رأس الجدول
      doc.rect(margin, headerY, tableWidth, 30).fill('#6366F1')

      let xPos = margin
      headers.forEach((header, i) => {
        doc
          .font(FONT_NAME)
          .fontSize(12)
          .fillColor('#FFFFFF')
          .text(ar(header), xPos, headerY + 9, {
            width: colWidths[i],
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

        doc.rect(margin, rowY, tableWidth, rowHeight).fill(bgColor)

        const percentage = grade.max_score > 0
          ? (grade.score / grade.max_score) * 100
          : 0
        totalScore += grade.score
        totalMax += grade.max_score

        let percentColor = '#EF4444'
        if (percentage >= 90) percentColor = '#10B981'
        else if (percentage >= 75) percentColor = '#3B82F6'
        else if (percentage >= 50) percentColor = '#F59E0B'

        doc.strokeColor('#E2E8F0').lineWidth(0.5)
        doc.rect(margin, rowY, tableWidth, rowHeight).stroke()

        xPos = margin

        // اسم المادة (يعرض الاسم العربي إن وُجد)
        doc
          .font(FONT_NAME)
          .fontSize(11)
          .fillColor('#1e293b')
          .text(ar(grade.subject_name || grade.subject || '-'), xPos, rowY + 9, {
            width: colWidths[0],
            align: 'center',
          })
        xPos += colWidths[0]

        // الدرجة
        doc
          .font(FONT_NAME)
          .fontSize(11)
          .fillColor('#1e293b')
          .text(String(grade.score), xPos, rowY + 9, {
            width: colWidths[1],
            align: 'center',
          })
        xPos += colWidths[1]

        // العظمى
        doc
          .font(FONT_NAME)
          .fontSize(11)
          .fillColor('#64748b')
          .text(String(grade.max_score), xPos, rowY + 9, {
            width: colWidths[2],
            align: 'center',
          })
        xPos += colWidths[2]

        // النسبة
        doc
          .font(FONT_NAME)
          .fontSize(11)
          .fillColor(percentColor)
          .text(`${percentage.toFixed(1)}%`, xPos, rowY + 9, {
            width: colWidths[3],
            align: 'center',
          })

        rowY += rowHeight
      })

      // ============================================
      // المجموع
      // ============================================
      const summaryY = rowY + 15

      doc.roundedRect(margin, summaryY, tableWidth, 60, 8).fill('#EEF2FF')

      const avg = totalMax > 0 ? (totalScore / totalMax) * 100 : 0

      // النتيجة الإجمالية
      doc.font(FONT_NAME).fontSize(11).fillColor('#4338CA')
      doc.text(ar('النتيجة الإجمالية'), margin + 15, summaryY + 10, { width: 150 })
      doc.fontSize(13).fillColor('#1e293b')
      doc.text(`${totalScore} / ${totalMax}`, margin + 15, summaryY + 30, { width: 150 })

      // المعدل العام
      doc.font(FONT_NAME).fontSize(11).fillColor('#4338CA')
      doc.text(ar('المعدل العام'), pageWidth - margin - 160, summaryY + 10, {
        width: 150,
        align: 'right',
      })
      doc
        .fontSize(20)
        .fillColor(avg >= 50 ? '#10B981' : '#EF4444')
        .text(`${avg.toFixed(2)}%`, pageWidth - margin - 160, summaryY + 26, {
          width: 150,
          align: 'right',
        })

      // ============================================
      // التذييل
      // ============================================
      const footerY = summaryY + 100

      doc
        .strokeColor('#CBD5E1')
        .lineWidth(1)
        .dash(5, { space: 5 })
        .moveTo(margin, footerY)
        .lineTo(pageWidth - margin, footerY)
        .stroke()
        .undash()

      doc.font(FONT_NAME).fillColor('#64748b').fontSize(10)

      // توقيع ولي الأمر (يمين)
      doc.text(ar('توقيع ولي الأمر'), pageWidth - margin - 150, footerY + 30, {
        width: 150,
        align: 'center',
      })
      doc
        .moveTo(pageWidth - margin - 150, footerY + 60)
        .lineTo(pageWidth - margin, footerY + 60)
        .stroke()

      // ختم المدرسة (يسار)
      doc.text(ar('ختم المدرسة'), margin, footerY + 30, {
        width: 150,
        align: 'center',
      })
      doc
        .moveTo(margin, footerY + 60)
        .lineTo(margin + 150, footerY + 60)
        .stroke()

      // تذييل
      doc
        .font(FONT_NAME)
        .fillColor('#94A3B8')
        .fontSize(9)
        .text(
          ar('هذا الكشف صادر إلكترونياً من مداد المحاسبي — نظام إدارة مدرسية'),
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