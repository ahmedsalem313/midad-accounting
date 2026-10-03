import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET - كل الأحداث
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