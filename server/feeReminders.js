// ============================================
// ⚠️ قاعدة الاختبار:
// استخدم فقط "حيدر احمد سالم" (ID: 1639) لإرسال الواتساب
// باقي الطلاب أرقامهم وهمية
// ============================================
// server/routes/feeReminders.js
import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import { sendMessage, isReady } from '../services/whatsapp.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET — المتأخرون (مع تصفية المؤجّلين)
// ============================================
router.get('/outstanding', checkPermission('whatsapp.fees'), (req, res) => {
  try {
    const db = getDB()
    const { grade, min_remaining } = req.query
    const today = new Date().toISOString().split('T')[0]

    let sql = `
      SELECT 
        s.id, s.full_name, s.grade, s.section, s.guardian_name, s.guardian_phone,
        s.total_fees,
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE student_id = s.id), 0) as total_paid,
        (SELECT MAX(payment_date) FROM payments WHERE student_id = s.id) as last_payment_date
      FROM students s
      WHERE s.status = 'active' 
        AND s.guardian_phone IS NOT NULL 
        AND s.guardian_phone != ''
    `
    const params = []

    if (grade) {
      sql += ' AND s.grade = ?'
      params.push(grade)
    }

    const rows = db.prepare(sql).all(...params)

    // احسب المتبقي
    let list = rows.map((r) => ({
      ...r,
      remaining: (r.total_fees || 0) - (r.total_paid || 0),
      exclusion: null,
    }))

    // فلترة المتبقي > 0
    const minRem = parseFloat(min_remaining) || 1
    list = list.filter((r) => r.remaining >= minRem)

    // فلترة المؤجّلين
    const exclusions = db.prepare(`
      SELECT student_id, MAX(excluded_until) as excluded_until, reason
      FROM fee_reminder_exclusions
      WHERE excluded_until >= ?
      GROUP BY student_id
    `).all(today)

    const exclusionMap = {}
    for (const e of exclusions) {
      exclusionMap[e.student_id] = e
    }

    list = list.map((r) => {
      const ex = exclusionMap[r.id]
      if (ex) {
        return { ...r, exclusion: { until: ex.excluded_until, reason: ex.reason } }
      }
      return r
    })

    // الإحصائيات
    const stats = {
      total: list.length,
      excluded: list.filter((r) => r.exclusion).length,
      ready_to_send: list.filter((r) => !r.exclusion).length,
      total_remaining: list.reduce((s, r) => s + r.remaining, 0),
    }

    res.json({ success: true, data: { students: list, stats } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST — إرسال تذكيرات لمجموعة محددة
// ============================================
router.post('/send', checkPermission('whatsapp.fees'), async (req, res) => {
  try {
    const db = getDB()
    const { student_ids, message_template, max_per_session = 50 } = req.body

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد طالب واحد على الأقل' })
    }

    if (!isReady()) {
      return res.status(503).json({ success: false, error: 'WhatsApp غير متصل' })
    }

    // جلب بيانات الطلاب
    const placeholders = student_ids.map(() => '?').join(',')
    const students = db.prepare(`
      SELECT s.id, s.full_name, s.grade, s.section, s.guardian_name, s.guardian_phone,
             s.total_fees,
             COALESCE((SELECT SUM(paid_amount) FROM payments WHERE student_id = s.id), 0) as total_paid
      FROM students s
      WHERE s.id IN (${placeholders})
    `).all(...student_ids)

    if (students.length === 0) {
      return res.status(404).json({ success: false, error: 'لا يوجد طلاب' })
    }

    // اسم المدرسة
    const schoolRow = db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get()
    const schoolName = schoolRow?.value || 'مداد المحاسبي'

    // احترام الحد الأقصى
    const maxToSend = Math.min(parseInt(max_per_session) || 50, students.length)
    const listToSend = students.slice(0, maxToSend)
    const remainingCount = students.length - maxToSend

    // أنشئ جلسة
    const sessionResult = db.prepare(`
      INSERT INTO fee_reminder_sessions (total_targets, status, started_by)
      VALUES (?, 'running', ?)
    `).run(listToSend.length, req.user.id)

    const sessionId = sessionResult.lastInsertRowid

    // أرسل الرسائل
    let sent = 0
    let failed = 0

    for (const student of listToSend) {
      const remaining = (student.total_fees || 0) - (student.total_paid || 0)

      // نص الرسالة
      let msg = message_template || `عزيزي ولي الأمر ${student.guardian_name || ''}،

نود تذكيركم بأن القسط المتبقي للطالب ${student.full_name} (${student.grade}${student.section ? ' - شعبة ' + student.section : ''}) هو:

💰 ${remaining.toLocaleString('ar-IQ')} د.ع

يرجى تسوية المبلغ في أقرب وقت.

شكرًا لتعاونكم معنا.
${schoolName}`

      // استبدل المتغيرات
      msg = msg
        .replace(/{اسم_الطالب}/g, student.full_name)
        .replace(/{اسم_ولي_الأمر}/g, student.guardian_name || '')
        .replace(/{المبلغ_المتبقي}/g, remaining.toLocaleString('ar-IQ'))
        .replace(/{الصف}/g, student.grade)
        .replace(/{اسم_المدرسة}/g, schoolName)

      // سجل المحاولة
      const logResult = db.prepare(`
        INSERT INTO fee_reminder_log 
        (session_id, student_id, phone, remaining, message, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(sessionId, student.id, student.guardian_phone, remaining, msg)

      try {
        await sendMessage(student.guardian_phone, msg)

        db.prepare(`
          UPDATE fee_reminder_log 
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(logResult.lastInsertRowid)

        // سجل في جدول messages العام
        db.prepare(`
          INSERT INTO messages 
          (recipient_type, recipient_id, phone, message, template, status, sent_at, sent_by)
          VALUES ('student', ?, ?, ?, 'fee_reminder', 'sent', CURRENT_TIMESTAMP, ?)
        `).run(student.id, student.guardian_phone, msg, req.user.id)

        sent++
      } catch (sendErr) {
        db.prepare(`
          UPDATE fee_reminder_log 
          SET status = 'failed', error = ?
          WHERE id = ?
        `).run(sendErr.message, logResult.lastInsertRowid)

        failed++
      }

      // تأخير 3 ثوانٍ بين الرسائل (لتجنّب حظر WhatsApp)
      if (listToSend.indexOf(student) < listToSend.length - 1) {
        await new Promise((r) => setTimeout(r, 3000))
      }
    }

    // حدّث الجلسة
    db.prepare(`
      UPDATE fee_reminder_sessions
      SET finished_at = CURRENT_TIMESTAMP,
          sent_count = ?, failed_count = ?,
          status = ?
      WHERE id = ?
    `).run(sent, failed, 'completed', sessionId)

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        sent,
        failed,
        remaining: remainingCount,
      },
      message: remainingCount > 0
        ? `تم إرسال ${sent}، فشل ${failed}. متبقي ${remainingCount} للتذكير لاحقًا.`
        : `تم إرسال ${sent}، فشل ${failed}.`,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST — تأجيل طالب
// ============================================
router.post('/exclude', checkPermission('whatsapp.fees'), (req, res) => {
  try {
    const db = getDB()
    const { student_id, excluded_until, reason } = req.body

    if (!student_id || !excluded_until) {
      return res.status(400).json({ success: false, error: 'بيانات ناقصة' })
    }

    // احذف التأجيل القديم
    db.prepare('DELETE FROM fee_reminder_exclusions WHERE student_id = ?').run(student_id)

    db.prepare(`
      INSERT INTO fee_reminder_exclusions (student_id, excluded_until, reason, excluded_by)
      VALUES (?, ?, ?, ?)
    `).run(student_id, excluded_until, reason || null, req.user.id)

    res.json({ success: true, message: 'تم التأجيل' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE — إلغاء التأجيل
// ============================================
router.delete('/exclude/:studentId', checkPermission('whatsapp.fees'), (req, res) => {
  try {
    const db = getDB()
    db.prepare('DELETE FROM fee_reminder_exclusions WHERE student_id = ?').run(req.params.studentId)
    res.json({ success: true, message: 'تم إلغاء التأجيل' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET — سجل الجلسات
// ============================================
router.get('/sessions', checkPermission('whatsapp.fees'), (req, res) => {
  try {
    const db = getDB()
    const rows = db.prepare(`
      SELECT s.*, u.full_name as started_by_name
      FROM fee_reminder_sessions s
      LEFT JOIN users u ON u.id = s.started_by
      ORDER BY s.started_at DESC
      LIMIT 50
    `).all()
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET — تفاصيل جلسة
// ============================================
router.get('/sessions/:id', checkPermission('whatsapp.fees'), (req, res) => {
  try {
    const db = getDB()
    const session = db.prepare('SELECT * FROM fee_reminder_sessions WHERE id = ?').get(req.params.id)
    if (!session) return res.status(404).json({ success: false, error: 'غير موجود' })

    const logs = db.prepare(`
      SELECT l.*, s.full_name, s.grade, s.section
      FROM fee_reminder_log l
      JOIN students s ON s.id = l.student_id
      WHERE l.session_id = ?
      ORDER BY l.id
    `).all(req.params.id)

    res.json({ success: true, data: { session, logs } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
