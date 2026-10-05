// server/routes/studentHistory.js
import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET — السجل الأكاديمي لطالب (خط زمني شامل)
// ============================================
router.get('/student/:studentId', checkPermission('students.view'), (req, res) => {
  try {
    const db = getDB()
    const studentId = parseInt(req.params.studentId)

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
    if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود' })

    // 1) سجل السنوات الدراسية
    const history = db.prepare(`
      SELECT * FROM student_history
      WHERE student_id = ?
      ORDER BY academic_year DESC
    `).all(studentId)

    // 2) كل الدرجات مجمّعة حسب السنة
    const grades = db.prepare(`
      SELECT academic_year, subject, exam_type, score, max_score, exam_date
      FROM grades
      WHERE student_id = ?
      ORDER BY academic_year DESC, exam_date DESC
    `).all(studentId)

    const gradesByYear = {}
    for (const g of grades) {
      const year = g.academic_year || 'غير محدد'
      if (!gradesByYear[year]) gradesByYear[year] = []
      gradesByYear[year].push(g)
    }

    // 3) المدفوعات
    const payments = db.prepare(`
      SELECT id, amount, paid_amount, payment_date, method, receipt_number, notes
      FROM payments
      WHERE student_id = ?
      ORDER BY payment_date DESC
    `).all(studentId)

    const paymentsByYear = {}
    for (const p of payments) {
      const year = p.payment_date ? p.payment_date.substring(0, 4) : 'غير محدد'
      if (!paymentsByYear[year]) paymentsByYear[year] = []
      paymentsByYear[year].push(p)
    }

    // 4) ترحيلات
    const promotions = db.prepare(`
      SELECT * FROM promotions
      WHERE student_id = ?
      ORDER BY academic_year DESC
    `).all(studentId)

    // 5) حالة الطالب الحالية
    const currentYear = new Date().getFullYear()
    const academicYear = `${currentYear}-${currentYear + 1}`

    res.json({
      success: true,
      data: {
        student,
        history,
        gradesByYear,
        paymentsByYear,
        promotions,
        currentAcademicYear: academicYear,
      },
    })
  } catch (error) {
    console.error('student history error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST — إضافة سنة دراسية لطالب (يدوي)
// ============================================
router.post('/', checkPermission('students.edit'), (req, res) => {
  try {
    const db = getDB()
    const {
      student_id, academic_year, grade, section, status,
      enrolled_at, left_at, left_reason, returned_at,
      final_average, result, notes,
    } = req.body

    if (!student_id || !academic_year || !grade) {
      return res.status(400).json({ success: false, error: 'بيانات ناقصة' })
    }

    const r = db.prepare(`
      INSERT INTO student_history
      (student_id, academic_year, grade, section, status, enrolled_at,
       left_at, left_reason, returned_at, final_average, result, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_id, academic_year, grade, section || null, status || 'enrolled',
      enrolled_at || null, left_at || null, left_reason || null,
      returned_at || null, final_average || null, result || null, notes || null
    )

    res.status(201).json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT — تعديل سنة دراسية
// ============================================
router.put('/:id', checkPermission('students.edit'), (req, res) => {
  try {
    const db = getDB()
    const {
      status, left_at, left_reason, returned_at,
      final_average, result, notes,
    } = req.body

    db.prepare(`
      UPDATE student_history SET
        status = COALESCE(?, status),
        left_at = COALESCE(?, left_at),
        left_reason = COALESCE(?, left_reason),
        returned_at = COALESCE(?, returned_at),
        final_average = COALESCE(?, final_average),
        result = COALESCE(?, result),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      status, left_at, left_reason, returned_at,
      final_average, result, notes, req.params.id
    )

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE — حذف سنة دراسية
// ============================================
router.delete('/:id', checkPermission('students.edit'), (req, res) => {
  try {
    const db = getDB()
    db.prepare('DELETE FROM student_history WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET — كل الطلاب (لصفحة عامة)
// ============================================
router.get('/', checkPermission('students.view'), (req, res) => {
  try {
    const db = getDB()
    const { academic_year } = req.query

    let sql = `
      SELECT sh.*, s.full_name, s.student_number, s.guardian_name, s.guardian_phone
      FROM student_history sh
      JOIN students s ON s.id = sh.student_id
      WHERE 1=1
    `
    const params = []
    if (academic_year) {
      sql += ' AND sh.academic_year = ?'
      params.push(academic_year)
    }
    sql += ' ORDER BY sh.academic_year DESC, s.full_name'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router