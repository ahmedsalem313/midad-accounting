import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET - كل المصاريف
router.get('/', checkPermission('expenses.view'), (req, res) => {
  const db = getDB()
  const { category, from_date, to_date } = req.query

  let sql = `
    SELECT e.*, u.full_name as recorded_by_name
    FROM expenses e
    LEFT JOIN users u ON u.id = e.recorded_by
    WHERE 1=1
  `
  const params = []

  if (category) { sql += ' AND e.category = ?'; params.push(category) }
  if (from_date) { sql += ' AND e.expense_date >= ?'; params.push(from_date) }
  if (to_date) { sql += ' AND e.expense_date <= ?'; params.push(to_date) }

  sql += ' ORDER BY e.expense_date DESC, e.id DESC'

  const expenses = db.prepare(sql).all(...params)
  res.json({ success: true, data: expenses })
})

// GET - مصروف واحد
router.get('/:id', checkPermission('expenses.view'), (req, res) => {
  const db = getDB()
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!expense) return res.status(404).json({ success: false, error: 'غير موجود' })
  res.json({ success: true, data: expense })
})

// POST - إضافة مصروف
router.post('/', checkPermission('expenses.create'), (req, res) => {
  try {
    const { category, description, amount, expense_date, payment_method, receipt_number, notes } = req.body

    if (!category || !amount || !expense_date) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال الحقول المطلوبة' })
    }

    const db = getDB()
    const result = db.prepare(`
      INSERT INTO expenses (
        category, description, amount, expense_date,
        payment_method, receipt_number, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category, description || null, amount, expense_date,
      payment_method || 'cash', receipt_number || null, notes || null, req.user.id
    )

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: 'تم إضافة المصروف',
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// PUT - تعديل
router.put('/:id', checkPermission('expenses.edit'), (req, res) => {
  const db = getDB()
  const fields = ['category', 'description', 'amount', 'expense_date', 'payment_method', 'receipt_number', 'notes']
  const updates = []
  const values = []

  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]) }
  }

  if (updates.length === 0) return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
  values.push(req.params.id)

  db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ success: true, message: 'تم التحديث' })
})

// DELETE
router.delete('/:id', checkPermission('expenses.delete'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'غير موجود' })
  res.json({ success: true, message: 'تم الحذف' })
})

// GET - تصنيفات المصاريف
router.get('/meta/categories', checkPermission('expenses.view'), (req, res) => {
  const categories = [
    { value: 'salaries',       label_ar: 'رواتب',       label_en: 'Salaries' },
    { value: 'rent',           label_ar: 'إيجار',       label_en: 'Rent' },
    { value: 'electricity',    label_ar: 'كهرباء',      label_en: 'Electricity' },
    { value: 'water',          label_ar: 'ماء',         label_en: 'Water' },
    { value: 'internet',       label_ar: 'إنترنت',      label_en: 'Internet' },
    { value: 'stationery',     label_ar: 'قرطاسية',     label_en: 'Stationery' },
    { value: 'maintenance',    label_ar: 'صيانة',       label_en: 'Maintenance' },
    { value: 'cleaning',       label_ar: 'نظافة',       label_en: 'Cleaning' },
    { value: 'transport',      label_ar: 'نقل',         label_en: 'Transport' },
    { value: 'food',           label_ar: 'طعام',        label_en: 'Food' },
    { value: 'other',          label_ar: 'أخرى',        label_en: 'Other' },
  ]
  res.json({ success: true, data: categories })
})

// GET - ملخص شهري
router.get('/stats/monthly', checkPermission('expenses.view'), (req, res) => {
  const db = getDB()
  const { year, month } = req.query

  const y = parseInt(year) || new Date().getFullYear()
  const m = parseInt(month) || new Date().getMonth() + 1

  const startDate = `${y}-${String(m).padStart(2, '0')}-01`
  const endDate = `${y}-${String(m).padStart(2, '0')}-31`

  const stats = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
    GROUP BY category
    ORDER BY total DESC
  `).all(startDate, endDate)

  const grandTotal = stats.reduce((sum, s) => sum + s.total, 0)

  res.json({ success: true, data: { stats, grandTotal, year: y, month: m } })
})

export default router