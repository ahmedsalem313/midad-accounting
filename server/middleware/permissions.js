import { getDB } from '../database/db.js'

// فحص صلاحية واحدة
export function checkPermission(permissionCode) {
  return (req, res, next) => {
    const user = req.user

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول أولاً',
      })
    }

    // المدير يمر دائماً
    if (user.role === 'admin') return next()

    const db = getDB()
    const has = db.prepare(`
      SELECT 1 FROM user_permissions
      WHERE user_id = ? AND permission_code = ?
    `).get(user.id, permissionCode)

    if (!has) {
      return res.status(403).json({
        success: false,
        error: `ليس لديك صلاحية: ${permissionCode}`,
      })
    }

    next()
  }
}

// فحص عدة صلاحيات (واحد على الأقل)
export function checkAnyPermission(...codes) {
  return (req, res, next) => {
    const user = req.user
    if (!user) return res.status(401).json({ success: false, error: 'غير مصرح' })
    if (user.role === 'admin') return next()

    const db = getDB()
    const placeholders = codes.map(() => '?').join(',')
    const rows = db.prepare(`
      SELECT permission_code FROM user_permissions
      WHERE user_id = ? AND permission_code IN (${placeholders})
    `).all(user.id, ...codes)

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك الصلاحية المطلوبة',
      })
    }

    next()
  }
}

// جلب صلاحيات المستخدم
export function getUserPermissions(userId) {
  const db = getDB()
  const rows = db.prepare(`
    SELECT permission_code FROM user_permissions
    WHERE user_id = ?
  `).all(userId)

  return rows.map(r => r.permission_code)
}