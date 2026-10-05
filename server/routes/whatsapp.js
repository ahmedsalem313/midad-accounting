import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import {
  getStatus,
  sendMessage,
  sendPDF,
  logout as waLogout,
  isReady,
  reconnect,
} from '../services/whatsapp.js'
const router = express.Router()

// ============================================
// GET - حالة الاتصال (بدون مصادقة لأنها سريعة)
// ============================================
router.get('/status', (req, res) => {
  res.json({ success: true, data: getStatus() })
})

// ============================================
// كل المسارات الأخرى تحتاج تسجيل دخول
// ============================================
router.use(authMiddleware)

// ============================================
// POST - قطع الاتصال
// ============================================
// ============================================
// POST - إعادة الاتصال
// ============================================
router.post('/reconnect', async (req, res) => {
  try {
    const result = await reconnect()
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const result = await waLogout()
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إرسال رسالة فردية
// ============================================
router.post('/send', checkPermission('whatsapp.fees'), async (req, res) => {
  try {
    const { phone, message, recipient_type, recipient_id, template } = req.body

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال الرقم والرسالة' })
    }

    if (!isReady()) {
      return res.status(503).json({ success: false, error: 'WhatsApp غير متصل' })
    }

    const db = getDB()
    const result = db.prepare(`
      INSERT INTO messages (
        recipient_type, recipient_id, phone, message, template, status, sent_by
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      recipient_type || 'manual', recipient_id || null,
      phone, message, template || 'custom', req.user.id
    )

    try {
      await sendMessage(phone, message)
      db.prepare(`
        UPDATE messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(result.lastInsertRowid)

      res.json({ success: true, message: 'تم الإرسال' })
    } catch (sendError) {
      db.prepare(`
        UPDATE messages SET status = 'failed', error = ? WHERE id = ?
      `).run(sendError.message, result.lastInsertRowid)

      res.status(500).json({ success: false, error: sendError.message })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// ============================================
// GET - كل الرسائل
// ============================================
router.get('/messages', checkPermission('whatsapp.fees'), (req, res) => {
  const db = getDB()
  const { status, limit = 100 } = req.query

  let sql = 'SELECT * FROM messages WHERE 1=1'
  const params = []

  if (status) { sql += ' AND status = ?'; params.push(status) }
  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(parseInt(limit))

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// ============================================
// GET - القوالب
// ============================================
router.get('/templates', (req, res) => {
  const list = [
    { code: 'fee_reminder',     name_ar: 'تذكير بقسط متأخر',  name_en: 'Fee Reminder' },
    { code: 'payment_received', name_ar: 'تأكيد استلام دفعة', name_en: 'Payment Received' },
    { code: 'grades',           name_ar: 'إرسال النتائج',     name_en: 'Grades' },
    { code: 'custom',           name_ar: 'رسالة مخصصة',       name_en: 'Custom' },
  ]
  res.json({ success: true, data: list })
})

// ============================================
// POST - إرسال تذكير أقساط
// ============================================
router.post('/send-fee-reminders', checkPermission('whatsapp.fees'), async (req, res) => {
  try {
    const { min_remaining, grade } = req.body
    const db = getDB()

    if (!isReady()) {
      return res.status(503).json({ success: false, error: 'WhatsApp غير متصل' })
    }

    let sql = `
      SELECT s.id, s.full_name, s.guardian_name, s.guardian_phone,
             s.total_fees,
             COALESCE((SELECT SUM(paid_amount) FROM payments WHERE student_id = s.id), 0) as total_paid
      FROM students s
      WHERE s.status = 'active' AND s.guardian_phone IS NOT NULL AND s.guardian_phone != ''
    `
    const params = []
    if (grade) { sql += ' AND s.grade = ?'; params.push(grade) }

    const students = db.prepare(sql).all(...params)

    const minRem = parseFloat(min_remaining) || 1
    const targets = students
      .map(s => ({ ...s, remaining: s.total_fees - s.total_paid }))
      .filter(s => s.remaining >= minRem)

    if (targets.length === 0) {
      return res.json({ success: true, message: 'لا يوجد متأخرون', sent: 0, failed: 0 })
    }

    const insert = db.prepare(`
      INSERT INTO messages (
        recipient_type, recipient_id, phone, message, template, status, sent_by
      ) VALUES ('student', ?, ?, ?, 'fee_reminder', 'pending', ?)
    `)

    let sent = 0
    let failed = 0

    for (const t of targets) {
      const msg = `عزيزي ولي الأمر ${t.guardian_name}،

نود تذكيركم بأن القسط المتبقي للطالب ${t.full_name} هو ${t.remaining.toLocaleString('ar-IQ')} دينار.

يرجى تسوية المبلغ في أقرب وقت.

شكراً لتعاونكم.
مداد المحاسبي`

      const result = insert.run(t.id, t.guardian_phone, msg, req.user.id)

      try {
        await sendMessage(t.guardian_phone, msg)
        db.prepare(`UPDATE messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(result.lastInsertRowid)
        sent++
      } catch (e) {
        db.prepare(`UPDATE messages SET status = 'failed', error = ? WHERE id = ?`)
          .run(e.message, result.lastInsertRowid)
        failed++
      }

      await new Promise(r => setTimeout(r, 2000))
    }

    res.json({
      success: true,
      message: `تم إرسال ${sent}، فشل ${failed}`,
      sent, failed, total: targets.length,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إرسال كشف درجات
// ============================================
router.post('/send-grades/:studentId', checkPermission('whatsapp.grades'), async (req, res) => {
  try {
    const db = getDB()
    const { format = 'pdf' } = req.body

    if (!isReady()) {
      return res.status(503).json({ success: false, error: 'WhatsApp غير متصل' })
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.studentId)
    if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    if (!student.guardian_phone) {
      return res.status(400).json({ success: false, error: 'لا يوجد رقم لولي الأمر' })
    }

    const grades = db.prepare(`
      SELECT subject, exam_type, score, max_score FROM grades
      WHERE student_id = ? ORDER BY subject
    `).all(req.params.studentId)

    if (grades.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد درجات' })
    }

    // جلب اسم المدرسة
    const schoolSetting = db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get()
    const schoolName = schoolSetting?.value || 'مداد المحاسبي'

    // معالجة أسماء المواد (استبدال الأكواد بأسماء عربية)
    const subjectNames = {
      islamic: 'التربية الإسلامية',
      arabic: 'اللغة العربية',
      english: 'اللغة الإنجليزية',
      french: 'اللغة الفرنسية',
      math: 'الرياضيات',
      science: 'العلوم',
      chemistry: 'الكيمياء',
      physics: 'الفيزياء',
      biology: 'الأحياء',
      social: 'الاجتماعيات',
      computer: 'الحاسوب',
      art: 'التربية الفنية',
      pe: 'التربية الرياضية',
      sociology: 'علم الاجتماع',
      philosophy: 'الفلسفة',
      economics: 'الاقتصاد',
    }

    const gradesWithNames = grades.map(g => ({
      ...g,
      subject_name: subjectNames[g.subject] || g.subject,
    }))

    // توليد PDF
    const pdfBuffer = await generateGradeReport(student, gradesWithNames, {
      schoolName,
    })

    // إرسال PDF
    const filename = `درجات_${student.full_name.replace(/\s+/g, '_')}.pdf`
    const caption = `📊 كشف درجات ${student.full_name}\n${student.grade}\n\nمداد المحاسبي`

    try {
      await sendPDF(student.guardian_phone, pdfBuffer, filename, caption)

      // تسجيل الرسالة
      const db2 = getDB()
      db2.prepare(`
        INSERT INTO messages (
          recipient_type, recipient_id, phone, message, template, status, sent_at, sent_by
        ) VALUES ('student', ?, ?, ?, 'grades_pdf', 'sent', CURRENT_TIMESTAMP, ?)
      `).run(
        student.id,
        student.guardian_phone,
        `[PDF] كشف درجات - ${student.full_name}`,
        req.user.id
      )

      res.json({ success: true, message: 'تم إرسال كشف الدرجات PDF' })
    } catch (sendError) {
      console.error('Send error:', sendError)
      res.status(500).json({ success: false, error: sendError.message })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - رسالة جماعية
// ============================================
router.post('/send-bulk', checkPermission('whatsapp.bulk'), async (req, res) => {
  try {
    const { message, grade, section } = req.body

    if (!message) return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' })

    const db = getDB()

    if (!isReady()) {
      return res.status(503).json({ success: false, error: 'WhatsApp غير متصل' })
    }

    let sql = `
      SELECT id, full_name, guardian_name, guardian_phone FROM students
      WHERE status = 'active' AND guardian_phone IS NOT NULL AND guardian_phone != ''
    `
    const params = []
    if (grade) { sql += ' AND grade = ?'; params.push(grade) }
    if (section) { sql += ' AND section = ?'; params.push(section) }

    const students = db.prepare(sql).all(...params)

    if (students.length === 0) {
      return res.json({ success: true, message: 'لا يوجد مستلمون', sent: 0, failed: 0 })
    }

    const insert = db.prepare(`
      INSERT INTO messages (
        recipient_type, recipient_id, phone, message, template, status, sent_by
      ) VALUES ('student', ?, ?, ?, 'bulk', 'pending', ?)
    `)

    let sent = 0
    let failed = 0

    for (const s of students) {
      const personalized = message.replace(/{اسم_الطالب}/g, s.full_name)
                                 .replace(/{اسم_ولي_الأمر}/g, s.guardian_name)

      const result = insert.run(s.id, s.guardian_phone, personalized, req.user.id)

      try {
        await sendMessage(s.guardian_phone, personalized)
        db.prepare(`UPDATE messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(result.lastInsertRowid)
        sent++
      } catch (e) {
        db.prepare(`UPDATE messages SET status = 'failed', error = ? WHERE id = ?`)
          .run(e.message, result.lastInsertRowid)
        failed++
      }

      await new Promise(r => setTimeout(r, 2000))
    }

    res.json({ success: true, message: `تم إرسال ${sent}، فشل ${failed}`, sent, failed })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - إحصائيات
// ============================================
router.get('/stats', checkPermission('whatsapp.fees'), (req, res) => {
  const db = getDB()
  const stats = db.prepare(`
    SELECT status, COUNT(*) as count FROM messages GROUP BY status
  `).all()

  const result = { pending: 0, sent: 0, failed: 0 }
  for (const s of stats) result[s.status] = s.count

  res.json({ success: true, data: result })
})

// ============================================
// DELETE - حذف رسالة
// ============================================
router.delete('/messages/:id', checkPermission('whatsapp.bulk'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'غير موجود' })
  res.json({ success: true, message: 'تم الحذف' })
})

export default router