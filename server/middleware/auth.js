import { verifyToken } from '../utils/jwt.js'
import { getDB } from '../database/db.js'

export function authMiddleware(req, res, next) {
  try {
    // جلب الـ token من الـ header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'لم يتم توفير رمز الدخول',
      })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'رمز الدخول غير صالح أو منتهي',
      })
    }

    // جلب بيانات المستخدم
    const db = getDB()
    const user = db.prepare(`
      SELECT id, username, full_name, email, phone, role, is_active
      FROM users WHERE id = ?
    `).get(decoded.id)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير موجود',
      })
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'الحساب موقوف',
      })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'فشل التحقق من الهوية',
    })
  }
}

// Middleware للأدمن فقط
export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'هذا الإجراء متاح للمدير فقط',
    })
  }
  next()
}