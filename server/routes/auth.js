import express from 'express'
import { getDB } from '../database/db.js'
import { generateToken } from '../utils/jwt.js'
import { comparePassword, hashPassword } from '../utils/bcrypt.js'
import { authMiddleware } from '../middleware/auth.js'
import { getUserPermissions } from '../middleware/permissions.js'

const router = express.Router()

// ============================================
// POST /api/auth/login - تسجيل الدخول
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال اسم المستخدم وكلمة المرور',
      })
    }

    const db = getDB()
    const user = db.prepare(`
      SELECT * FROM users WHERE username = ?
    `).get(username)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      })
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'الحساب موقوف. تواصل مع المدير',
      })
    }

    const isValid = await comparePassword(password, user.password)
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      })
    }

    // تحديث آخر دخول
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id)

    // تسجيل النشاط
    db.prepare(`
      INSERT INTO activity_log (user_id, action, ip_address)
      VALUES (?, 'login', ?)
    `).run(user.id, req.ip)

    // إنشاء التوكن
    const token = generateToken({ id: user.id, username: user.username, role: user.role })

    // جلب الصلاحيات
    const permissions = user.role === 'admin' ? ['*'] : getUserPermissions(user.id)

    res.json({
  success: true,
  data: {
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_advisor: user.is_advisor,
      advisor_grade: user.advisor_grade,
      advisor_section: user.advisor_section,
    },
    permissions,
  },
})
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'حدث خطأ في السيرفر' })
  }
})

// ============================================
// GET /api/auth/me - بيانات المستخدم الحالي
// ============================================
router.get('/me', authMiddleware, (req, res) => {
  const db = getDB()
  const user = db.prepare(`
    SELECT id, username, full_name, email, phone, role, base_salary, last_login,
           is_advisor, advisor_grade, advisor_section
    FROM users WHERE id = ?
  `).get(req.user.id)
  const permissions = user.role === 'admin' ? ['*'] : getUserPermissions(user.id)

  res.json({
    success: true,
    data: { user, permissions },
  })
})

// ============================================
// POST /api/auth/change-password - تغيير كلمة المرور
// ============================================
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال كلمة المرور الحالية والجديدة',
      })
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      })
    }

    const db = getDB()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)

    const isValid = await comparePassword(current_password, user.password)
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'كلمة المرور الحالية غير صحيحة',
      })
    }

    const hashed = await hashPassword(new_password)
    db.prepare(`
      UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(hashed, user.id)

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// ============================================
// POST /api/auth/logout - تسجيل خروج
// ============================================
router.post('/logout', authMiddleware, (req, res) => {
  const db = getDB()
  db.prepare(`
    INSERT INTO activity_log (user_id, action, ip_address)
    VALUES (?, 'logout', ?)
  `).run(req.user.id, req.ip)

  res.json({ success: true, message: 'تم تسجيل الخروج' })
})

export default router