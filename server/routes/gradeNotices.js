// server/routes/gradeNotices.js
// ============================================
// ⚠️ قاعدة الاختبار:
// استخدم فقط "حيدر احمد سالم" (ID: 1639) لإرسال الواتساب
// ============================================

import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import { sendMessage, isReady } from '../services/whatsapp.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET — آخر الطلاب الذين أُضيفت لهم درجات
// ============================================
router.get('/recent', checkPermission('whatsapp.grades'), (req, res) => {
  try {
    const db = getDB()
    const { grade, days = 7 } = req.query

    const since = new Date()
    since.setDate(since.getDate() - parseInt(days))

    let sql = `
      SELECT
        g.student_id,
        s.full_name,
        s.grade,
        s.section,
        s.gender,
        s.guardian_name,
        s.guardian_phone,
        COUNT(*) as grades_count,
        MAX(g.created_at) as last_grade_at,
        GROUP_CONCAT(DISTINCT g.subject) as subjects
      FROM grades g
      JOIN students s ON s.id = g.student_id
      WHERE g.created_at >= ?
        AND s.status = 'active'
        AND s.guardian_phone IS NOT NULL
        AND s.guardian_phone != ''
    `
    const params = [since.toISOString()]

    if (grade) {
      sql += ' AND s.grade = ?'
      params.push(grade)
    }

    sql += ' GROUP BY g.student_id ORDER BY last_grade_at DESC'

    const rows = db.prepare(sql).all(...params)

    // هل أُرسل إشعار درجات مؤخرًا؟
    const since2 = new Date()
    since2.setDate(since2.getDate() - 3)
    const recentSent = db.prepare(`
      SELECT recipient_id FROM messages
      WHERE template = 'grades_notice'
        AND status = 'sent'
        AND created_at >= ?
    `).all(since2.toISOString()).map((r) => r.recipient_id)

    const sentSet = new Set(recentSent)

    const students = rows.map((r) => ({
      ...r,
      recently_sent: sentSet.has(r.student_id),
    }))

    const stats = {
      total: students.length,
      pending: students.filter((s) => !s.recently_sent).length,
      sent: students.filter((s) => s.recently_sent).length,
    }

    res.json({ success: true, data: { students, stats } })
  } catch (error) {
    console.error('grade notices error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST — إرسال إشعارات
// ============================================
router.post('/send', checkPermission('whatsapp.grades'), async (req, res) => {
  try {
    const db = getDB()
    const { student_ids, message_template, max_per_session = 50, days = 7 } = req.body

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'اختر طالبًا واحدًا على الأقل' })
    }

    if (!isReady()) {
      return res.status(503).json({ success: false, error: 'WhatsApp غير متصل' })
    }

    const placeholders = student_ids.map(() => '?').join(',')
    const students = db.prepare(`
      SELECT id, full_name, grade, section, guardian_name, guardian_phone
      FROM students WHERE id IN (${placeholders})
    `).all(...student_ids)

       const schoolRow = db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get()
    const schoolName = schoolRow?.value || 'مداد المحاسبي'

    const portalRow = db.prepare("SELECT value FROM settings WHERE key = 'parent_portal_url'").get()
    const parentPortalUrl = portalRow?.value || ''
    const subjectNames = {
      islamic: 'التربية الإسلامية', arabic: 'اللغة العربية',
      english: 'اللغة الإنجليزية', french: 'اللغة الفرنسية',
      math: 'الرياضيات', science: 'العلوم',
      chemistry: 'الكيمياء', physics: 'الفيزياء', biology: 'الأحياء',
      social: 'الاجتماعيات', computer: 'الحاسوب',
      art: 'التربية الفنية', pe: 'التربية الرياضية',
      sociology: 'علم الاجتماع', philosophy: 'الفلسفة', economics: 'الاقتصاد',
    }

    const examNames = {
      monthly_1: 'الشهر الأول', monthly_2: 'الشهر الثاني',
      midterm: 'نصف السنة', final: 'النهائي',
      quiz: 'اختبار قصير', homework: 'واجب',
      participation: 'مشاركة', activity: 'نشاط',
    }

    const since = new Date()
    since.setDate(since.getDate() - parseInt(days))

    const maxToSend = Math.min(parseInt(max_per_session) || 50, students.length)
    const listToSend = students.slice(0, maxToSend)
    const remainingCount = students.length - maxToSend

    let sent = 0
    let failed = 0

    for (let i = 0; i < listToSend.length; i++) {
      const student = listToSend[i]

      // جلب آخر 5 درجات
      const grades = db.prepare(`
        SELECT subject, exam_type, score, max_score, exam_date
        FROM grades
        WHERE student_id = ? AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(student.id, since.toISOString())

      const gradesText = grades
        .map((g) => {
          const subject = subjectNames[g.subject] || g.subject
          const exam = examNames[g.exam_type] || g.exam_type
          const pct = g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(0) : '0'
          return `• ${subject} (${exam}): ${g.score}/${g.max_score} — ${pct}%`
        })
        .join('\n')

      const portalSection = parentPortalUrl
        ? `\n📌 لمتابعة كامل الدرجات، يرجى الدخول إلى بوابة ولي الأمر:\n${parentPortalUrl}\n`
        : `\n📌 لمتابعة كامل الدرجات، يرجى التواصل مع إدارة المدرسة.\n`

      let msg = message_template || `عزيزي ولي الأمر ${student.guardian_name || ''}،

نود إعلامكم بالدرجات الجديدة للطالب ${student.full_name} (${student.grade}${student.section ? ' - ' + student.section : ''}):

${gradesText}
${portalSection}
شكرًا لتعاونكم.
${schoolName}`

      msg = msg
        .replace(/{اسم_الطالب}/g, student.full_name)
        .replace(/{اسم_ولي_الأمر}/g, student.guardian_name || '')
        .replace(/{الصف}/g, student.grade)
        .replace(/{الدرجات}/g, gradesText)
        .replace(/{اسم_المدرسة}/g, schoolName)
        .replace(/{رابط_البوابة}/g, parentPortalUrl || '')

      try {
        await sendMessage(student.guardian_phone, msg)

        db.prepare(`
          INSERT INTO messages 
          (recipient_type, recipient_id, phone, message, template, status, sent_at, sent_by)
          VALUES ('student', ?, ?, ?, 'grades_notice', 'sent', CURRENT_TIMESTAMP, ?)
        `).run(student.id, student.guardian_phone, msg, req.user.id)

        sent++
      } catch (sendErr) {
        db.prepare(`
          INSERT INTO messages 
          (recipient_type, recipient_id, phone, message, template, status, error, sent_by)
          VALUES ('student', ?, ?, ?, 'grades_notice', 'failed', ?, ?)
        `).run(student.id, student.guardian_phone, msg, sendErr.message, req.user.id)

        failed++
      }

      if (i < listToSend.length - 1) {
        await new Promise((r) => setTimeout(r, 3000))
      }
    }

    res.json({
      success: true,
      data: { sent, failed, remaining: remainingCount },
      message: remainingCount > 0
        ? `تم إرسال ${sent}، فشل ${failed}. متبقي ${remainingCount}.`
        : `تم إرسال ${sent}، فشل ${failed}.`,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router