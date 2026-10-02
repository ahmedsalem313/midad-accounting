import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET - كل السلف
router.get('/', checkPermission('advances.view'), (req, res) => {
  const db = getDB()
  const { teacher_id, status, year, month } = req.query

  let sql = `
    SELECT a.*, u.full_name as teacher_name,
           ap.full_name as approved_by_name
    FROM advances a
    JOIN users u ON u.id = a.teacher_id
    LEFT JOIN users ap ON ap.id = a.approved_by
    WHERE 1=1
  `
  const params = []

  if (teacher_id) { sql += ' AND a.teacher_id = ?'; params.push(teacher_id) }
  if (status) { sql += ' AND a.status = ?'; params.push(status) }
  if (year) { sql += ' AND a.deduction_year = ?'; params.push(year) }
  if (month) { sql += ' AND a.deduction_month = ?'; params.push(month) }

  // المعلم يرى سلفه فقط
  if (req.user.role === 'teacher') {
    sql += ' AND a.teacher_id = ?'
    params.push(req.user.id)
  }

  sql += ' ORDER BY a.request_date DESC'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// GET - سلفة واحدة
router.get('/:id', checkPermission('advances.view'), (req, res) => {
  const db = getDB()
  const row = db.prepare(`
    SELECT a.*, u.full_name as teacher_name
    FROM advances a JOIN users u ON u.id = a.teacher_id
    WHERE a.id = ?
  `).get(req.params.id)

  if (!row) return res.status(404).json({ success: false, error: 'غير موجود' })
  if (req.user.role === 'teacher' && row.teacher_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'غير مصرح' })
  }
  res.json({ success: true, data: row })
})

// POST - طلب سلفة
router.post('/', checkPermission('advances.request'), (req, res) => {
  try {
    const { teacher_id, amount, reason, request_date, deduction_month, deduction_year } = req.body

    // المعلم يطلب لنفسه فقط
    const targetId = req.user.role === 'teacher' ? req.user.id : (teacher_id || req.user.id)

    if (!amount || !deduction_month || !deduction_year) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال المبلغ والشهر والسنة' })
    }

    const db = getDB()
    const result = db.prepare(`
      INSERT INTO advances (
        teacher_id, amount, reason, request_date,
        deduction_month, deduction_year, status, requested_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      targetId, amount, reason || null,
      request_date || new Date().toISOString().split('T')[0],
      deduction_month, deduction_year, req.user.id
    )

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid }, message: 'تم إنشاء الطلب' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// POST - الموافقة على سلفة
router.post('/:id/approve', checkPermission('advances.approve'), (req, res) => {
  const db = getDB()
  db.prepare(`
    UPDATE advances
    SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user.id, req.params.id)
  res.json({ success: true, message: 'تمت الموافقة' })
})

// POST - رفض
router.post('/:id/reject', checkPermission('advances.approve'), (req, res) => {
  const db = getDB()
  db.prepare(`
    UPDATE advances
    SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user.id, req.params.id)
  res.json({ success: true, message: 'تم الرفض' })
})

// DELETE
router.delete('/:id', checkPermission('advances.approve'), (req, res) => {
  const db = getDB()
  const adv = db.prepare('SELECT status FROM advances WHERE id = ?').get(req.params.id)
  if (!adv) return res.status(404).json({ success: false, error: 'غير موجود' })
  if (adv.status === 'deducted') return res.status(400).json({ success: false, error: 'تم خصمها بالفعل' })

  db.prepare('DELETE FROM advances WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: 'تم الحذف' })
})

export default router