// server/routes/seed.js
import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { seedPrimarySchool } from '../database/seeds/seedPrimarySchool.js'

const router = express.Router()

// POST — تشغيل السكربت (للمدير فقط)
router.post('/primary-school', authMiddleware, async (req, res) => {
  try {
    // تحقق أن المستخدم مدير
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'للمدير فقط' })
    }

    if (!req.body.confirm) {
      return res.status(400).json({
        success: false,
        error: 'يجب تأكيد العملية. أرسل {"confirm": true}',
      })
    }

    const stats = await seedPrimarySchool()

    res.json({
      success: true,
      message: 'تم توليد البيانات بنجاح',
      data: stats,
    })
  } catch (error) {
    console.error('Seed error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router