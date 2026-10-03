// server/routes/timetableSettings.js
import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/', checkPermission('timetable.view'), (req, res) => {
  const db = getDB()
  let settings = db.prepare(`SELECT * FROM timetable_settings WHERE is_active = 1 ORDER BY id DESC LIMIT 1`).get()

  if (!settings) {
    const defaultDays = JSON.stringify([0, 1, 2, 3, 4, 5])
    const defaultBreaks = JSON.stringify([{ after_period: 3, minutes: 20 }])
    const result = db.prepare(`
      INSERT INTO timetable_settings (academic_year, working_days, periods_per_day, period_duration, day_start_time, breaks)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('2025-2026', defaultDays, 6, 45, '08:00', defaultBreaks)
    settings = db.prepare('SELECT * FROM timetable_settings WHERE id = ?').get(result.lastInsertRowid)
  }

  settings.working_days = JSON.parse(settings.working_days || '[]')
  settings.breaks = JSON.parse(settings.breaks || '[]')
  res.json({ success: true, data: settings })
})

router.put('/', checkPermission('timetable.edit'), (req, res) => {
  try {
    const db = getDB()
    const { academic_year, working_days, periods_per_day, period_duration, day_start_time, breaks } = req.body

    if (!Array.isArray(working_days) || working_days.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار يوم عمل واحد على الأقل' })
    }
    if (!periods_per_day || periods_per_day < 1 || periods_per_day > 12) {
      return res.status(400).json({ success: false, error: 'عدد الحصص يجب أن يكون بين 1 و 12' })
    }

    const current = db.prepare(`SELECT id FROM timetable_settings WHERE is_active = 1 ORDER BY id DESC LIMIT 1`).get()
    if (!current) {
      return res.status(404).json({ success: false, error: 'لا توجد إعدادات' })
    }

    db.prepare(`
      UPDATE timetable_settings SET
        academic_year = ?,
        working_days = ?,
        periods_per_day = ?,
        period_duration = ?,
        day_start_time = ?,
        breaks = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      academic_year,
      JSON.stringify(working_days),
      periods_per_day,
      period_duration,
      day_start_time,
      JSON.stringify(breaks || []),
      current.id
    )

    const updated = db.prepare('SELECT * FROM timetable_settings WHERE id = ?').get(current.id)
    updated.working_days = JSON.parse(updated.working_days || '[]')
    updated.breaks = JSON.parse(updated.breaks || '[]')
    res.json({ success: true, data: updated, message: 'تم حفظ الإعدادات' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

router.post('/reset', checkPermission('timetable.edit'), (req, res) => {
  const db = getDB()
  db.prepare('UPDATE timetable_settings SET is_active = 0').run()
  const result = db.prepare(`
    INSERT INTO timetable_settings (academic_year, working_days, periods_per_day, period_duration, day_start_time, breaks)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    '2025-2026',
    JSON.stringify([0, 1, 2, 3, 4, 5]),
    6,
    45,
    '08:00',
    JSON.stringify([{ after_period: 3, minutes: 20 }])
  )
  const created = db.prepare('SELECT * FROM timetable_settings WHERE id = ?').get(result.lastInsertRowid)
  created.working_days = JSON.parse(created.working_days || '[]')
  created.breaks = JSON.parse(created.breaks || '[]')
  res.json({ success: true, data: created, message: 'تمت إعادة التعيين' })
})

export default router