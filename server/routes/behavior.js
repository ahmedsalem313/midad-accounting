import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET - كل تقييمات طالب
// ============================================
router.get('/student/:id', checkPermission('grades.view'), (req, res) => {
  const db = getDB()

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
  if (!student) {
    return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
  }

  const evaluations = db.prepare(`
    SELECT b.*, u.full_name as evaluator_name
    FROM behavior_evaluations b
    LEFT JOIN users u ON u.id = b.evaluator_id
    WHERE b.student_id = ?
    ORDER BY b.evaluated_at DESC
  `).all(req.params.id)

  // إحصائيات
  const stats = {
    excellent: evaluations.filter(e => e.rating === 'excellent').length,
    good: evaluations.filter(e => e.rating === 'good').length,
    acceptable: evaluations.filter(e => e.rating === 'acceptable').length,
    poor: evaluations.filter(e => e.rating === 'poor').length,
    total: evaluations.length,
  }

  res.json({
    success: true,
    data: { student, evaluations, stats },
  })
})

// ============================================
// GET - آخر تقييم لكل طالب في صف
// ============================================
router.get('/class', checkPermission('grades.view'), (req, res) => {
  const db = getDB()
  const { grade, section } = req.query

  if (!grade) {
    return res.status(400).json({ success: false, error: 'الصف مطلوب' })
  }

  let sql = `
    SELECT
      s.id as student_id,
      s.full_name,
      s.grade,
      s.section,
      s.student_code,
      (SELECT rating FROM behavior_evaluations
       WHERE student_id = s.id
       ORDER BY evaluated_at DESC LIMIT 1) as latest_rating,
      (SELECT evaluated_at FROM behavior_evaluations
       WHERE student_id = s.id
       ORDER BY evaluated_at DESC LIMIT 1) as latest_date,
      (SELECT COUNT(*) FROM behavior_evaluations
       WHERE student_id = s.id) as evaluations_count
    FROM students s
    WHERE s.status = 'active'
  `
  const params = []

  sql += ' AND s.grade = ?'; params.push(grade)
  if (section) { sql += ' AND s.section = ?'; params.push(section) }

  sql += ' ORDER BY s.full_name'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// ============================================
// POST - إضافة تقييم جديد
// ============================================
router.post('/', checkPermission('grades.create'), (req, res) => {
  try {
    const { student_id, rating, note } = req.body

    if (!student_id || !rating) {
      return res.status(400).json({ success: false, error: 'البيانات ناقصة' })
    }

    const validRatings = ['excellent', 'good', 'acceptable', 'poor']
    if (!validRatings.includes(rating)) {
      return res.status(400).json({ success: false, error: 'تقييم غير صالح' })
    }

    const db = getDB()

    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(student_id)
    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    }

    const result = db.prepare(`
      INSERT INTO behavior_evaluations (
        student_id, rating, note, evaluator_id
      ) VALUES (?, ?, ?, ?)
    `).run(student_id, rating, note || null, req.user.id)

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: 'تم حفظ التقييم',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - حذف تقييم
// ============================================
router.delete('/:id', checkPermission('grades.delete'), (req, res) => {
  const db = getDB()
  const evaluation = db.prepare('SELECT * FROM behavior_evaluations WHERE id = ?').get(req.params.id)

  if (!evaluation) {
    return res.status(404).json({ success: false, error: 'التقييم غير موجود' })
  }

  // فقط المدير أو من أنشأ التقييم يحذفه
  if (req.user.role !== 'admin' && evaluation.evaluator_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'لا يمكنك حذف هذا التقييم' })
  }

  db.prepare('DELETE FROM behavior_evaluations WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: 'تم الحذف' })
})

export default router