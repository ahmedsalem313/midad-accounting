// server/routes/branding.js
import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// مسار مجلد المدرسة
const SCHOOL_UPLOADS = path.join(__dirname, '..', 'uploads', 'school')
if (!fs.existsSync(SCHOOL_UPLOADS)) {
  fs.mkdirSync(SCHOOL_UPLOADS, { recursive: true })
}

// إعداد multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SCHOOL_UPLOADS),
  filename: (req, file, cb) => {
    const type = req.params.type || 'logo'
    const ext = path.extname(file.originalname).toLowerCase() || '.png'
    cb(null, `${type}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('نوع الملف غير مدعوم. استخدم PNG/JPG/SVG.'))
    }
  },
})

// ============================================
// GET — جلب الهوية الحالية
// ============================================
router.get('/', (req, res) => {
  try {
    const db = getDB()
    const rows = db.prepare(`
      SELECT key, value FROM settings
      WHERE key IN (
        'school_logo', 'school_signature', 'school_stamp',
        'brand_primary_color', 'brand_secondary_color',
        'invoice_template', 'school_motto'
      )
    `).all()

    const data = {}
    for (const r of rows) data[r.key] = r.value

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST — رفع ملف (شعار/توقيع/ختم)
// ============================================
router.post(
  '/upload/:type',
  authMiddleware,
  checkPermission('settings.edit'),
  upload.single('file'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'لم يُرفع أي ملف' })
      }

      const type = req.params.type
      const validTypes = ['logo', 'signature', 'stamp']
      if (!validTypes.includes(type)) {
        // احذف الملف
        fs.unlinkSync(req.file.path)
        return res.status(400).json({ success: false, error: 'نوع غير صالح' })
      }

      const settingKey =
        type === 'logo' ? 'school_logo'
        : type === 'signature' ? 'school_signature'
        : 'school_stamp'

      const publicUrl = `/uploads/school/${req.file.filename}`

      const db = getDB()
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(settingKey, publicUrl)

      res.json({
        success: true,
        data: { url: publicUrl, type },
        message: 'تم الرفع بنجاح',
      })
    } catch (error) {
      console.error('Upload error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
)

// ============================================
// DELETE — حذف ملف
// ============================================
router.delete('/:type', authMiddleware, checkPermission('settings.edit'), (req, res) => {
  try {
    const { type } = req.params
    const settingKey =
      type === 'logo' ? 'school_logo'
      : type === 'signature' ? 'school_signature'
      : type === 'stamp' ? 'school_stamp'
      : null

    if (!settingKey) {
      return res.status(400).json({ success: false, error: 'نوع غير صالح' })
    }

    const db = getDB()
    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(settingKey)

    if (existing?.value) {
      const filePath = path.join(__dirname, '..', existing.value.replace(/^\//, ''))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    db.prepare('DELETE FROM settings WHERE key = ?').run(settingKey)

    res.json({ success: true, message: 'تم الحذف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT — حفظ الألوان والقوالب
// ============================================
router.put('/', authMiddleware, checkPermission('settings.edit'), (req, res) => {
  try {
    const db = getDB()
    const { brand_primary_color, brand_secondary_color, invoice_template, school_motto } = req.body

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)

    const tx = db.transaction(() => {
      if (brand_primary_color) upsert.run('brand_primary_color', brand_primary_color)
      if (brand_secondary_color) upsert.run('brand_secondary_color', brand_secondary_color)
      if (invoice_template) upsert.run('invoice_template', invoice_template)
      if (school_motto !== undefined) upsert.run('school_motto', school_motto)
    })
    tx()

    res.json({ success: true, message: 'تم الحفظ' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router