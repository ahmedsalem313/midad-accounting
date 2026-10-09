// server/routes/absenceReminders.js
// ============================================
// ⚠️ قاعدة الاختبار:
// استخدم فقط "حيدر احمد سالم" (ID: 1639) لإرسال الواتساب
// باقي الطلاب أرقامهم وهمية
// ============================================

import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import { sendMessage, isReady } from '../services/whatsapp.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET /api/absence-reminders/today — غياب اليوم
// ============================================
router.get('/today', checkPermission('whatsapp.fees'), (req, res) => {
  try {
    const db = getDB()
    const date = req.query.date || new Date().toISOString().split('T')[0]
    const { grade, section } = req.query

    let sql = `
      SELECT
        a.id as attendance_id,
        a.date,
        a.session,
        a.status,
        a.notes,
        s.id as student_id,
        s.full_name,
        s.grade,
        s.section,
        s.gender,
        s.guardian_name,
        s.guardian_phone,
        s.absence_total,
        s.absence_streak,
        s.absence_level
      FROM student_attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.date = ?
        AND a.status = 'absent'
    `
    const params = [date]

    if (grade) { sql += ' AND s.grade = ?'; params.push(grade) }
    if (section) { sql += ' AND s.section = ?'; params.push(section) }

    sql += ' ORDER BY s.grade, s.section, s.full_name'

    const rows = db.prepare(sql).all(...params)

    // هل أُرسل إشعار سابقًا اليوم؟
    const sentToday = db.prepare(`
      SELECT recipient_id as student_id FROM messages
      WHERE template = 'absence_notice'
        AND DATE(created_at) = ?
        AND status = 'sent'
    `).all(date).map((r) => r.student_id)

    const sentSet = new Set(sentToday)

    const students = rows.map((r) => ({
      ...r,
      already_sent: sentSet.has(r.student_id),
    }))

    const stats = {
      total: students.length,
      sent: students.filter((s) => s.already_sent).length,
      pending: students.filter((s) => !s.already_sent).length,
    }

    res.json({ success: true, data: { students, stats, date } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST /api/absence-reminders/send — إرسال تذكيرات
// ============================================
router.post('/send', checkPermission('whatsapp.fees'), async (req, res) => {
  try {
    const db = getDB()
    const { student_ids, message_template, max_per_session = 50 } = req.body

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'اختر طالبًا واحدًا على الأقل' })
    }

    if (!isReady()) {
      return res.status(503).json({ success: false, error: 'WhatsApp غير متصل' })
    }

    const today = new Date().toISOString().split('T')[0]

    const placeholders = student_ids.map(() => '?').join(',')
    const students = db.prepare(`
      SELECT s.id, s.full_name, s.grade, s.section, s.guardian_name, s.guardian_phone,
             s.absence_total, s.absence_streak
      FROM students s
      WHERE s.id IN (${placeholders})
    `).all(...student_ids)

    const schoolRow = db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get()
    const schoolName = schoolRow?.value || 'مداد المحاسبي'

    const maxToSend = Math.min(parseInt(max_per_session) || 50, students.length)
    const listToSend = students.slice(0, maxToSend)
    const remainingCount = students.length - maxToSend

    let sent = 0
    let failed = 0

    for (let i = 0; i < listToSend.length; i++) {
      const student = listToSend[i]

      // جلب التاريخ الفعلي للغياب
      const att = db.prepare(`
        SELECT date, session, notes FROM student_attendance
        WHERE student_id = ? AND date = ? AND status = 'absent'
        LIMIT 1
      `).get(student.id, today)

      const absenceDate = att?.date || today
      const sessionLabel = att?.session === 'evening' ? 'مسائي' : 'صباحي'

      let msg = message_template || `عزيزي ولي الأمر ${student.guardian_name || ''}،

نود إعلامكم بأن ابنكم/ابنتكم ${student.full_name} (${student.grade}${student.section ? ' - شعبة ' + student.section : ''}) قد تغيّب اليوم ${absenceDate} (الدوام ${sessionLabel}).

📊 إجمالي الغياب: ${student.absence_total || 1} يوم
${student.absence_streak > 1 ? `⚠️ غياب متتالي: ${student.absence_streak} أيام` : ''}

يرجى متابعة الحضور بانتظام.

شكرًا لتعاونكم.
${schoolName}`

      msg = msg
        .replace(/{اسم_الطالب}/g, student.full_name)
        .replace(/{اسم_ولي_الأمر}/g, student.guardian_name || '')
        .replace(/{الصف}/g, student.grade)
        .replace(/{التاريخ}/g, absenceDate)
        .replace(/{إجمالي_الغياب}/g, String(student.absence_total || 0))
        .replace(/{اسم_المدرسة}/g, schoolName)

      try {
        await sendMessage(student.guardian_phone, msg)

        db.prepare(`
          INSERT INTO messages 
          (recipient_type, recipient_id, phone, message, template, status, sent_at, sent_by)
          VALUES ('student', ?, ?, ?, 'absence_notice', 'sent', CURRENT_TIMESTAMP, ?)
        `).run(student.id, student.guardian_phone, msg, req.user.id)

        sent++
      } catch (sendErr) {
        db.prepare(`
          INSERT INTO messages 
          (recipient_type, recipient_id, phone, message, template, status, error, sent_by)
          VALUES ('student', ?, ?, ?, 'absence_notice', 'failed', ?, ?)
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