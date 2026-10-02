import express from 'express'
import { getDB } from '../database/db.js'
import { hashPassword } from '../utils/bcrypt.js'
import { authMiddleware, adminOnly } from '../middleware/auth.js'
import { checkPermission, getUserPermissions } from '../middleware/permissions.js'

const router = express.Router()

// كل المسارات تحتاج تسجيل دخول
router.use(authMiddleware)

// ============================================
// GET /api/users - كل المستخدمين
// ============================================
router.get('/', checkPermission('users.view'), (req, res) => {
  try {
    const db = getDB()
    const users = db.prepare(`
      SELECT id, username, full_name, email, phone, role, base_salary,
             is_active, is_advisor, advisor_grade, advisor_section,
             last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `).all()

    const usersWithPerms = users.map(u => ({
      ...u,
      permissions: u.role === 'admin' ? ['*'] : getUserPermissions(u.id),
    }))

    res.json({ success: true, data: usersWithPerms })
  } catch (error) {
    console.error('GET /users error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET /api/users/me/students - طلاب المرشد
// ============================================
router.get('/me/students', (req, res) => {
  try {
    const db = getDB()

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' })

    // المدير يرى كل الطلاب
    if (user.role === 'admin') {
      const students = db.prepare(`
        SELECT * FROM students WHERE status = 'active' ORDER BY grade, section, full_name
      `).all()
      return res.json({ success: true, data: students, isAdmin: true })
    }

    // المرشد يرى طلاب صفه فقط
    if (!user.is_advisor) {
      return res.json({ success: true, data: [], isAdvisor: false })
    }

    let students = []

    if (user.advisor_section) {
      // مع شعبة محددة
      students = db.prepare(`
        SELECT * FROM students 
        WHERE grade = ? AND section = ?
          AND status = 'active'
        ORDER BY full_name
      `).all(user.advisor_grade, user.advisor_section)
    } else {
      // كل شعب الصف
      students = db.prepare(`
        SELECT * FROM students 
        WHERE grade = ?
          AND status = 'active'
        ORDER BY section, full_name
      `).all(user.advisor_grade)
    }

    res.json({
      success: true,
      data: students,
      isAdvisor: true,
      advisorInfo: {
        grade: user.advisor_grade,
        section: user.advisor_section,
      },
    })
  } catch (error) {
    console.error('GET /me/students error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET /api/users/permissions/list - قائمة كل الصلاحيات
// ============================================
router.get('/permissions/list', checkPermission('users.view'), (req, res) => {
  try {
    const db = getDB()
    const perms = db.prepare('SELECT * FROM permissions ORDER BY category, code').all()
    res.json({ success: true, data: perms })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET /api/users/:id - مستخدم واحد
// ============================================
router.get('/:id', checkPermission('users.view'), (req, res) => {
  try {
    const db = getDB()
    const user = db.prepare(`
      SELECT id, username, full_name, email, phone, role, base_salary,
             is_active, is_advisor, advisor_grade, advisor_section,
             last_login, created_at
      FROM users WHERE id = ?
    `).get(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' })
    }

    user.permissions = user.role === 'admin' ? ['*'] : getUserPermissions(user.id)

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST /api/users - إضافة مستخدم
// ============================================
router.post('/', checkPermission('users.create'), async (req, res) => {
  try {
    const { username, password, full_name, email, phone, role, base_salary, permissions } = req.body

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال الحقول المطلوبة',
      })
    }

    const db = getDB()

    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'اسم المستخدم موجود مسبقاً',
      })
    }

    const hashed = await hashPassword(password)

    const result = db.prepare(`
      INSERT INTO users (username, password, full_name, email, phone, role, base_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashed, full_name, email || null, phone || null, role, base_salary || 0)

    if (permissions && Array.isArray(permissions) && role !== 'admin') {
      const insert = db.prepare(`
        INSERT INTO user_permissions (user_id, permission_code, granted_by)
        VALUES (?, ?, ?)
      `)
      const tx = db.transaction((perms) => {
        for (const p of perms) insert.run(result.lastInsertRowid, p, req.user.id)
      })
      tx(permissions)
    }

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: 'تم إضافة المستخدم بنجاح',
    })
  } catch (error) {
    console.error('POST /users error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT /api/users/:id - تعديل مستخدم
// ============================================
router.put('/:id', checkPermission('users.edit'), async (req, res) => {
  try {
    const { full_name, email, phone, role, base_salary, is_active, password } = req.body
    const userId = req.params.id
    const db = getDB()

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' })
    }

    const updates = []
    const values = []

    if (full_name !== undefined) { updates.push('full_name = ?'); values.push(full_name) }
    if (email !== undefined) { updates.push('email = ?'); values.push(email) }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone) }
    if (role !== undefined) { updates.push('role = ?'); values.push(role) }
    if (base_salary !== undefined) { updates.push('base_salary = ?'); values.push(base_salary) }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0) }

    if (password) {
      const hashed = await hashPassword(password)
      updates.push('password = ?')
      values.push(hashed)
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId)

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    res.json({ success: true, message: 'تم التحديث بنجاح' })
  } catch (error) {
    console.error('PUT /users error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT /api/users/:id/advisor - تعيين المرشد
// ============================================
router.put('/:id/advisor', checkPermission('users.edit'), (req, res) => {
  try {
    const { grade, section, is_advisor } = req.body
    const db = getDB()

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' })

    if (user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(400).json({ success: false, error: 'فقط المعلمون يمكن أن يكونوا مرشدين' })
    }

    db.prepare(`
      UPDATE users 
      SET is_advisor = ?, advisor_grade = ?, advisor_section = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      is_advisor ? 1 : 0,
      is_advisor ? (grade || null) : null,
      is_advisor ? (section || null) : null,
      req.params.id
    )

    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    console.error('PUT /users/:id/advisor error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT /api/users/:id/permissions - تعديل الصلاحيات
// ============================================
router.put('/:id/permissions', checkPermission('users.permissions'), (req, res) => {
  try {
    const userId = req.params.id
    const { permissions } = req.body

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'الصيغة غير صحيحة' })
    }

    const db = getDB()
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId)

    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' })
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: 'لا يمكن تعديل صلاحيات المدير' })
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId)
      const insert = db.prepare(`
        INSERT INTO user_permissions (user_id, permission_code, granted_by)
        VALUES (?, ?, ?)
      `)
      for (const p of permissions) insert.run(userId, p, req.user.id)
    })
    tx()

    res.json({ success: true, message: 'تم تحديث الصلاحيات' })
  } catch (error) {
    console.error('PUT /users/:id/permissions error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE /api/users/:id
// ============================================
router.delete('/:id', checkPermission('users.delete'), (req, res) => {
  try {
    const userId = req.params.id
    const db = getDB()

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ success: false, error: 'لا يمكنك حذف حسابك' })
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId)
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' })
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف المدير' })
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId)

    res.json({ success: true, message: 'تم الحذف بنجاح' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router