import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET - كل المكافآت
// ============================================
router.get('/', checkPermission('rewards.view'), (req, res) => {
  try {
    const db = getDB()
    const { teacher_id, year, month, category, paid } = req.query

    let sql = `
      SELECT 
        r.*,
        u.full_name as teacher_name,
        u.role as teacher_role,
        g.full_name as granted_by_name,
        p.full_name as paid_by_name
      FROM teacher_rewards r
      JOIN users u ON u.id = r.teacher_id
      JOIN users g ON g.id = r.granted_by
      LEFT JOIN users p ON p.id = r.paid
      WHERE 1=1
    `
    const params = []

    // المعلم يرى فقط مكافآته
    if (req.user.role === 'teacher') {
      sql += ' AND r.teacher_id = ?'
      params.push(req.user.id)
    } else {
      if (teacher_id) { sql += ' AND r.teacher_id = ?'; params.push(teacher_id) }
    }

    if (year) { sql += ' AND r.reward_year = ?'; params.push(year) }
    if (month) { sql += ' AND r.reward_month = ?'; params.push(month) }
    if (category) { sql += ' AND r.category = ?'; params.push(category) }
    if (paid !== undefined) { sql += ' AND r.paid = ?'; params.push(paid === 'true' ? 1 : 0) }

    sql += ' ORDER BY r.reward_year DESC, r.reward_month DESC, r.granted_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GET /rewards error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - مكافآت معلم واحد
// ============================================
router.get('/teacher/:teacherId', checkPermission('rewards.view'), (req, res) => {
  try {
    const db = getDB()
    const { teacherId } = req.params

    // المعلم يرى فقط مكافآته
    if (req.user.role === 'teacher' && req.user.id !== parseInt(teacherId)) {
      return res.status(403).json({ success: false, error: 'غير مصرح' })
    }

    const teacher = db.prepare('SELECT id, full_name, role FROM users WHERE id = ?').get(teacherId)
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'المعلم غير موجود' })
    }

    const rewards = db.prepare(`
      SELECT 
        r.*,
        g.full_name as granted_by_name
      FROM teacher_rewards r
      JOIN users g ON g.id = r.granted_by
      WHERE r.teacher_id = ?
      ORDER BY r.reward_year DESC, r.reward_month DESC, r.granted_at DESC
    `).all(teacherId)

    // إحصائيات
    const totalAmount = rewards.reduce((s, r) => s + (r.amount || 0), 0)
    const paidAmount = rewards.filter(r => r.paid === 1).reduce((s, r) => s + (r.amount || 0), 0)
    const pendingAmount = totalAmount - paidAmount

    const stats = {
      total: rewards.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      byCategory: {},
    }

    // تجميع حسب التصنيف
    for (const r of rewards) {
      if (!stats.byCategory[r.category]) {
        stats.byCategory[r.category] = { count: 0, total: 0 }
      }
      stats.byCategory[r.category].count++
      stats.byCategory[r.category].total += r.amount
    }

    res.json({
      success: true,
      data: { teacher, rewards, stats },
    })
  } catch (error) {
    console.error('GET /rewards/teacher error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - مكافآت فترة (شهر/سنة)
// ============================================
router.get('/period/:year/:month', checkPermission('rewards.view'), (req, res) => {
  try {
    const db = getDB()
    const { year, month } = req.params

    const rewards = db.prepare(`
      SELECT 
        r.*,
        u.full_name as teacher_name,
        g.full_name as granted_by_name
      FROM teacher_rewards r
      JOIN users u ON u.id = r.teacher_id
      JOIN users g ON g.id = r.granted_by
      WHERE r.reward_year = ? AND r.reward_month = ?
      ORDER BY u.full_name, r.granted_at
    `).all(parseInt(year), parseInt(month))

    // تجميع حسب المعلم
    const byTeacher = {}
    for (const r of rewards) {
      if (!byTeacher[r.teacher_id]) {
        byTeacher[r.teacher_id] = {
          teacher_id: r.teacher_id,
          teacher_name: r.teacher_name,
          rewards: [],
          total: 0,
        }
      }
      byTeacher[r.teacher_id].rewards.push(r)
      byTeacher[r.teacher_id].total += r.amount
    }

    const total = rewards.reduce((s, r) => s + (r.amount || 0), 0)

    res.json({
      success: true,
      data: {
        rewards,
        byTeacher: Object.values(byTeacher),
        total,
        count: rewards.length,
        year: parseInt(year),
        month: parseInt(month),
      },
    })
  } catch (error) {
    console.error('GET /rewards/period error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - تصنيفات المكافآت
// ============================================
router.get('/meta/categories', (req, res) => {
  try {
    const db = getDB()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'reward_categories'").get()
    const categories = row ? JSON.parse(row.value) : []
    res.json({ success: true, data: categories })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إضافة مكافأة
// ============================================
router.post('/', checkPermission('rewards.create'), (req, res) => {
  try {
    const {
      teacher_id, category, title, description, amount,
      reward_month, reward_year, notes,
    } = req.body

    if (!teacher_id || !title || !amount || !reward_month || !reward_year) {
      return res.status(400).json({ success: false, error: 'يرجى ملء الحقول المطلوبة' })
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'المبلغ يجب أن يكون أكبر من 0' })
    }

    const db = getDB()

    // التحقق أن المعلم موجود
    const teacher = db.prepare("SELECT id, role FROM users WHERE id = ? AND role IN ('teacher', 'admin', 'accountant')").get(teacher_id)
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود أو ليس له صلاحية استلام المكافآت' })
    }

    const result = db.prepare(`
      INSERT INTO teacher_rewards (
        teacher_id, category, title, description, amount,
        reward_month, reward_year, granted_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      teacher_id, category || 'custom', title, description || null,
      amount, reward_month, reward_year, req.user.id, notes || null
    )

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: 'تم إضافة المكافأة',
    })
  } catch (error) {
    console.error('POST /rewards error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إضافة جماعية (لمعلمين متعددين)
// ============================================
router.post('/bulk', checkPermission('rewards.create'), (req, res) => {
  try {
    const { teacher_ids, category, title, description, amount, reward_month, reward_year, notes } = req.body

    if (!Array.isArray(teacher_ids) || teacher_ids.length === 0 || !title || !amount) {
      return res.status(400).json({ success: false, error: 'البيانات ناقصة' })
    }

    const db = getDB()
    const insert = db.prepare(`
      INSERT INTO teacher_rewards (
        teacher_id, category, title, description, amount,
        reward_month, reward_year, granted_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction((ids) => {
      for (const id of ids) {
        insert.run(
          id, category || 'custom', title, description || null,
          amount, reward_month, reward_year, req.user.id, notes || null
        )
      }
    })
    tx(teacher_ids)

    res.status(201).json({
      success: true,
      message: `تم إضافة ${teacher_ids.length} مكافأة`,
    })
  } catch (error) {
    console.error('POST /rewards/bulk error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT - تعديل مكافأة
// ============================================
router.put('/:id', checkPermission('rewards.edit'), (req, res) => {
  try {
    const db = getDB()
    const reward = db.prepare('SELECT * FROM teacher_rewards WHERE id = ?').get(req.params.id)

    if (!reward) {
      return res.status(404).json({ success: false, error: 'المكافأة غير موجودة' })
    }

    if (reward.paid === 1) {
      return res.status(400).json({ success: false, error: 'لا يمكن تعديل مكافأة مصروفة' })
    }

    const fields = ['category', 'title', 'description', 'amount', 'reward_month', 'reward_year', 'notes']
    const updates = []
    const values = []

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`)
        values.push(req.body[f])
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    }

    values.push(req.params.id)
    db.prepare(`UPDATE teacher_rewards SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - صرف مكافأة
// ============================================
router.post('/:id/pay', checkPermission('rewards.pay'), (req, res) => {
  try {
    const db = getDB()
    const reward = db.prepare('SELECT * FROM teacher_rewards WHERE id = ?').get(req.params.id)

    if (!reward) {
      return res.status(404).json({ success: false, error: 'المكافأة غير موجودة' })
    }

    if (reward.paid === 1) {
      return res.status(400).json({ success: false, error: 'المكافأة مصروفة مسبقاً' })
    }

    db.prepare(`
      UPDATE teacher_rewards 
      SET paid = 1, paid_at = CURRENT_TIMESTAMP, status = 'paid'
      WHERE id = ?
    `).run(req.params.id)

    res.json({ success: true, message: 'تم الصرف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - صرف جماعي لمكافآت فترة
// ============================================
router.post('/pay-period', checkPermission('rewards.pay'), (req, res) => {
  try {
    const { year, month } = req.body

    if (!year || !month) {
      return res.status(400).json({ success: false, error: 'السنة والشهر مطلوبان' })
    }

    const db = getDB()
    const result = db.prepare(`
      UPDATE teacher_rewards 
      SET paid = 1, paid_at = CURRENT_TIMESTAMP, status = 'paid'
      WHERE reward_year = ? AND reward_month = ? AND paid = 0
    `).run(year, month)

    res.json({ success: true, message: `تم صرف ${result.changes} مكافأة` })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - حذف مكافأة
// ============================================
router.delete('/:id', checkPermission('rewards.delete'), (req, res) => {
  try {
    const db = getDB()
    const reward = db.prepare('SELECT * FROM teacher_rewards WHERE id = ?').get(req.params.id)

    if (!reward) {
      return res.status(404).json({ success: false, error: 'المكافأة غير موجودة' })
    }

    if (reward.paid === 1) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف مكافأة مصروفة' })
    }

    db.prepare('DELETE FROM teacher_rewards WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: 'تم الحذف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - تقرير سنوي
// ============================================
router.get('/report/year/:year', checkPermission('rewards.view'), (req, res) => {
  try {
    const db = getDB()
    const { year } = req.params

    const monthly = db.prepare(`
      SELECT 
        reward_month,
        COUNT(*) as count,
        SUM(amount) as total,
        SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as paid_total
      FROM teacher_rewards
      WHERE reward_year = ?
      GROUP BY reward_month
      ORDER BY reward_month
    `).all(parseInt(year))

    const byTeacher = db.prepare(`
      SELECT 
        u.id, u.full_name,
        COUNT(r.id) as count,
        SUM(r.amount) as total
      FROM users u
      LEFT JOIN teacher_rewards r ON r.teacher_id = u.id AND r.reward_year = ?
      WHERE u.role IN ('teacher', 'admin', 'accountant') AND u.is_active = 1
      GROUP BY u.id
      HAVING count > 0
      ORDER BY total DESC
    `).all(parseInt(year))

    const byCategory = db.prepare(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total
      FROM teacher_rewards
      WHERE reward_year = ?
      GROUP BY category
      ORDER BY total DESC
    `).all(parseInt(year))

    const total = monthly.reduce((s, m) => s + m.total, 0)

    res.json({
      success: true,
      data: { monthly, byTeacher, byCategory, total, year: parseInt(year) },
    })
  } catch (error) {
    console.error('GET /rewards/report/year error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router