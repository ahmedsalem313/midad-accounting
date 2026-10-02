import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()

// GET - كل الإعدادات (public للقراءة)
router.get('/', (req, res) => {
  const db = getDB()
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  res.json({ success: true, data: settings })
})

// PUT - تحديث الإعدادات (للمدير فقط)
router.put('/', authMiddleware, checkPermission('settings.edit'), (req, res) => {
  try {
    const db = getDB()
    const updates = req.body

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'بيانات غير صحيحة' })
    }

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `)

    const tx = db.transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        upsert.run(key, String(value))
      }
    })
    tx(updates)

    res.json({ success: true, message: 'تم حفظ الإعدادات' })
  } catch (error) {
    console.error('Settings error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router