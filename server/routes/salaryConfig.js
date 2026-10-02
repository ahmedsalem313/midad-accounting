import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET - كل الإعدادات
router.get('/', checkPermission('payroll.view'), (req, res) => {
  const db = getDB()
  const configs = db.prepare(`
    SELECT ts.*, u.full_name as teacher_name, u.role
    FROM teacher_salaries ts
    JOIN users u ON u.id = ts.teacher_id
    ORDER BY u.full_name
  `).all()

  res.json({ success: true, data: configs })
})

// GET - إعدادات معلم واحد
router.get('/teacher/:id', checkPermission('payroll.view'), (req, res) => {
  const db = getDB()
  const config = db.prepare('SELECT * FROM teacher_salaries WHERE teacher_id = ?').get(req.params.id)

  if (!config) {
    // إعداد افتراضي
    return res.json({
      success: true,
      data: {
        teacher_id: parseInt(req.params.id),
        salary_type: 'fixed',
        base_salary: 0,
        lesson_price: 0,
        hourly_rate: 0,
        commission_rate: 0,
        housing_allowance: 0,
        transport_allowance: 0,
        other_allowance: 0,
        absence_deduction_per_day: 0,
        late_deduction_per_minute: 0,
      },
    })
  }

  res.json({ success: true, data: config })
})

// POST - إنشاء/تحديث إعدادات
router.post('/', checkPermission('payroll.calculate'), (req, res) => {
  try {
    const {
      teacher_id, salary_type,
      base_salary, lesson_price, hourly_rate, commission_rate,
      housing_allowance, transport_allowance, other_allowance,
      absence_deduction_per_day, late_deduction_per_minute,
      effective_from, notes,
    } = req.body

    if (!teacher_id || !salary_type) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال البيانات المطلوبة' })
    }

    const db = getDB()

    const existing = db.prepare('SELECT id FROM teacher_salaries WHERE teacher_id = ?').get(teacher_id)

    if (existing) {
      db.prepare(`
        UPDATE teacher_salaries
        SET salary_type = ?, base_salary = ?, lesson_price = ?, hourly_rate = ?, commission_rate = ?,
            housing_allowance = ?, transport_allowance = ?, other_allowance = ?,
            absence_deduction_per_day = ?, late_deduction_per_minute = ?,
            effective_from = ?, notes = ?
        WHERE teacher_id = ?
      `).run(
        salary_type, base_salary || 0, lesson_price || 0, hourly_rate || 0, commission_rate || 0,
        housing_allowance || 0, transport_allowance || 0, other_allowance || 0,
        absence_deduction_per_day || 0, late_deduction_per_minute || 0,
        effective_from || new Date().toISOString().split('T')[0], notes || null,
        teacher_id
      )

      return res.json({ success: true, message: 'تم التحديث' })
    }

    const result = db.prepare(`
      INSERT INTO teacher_salaries (
        teacher_id, salary_type, base_salary, lesson_price, hourly_rate, commission_rate,
        housing_allowance, transport_allowance, other_allowance,
        absence_deduction_per_day, late_deduction_per_minute,
        effective_from, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      teacher_id, salary_type, base_salary || 0, lesson_price || 0, hourly_rate || 0, commission_rate || 0,
      housing_allowance || 0, transport_allowance || 0, other_allowance || 0,
      absence_deduction_per_day || 0, late_deduction_per_minute || 0,
      effective_from || new Date().toISOString().split('T')[0], notes || null
    )

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid }, message: 'تم الحفظ' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// DELETE
router.delete('/:id', checkPermission('payroll.calculate'), (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM teacher_salaries WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: 'تم الحذف' })
})

export default router