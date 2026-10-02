import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET - كل المدفوعات
router.get('/', checkPermission('payments.view'), (req, res) => {
  const db = getDB()
  const { student_id, from_date, to_date } = req.query

  let sql = `
    SELECT p.*, s.full_name as student_name, s.grade, s.section
    FROM payments p
    JOIN students s ON s.id = p.student_id
    WHERE 1=1
  `
  const params = []

  if (student_id) { sql += ' AND p.student_id = ?'; params.push(student_id) }
  if (from_date) { sql += ' AND p.payment_date >= ?'; params.push(from_date) }
  if (to_date) { sql += ' AND p.payment_date <= ?'; params.push(to_date) }

  sql += ' ORDER BY p.payment_date DESC, p.id DESC'

  const payments = db.prepare(sql).all(...params)
  res.json({ success: true, data: payments })
})

// GET - دفعة واحدة
router.get('/:id', checkPermission('payments.view'), (req, res) => {
  const db = getDB()
  const payment = db.prepare(`
    SELECT p.*, s.full_name as student_name, s.grade, s.section, s.guardian_name, s.guardian_phone
    FROM payments p JOIN students s ON s.id = p.student_id
    WHERE p.id = ?
  `).get(req.params.id)

  if (!payment) return res.status(404).json({ success: false, error: 'الدفعة غير موجودة' })
  res.json({ success: true, data: payment })
})

// POST - تسجيل دفعة
router.post('/', checkPermission('payments.create'), (req, res) => {
  try {
    const { student_id, amount, paid_amount, due_date, payment_date, method, notes } = req.body

    if (!student_id || !amount) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال الطالب والمبلغ' })
    }

    const db = getDB()

    // توليد رقم إيصال
    const lastReceipt = db.prepare('SELECT receipt_number FROM payments ORDER BY id DESC LIMIT 1').get()
    let receiptNum = 'R-000001'
    if (lastReceipt?.receipt_number) {
      const num = parseInt(lastReceipt.receipt_number.replace('R-', '')) + 1
      receiptNum = `R-${String(num).padStart(6, '0')}`
    }

    const result = db.prepare(`
      INSERT INTO payments (
        student_id, amount, paid_amount, due_date, payment_date,
        method, receipt_number, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_id, amount, paid_amount || 0, due_date || null,
      payment_date || new Date().toISOString().split('T')[0],
      method || 'cash', receiptNum, notes || null, req.user.id
    )

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid, receipt_number: receiptNum },
      message: 'تم تسجيل الدفعة بنجاح',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// PUT - تعديل دفعة
router.put('/:id', checkPermission('payments.edit'), (req, res) => {
  try {
    const db = getDB()
    const fields = ['amount', 'paid_amount', 'due_date', 'payment_date', 'method', 'notes']
    const updates = []
    const values = []

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`)
        values.push(req.body[f])
      }
    }

    if (updates.length === 0) return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    values.push(req.params.id)

    db.prepare(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// DELETE
router.delete('/:id', checkPermission('payments.delete'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'غير موجود' })
  res.json({ success: true, message: 'تم الحذف' })
})
// GET - إحصائيات طالب واحد
router.get('/student/:id/stats', checkPermission('payments.view'), (req, res) => {
  const db = getDB()
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
  if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود' })

  const result = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total_paid
    FROM payments WHERE student_id = ?
  `).get(req.params.id)

  const totalPaid = result.total_paid || 0
  const totalFees = student.total_fees || 0
  const remaining = Math.max(0, totalFees - totalPaid)

  res.json({
    success: true,
    data: {
      total_fees: totalFees,
      total_paid: totalPaid,
      remaining,
      payment_count: db.prepare('SELECT COUNT(*) as c FROM payments WHERE student_id = ?').get(req.params.id).c,
    },
  })
})
// ============================================
// GET - كل دفعات الطالب (للإيصال الشامل)
// ============================================
router.get('/student/:id/all', checkPermission('payments.view'), (req, res) => {
  const db = getDB()

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
  if (!student) {
    return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
  }

  const payments = db.prepare(`
    SELECT p.*, u.full_name as recorded_by_name
    FROM payments p
    LEFT JOIN users u ON u.id = p.recorded_by
    WHERE p.student_id = ?
    ORDER BY p.payment_date ASC, p.id ASC
  `).all(req.params.id)

  const totalFees = student.total_fees || 0
  const totalPaid = payments.reduce((s, p) => s + (p.paid_amount || 0), 0)
  const remaining = totalFees - totalPaid

  // اسم المدرسة
  const schoolRow = db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get()
  const schoolName = schoolRow?.value || 'مداد المحاسبي'

  res.json({
    success: true,
    data: {
      student,
      payments,
      summary: {
        totalFees,
        totalPaid,
        remaining,
        paymentCount: payments.length,
        collectionRate: totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0,
      },
      schoolName,
    },
  })
})
// GET - ملخص الطالب
router.get('/student/:id/summary', checkPermission('payments.view'), (req, res) => {
  const db = getDB()
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
  if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود' })

  const result = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(paid_amount), 0) as total_paid
    FROM payments WHERE student_id = ?
  `).get(req.params.id)

  const remaining = student.total_fees - result.total_paid

  res.json({
    success: true,
    data: {
      total_fees: student.total_fees,
      total_paid: result.total_paid,
      remaining,
      paid_percentage: student.total_fees > 0 ? Math.round((result.total_paid / student.total_fees) * 100) : 0,
    },
  })
})

export default router