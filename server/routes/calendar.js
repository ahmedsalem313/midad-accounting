import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()

// ============================================
// GET - أحداث عامة لولي الأمر (بدون مصادقة)
// ============================================
router.get('/public', (req, res) => {
  try {
    const db = getDB()
    const today = new Date().toISOString().split('T')[0]

    const events = db.prepare(`
      SELECT id, title, description, type, start_date, end_date, is_holiday, color
      FROM academic_events
      WHERE start_date >= ?
        AND visible_to_parents = 1
      ORDER BY start_date ASC
      LIMIT 20
    `).all(today)

    res.json({ success: true, data: events })
  } catch (error) {
    console.error('GET /calendar/public error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// باقي المسارات تحتاج مصادقة
router.use(authMiddleware)

// ============================================
// GET - كل الأحداث
// ============================================
router.get('/', checkPermission('calendar.view'), (req, res) => {
  try {
    const db = getDB()
    const { year, month, type, from_date, to_date, show_holidays } = req.query

    let sql = `
      SELECT 
        e.*,
        u.full_name as created_by_name
      FROM academic_events e
      LEFT JOIN users u ON u.id = e.created_by
      WHERE 1=1
    `
    const params = []

    if (year && month) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      sql += ' AND (e.start_date LIKE ? OR e.end_date LIKE ?)'
      params.push(`${monthStr}%`, `${monthStr}%`)
    }

    if (from_date) { sql += ' AND e.start_date >= ?'; params.push(from_date) }
    if (to_date) { sql += ' AND e.start_date <= ?'; params.push(to_date) }
    if (type) { sql += ' AND e.type = ?'; params.push(type) }
    if (show_holidays === 'false') { sql += ' AND e.is_holiday = 0' }

    sql += ' ORDER BY e.start_date ASC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GET /calendar error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - الأحداث القادمة
// ============================================
router.get('/upcoming', checkPermission('calendar.view'), (req, res) => {
  try {
    const db = getDB()
    const today = new Date().toISOString().split('T')[0]
    const limit = parseInt(req.query.limit) || 5

    const events = db.prepare(`
      SELECT * FROM academic_events
      WHERE start_date >= ?
      ORDER BY start_date ASC
      LIMIT ?
    `).all(today, limit)

    res.json({ success: true, data: events })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - إحصائيات التقويم
// ============================================
router.get('/stats', checkPermission('calendar.view'), (req, res) => {
  try {
    const db = getDB()
    const year = req.query.year || new Date().getFullYear()

    const totalEvents = db.prepare(`
      SELECT COUNT(*) as c FROM academic_events
      WHERE start_date LIKE ?
    `).get(`${year}%`).c

    const holidays = db.prepare(`
      SELECT COUNT(*) as c FROM academic_events
      WHERE start_date LIKE ? AND is_holiday = 1
    `).get(`${year}%`).c

    const exams = db.prepare(`
      SELECT COUNT(*) as c FROM academic_events
      WHERE start_date LIKE ? AND type = 'exam'
    `).get(`${year}%`).c

    res.json({
      success: true,
      data: { totalEvents, holidays, exams },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إضافة حدث
// ============================================
router.post('/', checkPermission('calendar.create'), (req, res) => {
  try {
    const {
      title, description, type, start_date, end_date,
      is_holiday, color, applies_to, grade, visible_to_parents,
    } = req.body

    if (!title || !start_date) {
      return res.status(400).json({ success: false, error: 'العنوان والتاريخ مطلوبان' })
    }

    const db = getDB()
    const result = db.prepare(`
      INSERT INTO academic_events (
        title, description, type, start_date, end_date,
        is_holiday, color, applies_to, grade, visible_to_parents, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || null,
      type || 'event',
      start_date,
      end_date || null,
      is_holiday ? 1 : 0,
      color || '#6366F1',
      applies_to || 'all',
      grade || null,
      visible_to_parents !== false ? 1 : 0,
      req.user.id
    )

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: 'تم إضافة الحدث',
    })
  } catch (error) {
    console.error('POST /calendar error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT - تعديل حدث
// ============================================
router.put('/:id', checkPermission('calendar.edit'), (req, res) => {
  try {
    const db = getDB()
    const event = db.prepare('SELECT * FROM academic_events WHERE id = ?').get(req.params.id)

    if (!event) {
      return res.status(404).json({ success: false, error: 'الحدث غير موجود' })
    }

    const fields = ['title', 'description', 'type', 'start_date', 'end_date', 'is_holiday', 'color', 'applies_to', 'grade', 'visible_to_parents']
    const updates = []
    const values = []

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`)
        if (f === 'is_holiday' || f === 'visible_to_parents') {
          values.push(req.body[f] ? 1 : 0)
        } else {
          values.push(req.body[f])
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)

    db.prepare(`UPDATE academic_events SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - حذف حدث
// ============================================
router.delete('/:id', checkPermission('calendar.delete'), (req, res) => {
  try {
    const db = getDB()
    const result = db.prepare('DELETE FROM academic_events WHERE id = ?').run(req.params.id)

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'الحدث غير موجود' })
    }

    res.json({ success: true, message: 'تم الحذف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router