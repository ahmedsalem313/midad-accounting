// server/routes/partners.js
import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import { hashPassword } from '../utils/bcrypt.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// GET /api/partners — كل الشركاء
// ============================================
router.get('/', (req, res) => {
  try {
    const db = getDB()
    const rows = db.prepare(`
      SELECT p.*, u.username, u.is_active as user_active,
        (SELECT COUNT(*) FROM partner_distributions WHERE partner_id = p.id) as distributions_count,
        (SELECT COALESCE(SUM(amount), 0) FROM partner_capital WHERE partner_id = p.id AND type = 'deposit') as total_deposits,
        (SELECT COALESCE(SUM(amount), 0) FROM partner_capital WHERE partner_id = p.id AND type = 'withdrawal') as total_withdrawals
      FROM partners p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.share_percentage DESC, p.name
    `).all()
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST /api/partners — إضافة شريك
// ============================================
router.post('/', checkPermission('partners.create'), async (req, res) => {
  try {
    const db = getDB()
    const { name, phone, email, share_percentage, password, username, notes } = req.body

    if (!name || !share_percentage) {
      return res.status(400).json({ success: false, error: 'الاسم والنسبة مطلوبان' })
    }

    // فحص مجموع النسب لا يتجاوز 100%
    const current = db.prepare('SELECT COALESCE(SUM(share_percentage), 0) as total FROM partners WHERE is_active = 1').get()
    if (current.total + parseFloat(share_percentage) > 100) {
      return res.status(400).json({
        success: false,
        error: `مجموع النسب سيتجاوز 100% (الحالي: ${current.total}%)`,
      })
    }

    // احسب الـ hash قبل transaction (لأن await لا يعمل داخل transaction sync)
    let hashedPassword = null
    if (password && username) {
      hashedPassword = await hashPassword(password)
    }

    const tx = db.transaction(() => {
      let userId = null

      // إنشاء حساب دخول تلقائيًا
      if (hashedPassword && username) {
        const userResult = db.prepare(`
          INSERT INTO users (username, password, full_name, email, phone, role, is_active)
          VALUES (?, ?, ?, ?, ?, 'partner', 1)
        `).run(username, hashedPassword, name, email || null, phone || null)
        userId = userResult.lastInsertRowid
      }

      const result = db.prepare(`
        INSERT INTO partners (user_id, name, phone, email, share_percentage, joined_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        name,
        phone || null,
        email || null,
        parseFloat(share_percentage),
        new Date().toISOString().split('T')[0],
        notes || null
      )

      return result.lastInsertRowid
    })

    const id = tx()
    res.json({ success: true, data: { id }, message: 'تمت الإضافة' })
  } catch (error) {
    console.error(error)
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'اسم المستخدم مستخدم بالفعل' })
    }
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT /api/partners/:id — تعديل شريك
// ============================================
router.put('/:id', checkPermission('partners.edit'), (req, res) => {
  try {
    const db = getDB()
    const { name, phone, email, share_percentage, is_active, notes } = req.body

    if (share_percentage !== undefined) {
      const current = db.prepare(`
        SELECT COALESCE(SUM(share_percentage), 0) as total 
        FROM partners WHERE is_active = 1 AND id != ?
      `).get(req.params.id)
      if (current.total + parseFloat(share_percentage) > 100) {
        return res.status(400).json({
          success: false,
          error: `مجموع النسب سيتجاوز 100% (بدون هذا الشريك: ${current.total}%)`,
        })
      }
    }

    db.prepare(`
      UPDATE partners SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        share_percentage = COALESCE(?, share_percentage),
        is_active = COALESCE(?, is_active),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, phone, email,
      share_percentage !== undefined ? parseFloat(share_percentage) : null,
      is_active, notes, req.params.id
    )

    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE /api/partners/:id
// ============================================
router.delete('/:id', checkPermission('partners.edit'), (req, res) => {
  try {
    const db = getDB()
    const partner = db.prepare('SELECT user_id FROM partners WHERE id = ?').get(req.params.id)

    db.prepare('DELETE FROM partners WHERE id = ?').run(req.params.id)

    // احذف حساب المستخدم إن وُجد
    if (partner?.user_id) {
      db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(partner.user_id, 'partner')
    }

    res.json({ success: true, message: 'تم الحذف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
// ============================================
// GET /api/partners/me — بيانات الشريك الحالي
// ============================================
router.get('/me', (req, res) => {
  try {
    const db = getDB()
    const userId = req.user.id

    const partner = db.prepare('SELECT * FROM partners WHERE user_id = ?').get(userId)
    if (!partner) {
      return res.status(404).json({ success: false, error: 'حسابك غير مرتبط بشريك' })
    }

    const capital = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as deposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as withdrawals
      FROM partner_capital WHERE partner_id = ?
    `).get(partner.id)

    const distributions = db.prepare(`
      SELECT * FROM partner_distributions
      WHERE partner_id = ?
      ORDER BY year DESC, month DESC
    `).all(partner.id)

    const totalEarned = distributions.reduce((s, d) => s + d.partner_share, 0)
    const totalPaid = distributions.filter((d) => d.status === 'paid').reduce((s, d) => s + d.partner_share, 0)
    const pending = distributions.filter((d) => d.status === 'pending').reduce((s, d) => s + d.partner_share, 0)

    res.json({
      success: true,
      data: {
        partner,
        capital: {
          deposits: capital.deposits,
          withdrawals: capital.withdrawals,
          balance: capital.deposits - capital.withdrawals,
        },
        distributions,
        totals: { totalEarned, totalPaid, pending },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET /api/partners/summary — ملخص الحصص
// ============================================
router.get('/summary', (req, res) => {
  try {
    const db = getDB()
    const rows = db.prepare(`
      SELECT 
        COUNT(*) as total_partners,
        COALESCE(SUM(share_percentage), 0) as total_shares,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_partners
      FROM partners
    `).get()

    res.json({
      success: true,
      data: {
        ...rows,
        remaining: 100 - rows.total_shares,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
// ============================================
// GET /api/partners/:id/capital — رأس مال شريك
// ============================================
router.get('/:id/capital', (req, res) => {
  try {
    const db = getDB()
    const rows = db.prepare(`
      SELECT c.*, u.full_name as recorder_name
      FROM partner_capital c
      LEFT JOIN users u ON u.id = c.recorded_by
      WHERE c.partner_id = ?
      ORDER BY c.transaction_date DESC, c.id DESC
    `).all(req.params.id)

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as deposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as withdrawals
      FROM partner_capital
      WHERE partner_id = ?
    `).get(req.params.id)

    res.json({
      success: true,
      data: {
        transactions: rows,
        totals: {
          deposits: totals.deposits,
          withdrawals: totals.withdrawals,
          balance: totals.deposits - totals.withdrawals,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST /api/partners/:id/capital — إيداع/سحب
// ============================================
router.post('/:id/capital', checkPermission('partners.capital'), (req, res) => {
  try {
    const db = getDB()
    const { type, amount, transaction_date, method, notes } = req.body

    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ success: false, error: 'نوع العملية غير صالح' })
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'المبلغ غير صالح' })
    }

    const result = db.prepare(`
      INSERT INTO partner_capital
      (partner_id, type, amount, transaction_date, method, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id,
      type,
      parseFloat(amount),
      transaction_date || new Date().toISOString().split('T')[0],
      method || 'cash',
      notes || null,
      req.user.id
    )

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE /api/partners/capital/:id
// ============================================
router.delete('/capital/:id', checkPermission('partners.capital'), (req, res) => {
  try {
    const db = getDB()
    db.prepare('DELETE FROM partner_capital WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET /api/partners/profits/:year/:month — حساب أرباح الشهر
// ============================================
router.get('/profits/:year/:month', (req, res) => {
  try {
    const db = getDB()
    const year = parseInt(req.params.year)
    const month = parseInt(req.params.month)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-31`

    // 1) الإيرادات (المدفوعات)
    const income = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total
      FROM payments
      WHERE payment_date BETWEEN ? AND ?
    `).get(start, end).total

    // 2) المصاريف
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
    `).get(start, end).total

    // 3) الرواتب المدفوعة
    const payrolls = db.prepare(`
      SELECT COALESCE(SUM(net_salary), 0) as total
      FROM payroll_records
      WHERE month = ? AND year = ? AND status = 'paid'
    `).get(month, year).total

    // 4) صافي الربح
    const netProfit = income - expenses - payrolls

    // 5) نسب الشركاء
    const partners = db.prepare(`
      SELECT id, name, share_percentage
      FROM partners
      WHERE is_active = 1
      ORDER BY share_percentage DESC
    `).all()

    // 6) حصص الشركاء
    const shares = partners.map((p) => ({
      partner_id: p.id,
      partner_name: p.name,
      share_percentage: p.share_percentage,
      share_amount: Math.round((netProfit * p.share_percentage) / 100),
    }))

    // 7) هل تم التوزيع سابقًا؟
    const existing = db.prepare(`
      SELECT * FROM partner_distributions
      WHERE year = ? AND month = ?
    `).all(year, month)

    res.json({
      success: true,
      data: {
        period: { year, month },
        income,
        expenses,
        payrolls,
        netProfit,
        shares,
        existing_distributions: existing,
        is_distributed: existing.length > 0,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST /api/partners/distribute — تطبيق التوزيع
// ============================================
router.post('/distribute', checkPermission('partners.distribute'), (req, res) => {
  try {
    const db = getDB()
    const { year, month, notes } = req.body

    if (!year || !month) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد الشهر والسنة' })
    }

    // احسب الأرباح
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-31`

    const income = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total
      FROM payments WHERE payment_date BETWEEN ? AND ?
    `).get(start, end).total

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE expense_date BETWEEN ? AND ?
    `).get(start, end).total

    const payrolls = db.prepare(`
      SELECT COALESCE(SUM(net_salary), 0) as total
      FROM payroll_records
      WHERE month = ? AND year = ? AND status = 'paid'
    `).get(month, year).total

    const netProfit = income - expenses - payrolls

    if (netProfit <= 0) {
      return res.status(400).json({
        success: false,
        error: `لا يوجد ربح لهذا الشهر (صافي: ${netProfit.toLocaleString('ar-IQ')} د.ع)`,
      })
    }

    const partners = db.prepare(`
      SELECT id, name, share_percentage
      FROM partners
      WHERE is_active = 1
    `).all()

    if (partners.length === 0) {
      return res.status(400).json({ success: false, error: 'لا يوجد شركاء نشطون' })
    }

    const tx = db.transaction(() => {
      // احذف التوزيع السابق إن وُجد
      db.prepare(`
        DELETE FROM partner_distributions
        WHERE year = ? AND month = ? AND status = 'pending'
      `).run(year, month)

      const insert = db.prepare(`
        INSERT INTO partner_distributions
        (partner_id, month, year, share_percentage, gross_profit, partner_share, status, notes, computed_by)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `)

      for (const p of partners) {
        const share = Math.round((netProfit * p.share_percentage) / 100)
        insert.run(
          p.id, month, year,
          p.share_percentage, netProfit, share,
          notes || null, req.user.id
        )
      }
    })

    tx()

    res.json({
      success: true,
      message: `تم توزيع أرباح ${partners.length} شركاء`,
      netProfit,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET /api/partners/distributions — كل التوزيعات
// ============================================
router.get('/distributions/all', (req, res) => {
  try {
    const db = getDB()
    const { year, month, status } = req.query

    let sql = `
      SELECT d.*, p.name as partner_name,
             u.full_name as computed_by_name
      FROM partner_distributions d
      JOIN partners p ON p.id = d.partner_id
      LEFT JOIN users u ON u.id = d.computed_by
      WHERE 1=1
    `
    const params = []

    if (year) { sql += ' AND d.year = ?'; params.push(year) }
    if (month) { sql += ' AND d.month = ?'; params.push(month) }
    if (status) { sql += ' AND d.status = ?'; params.push(status) }

    sql += ' ORDER BY d.year DESC, d.month DESC, p.name'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST /api/partners/distributions/:id/pay — صرف حصة شريك
// ============================================
router.post('/distributions/:id/pay', checkPermission('partners.distribute'), (req, res) => {
  try {
    const db = getDB()
    const { paid_method = 'cash' } = req.body

    const dist = db.prepare('SELECT * FROM partner_distributions WHERE id = ?').get(req.params.id)
    if (!dist) return res.status(404).json({ success: false, error: 'غير موجود' })
    if (dist.status === 'paid') return res.status(400).json({ success: false, error: 'مدفوع مسبقًا' })

    db.prepare(`
      UPDATE partner_distributions
      SET status = 'paid', paid_amount = partner_share, paid_at = CURRENT_TIMESTAMP, paid_method = ?
      WHERE id = ?
    `).run(paid_method, req.params.id)

    res.json({ success: true, message: 'تم الصرف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET /api/partners/report/:id — تقرير شامل لشريك
// ============================================
router.get('/report/:id', (req, res) => {
  try {
    const db = getDB()
    const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(req.params.id)
    if (!partner) return res.status(404).json({ success: false, error: 'غير موجود' })

    const capital = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as deposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as withdrawals
      FROM partner_capital WHERE partner_id = ?
    `).get(req.params.id)

    const distributions = db.prepare(`
      SELECT * FROM partner_distributions
      WHERE partner_id = ?
      ORDER BY year DESC, month DESC
    `).all(req.params.id)

    const totalEarned = distributions.reduce((s, d) => s + d.partner_share, 0)
    const totalPaid = distributions.filter((d) => d.status === 'paid').reduce((s, d) => s + d.partner_share, 0)
    const pending = distributions.filter((d) => d.status === 'pending').reduce((s, d) => s + d.partner_share, 0)

    res.json({
      success: true,
      data: {
        partner,
        capital: {
          deposits: capital.deposits,
          withdrawals: capital.withdrawals,
          balance: capital.deposits - capital.withdrawals,
        },
        distributions,
        totals: {
          totalEarned,
          totalPaid,
          pending,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
export default router