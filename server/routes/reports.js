import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// Dashboard - لوحة التحكم
// ============================================
router.get('/dashboard', (req, res) => {
  const db = getDB()
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.substring(0, 7)

  // عدد الطلاب
  const studentsCount = db.prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'active'`).get().c

  // إجمالي الأقساط المتوقعة
  const totalExpected = db.prepare(`SELECT COALESCE(SUM(total_fees), 0) as t FROM students WHERE status = 'active'`).get().t

  // إجمالي المحصل
  const totalPaid = db.prepare(`SELECT COALESCE(SUM(paid_amount), 0) as t FROM payments`).get().t

  // متأخرات
  const totalRemaining = totalExpected - totalPaid

  // مصاريف الشهر
  const monthExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as t FROM expenses
    WHERE expense_date LIKE ?
  `).get(`${thisMonth}%`).t

  // عدد المعلمين
  const teachersCount = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'teacher' AND is_active = 1`).get().c

  // حضور اليوم
  const todayAttendance = db.prepare(`
    SELECT 
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late
    FROM teacher_attendance WHERE date = ?
  `).get(today)

  res.json({
    success: true,
    data: {
      studentsCount,
      teachersCount,
      totalExpected,
      totalPaid,
      totalRemaining,
      collectionRate: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0,
      monthExpenses,
      todayAttendance,
    },
  })
})

// ============================================
// الإيرادات مقابل المصاريف (شهرياً)
// ============================================
router.get('/income-vs-expenses', checkPermission('reports.financial'), (req, res) => {
  const db = getDB()
  const year = req.query.year || new Date().getFullYear()

  const data = []
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`

    const income = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as t
      FROM payments WHERE payment_date LIKE ?
    `).get(`${monthStr}%`).t

    const expense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as t
      FROM expenses WHERE expense_date LIKE ?
    `).get(`${monthStr}%`).t

    data.push({ month: m, monthName: getMonthName(m), income, expense })
  }

  res.json({ success: true, data })
})

// ============================================
// تقرير مالي شامل
// ============================================
router.get('/financial', checkPermission('reports.financial'), (req, res) => {
  const db = getDB()
  const { from_date, to_date } = req.query

  let incomeSql = 'SELECT COALESCE(SUM(paid_amount), 0) as t FROM payments WHERE 1=1'
  let expenseSql = 'SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE 1=1'
  const params1 = []
  const params2 = []

  if (from_date) {
    incomeSql += ' AND payment_date >= ?'; params1.push(from_date)
    expenseSql += ' AND expense_date >= ?'; params2.push(from_date)
  }
  if (to_date) {
    incomeSql += ' AND payment_date <= ?'; params1.push(to_date)
    expenseSql += ' AND expense_date <= ?'; params2.push(to_date)
  }

  const income = db.prepare(incomeSql).get(...params1).t
  const expenses = db.prepare(expenseSql).get(...params2).t

  const byCategory = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses WHERE 1=1
    ${from_date ? ' AND expense_date >= ?' : ''}
    ${to_date ? ' AND expense_date <= ?' : ''}
    GROUP BY category ORDER BY total DESC
  `).all(...params2)

  res.json({
    success: true,
    data: {
      totalIncome: income,
      totalExpenses: expenses,
      net: income - expenses,
      expensesByCategory: byCategory,
      from_date, to_date,
    },
  })
})

// ============================================
// تقرير المتأخرين
// ============================================
router.get('/outstanding', checkPermission('reports.financial'), (req, res) => {
  const db = getDB()
  const { grade, from_date, to_date } = req.query

  let sql = `
    SELECT
      s.id, s.full_name, s.grade, s.section, s.guardian_name, s.guardian_phone,
      s.total_fees,
      COALESCE((SELECT SUM(paid_amount) FROM payments WHERE student_id = s.id), 0) as total_paid,
      (SELECT MAX(payment_date) FROM payments WHERE student_id = s.id) as last_payment_date,
      (SELECT COUNT(*) FROM payments WHERE student_id = s.id) as payment_count
    FROM students s
    WHERE s.status = 'active'
  `
  const params = []

  if (grade) {
    sql += ' AND s.grade = ?'
    params.push(grade)
  }

  sql += ' ORDER BY s.grade, s.section, s.full_name'

  const rows = db.prepare(sql).all(...params)

  let outstanding = rows
    .map(r => ({
      ...r,
      remaining: r.total_fees - r.total_paid,
      days_since_payment: r.last_payment_date
        ? Math.floor((new Date() - new Date(r.last_payment_date)) / (1000 * 60 * 60 * 24))
        : null,
    }))
    .filter(r => r.remaining > 0)

  // فلترة حسب تاريخ آخر دفعة
  if (from_date || to_date) {
    outstanding = outstanding.filter((s) => {
      if (!s.last_payment_date) {
        // لم يدفع أبداً — يُدرج دائماً في فلترة "بدون دفعات"
        return true
      }
      if (from_date && s.last_payment_date < from_date) return true
      if (to_date && s.last_payment_date > to_date) return true
      return false
    })
  }

  outstanding = outstanding.sort((a, b) => b.remaining - a.remaining)

  const total = outstanding.reduce((s, r) => s + r.remaining, 0)

  // إحصائيات حسب الصف
  const byGrade = {}
  for (const s of outstanding) {
    if (!byGrade[s.grade]) byGrade[s.grade] = { count: 0, total: 0 }
    byGrade[s.grade].count++
    byGrade[s.grade].total += s.remaining
  }

  res.json({
    success: true,
    data: {
      students: outstanding,
      total,
      count: outstanding.length,
      byGrade,
      filters: { grade, from_date, to_date },
    },
  })
})

// ============================================
// تقرير حضور معلم
// ============================================
router.get('/teacher-attendance/:teacherId', checkPermission('reports.academic'), (req, res) => {
  const db = getDB()
  const { from_date, to_date } = req.query

  let sql = `
    SELECT date, status, check_in_time, late_minutes
    FROM teacher_attendance WHERE teacher_id = ?
  `
  const params = [req.params.teacherId]

  if (from_date) { sql += ' AND date >= ?'; params.push(from_date) }
  if (to_date) { sql += ' AND date <= ?'; params.push(to_date) }
  sql += ' ORDER BY date DESC'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// ============================================
// إحصائيات عامة للطلاب
// ============================================
router.get('/students-stats', checkPermission('reports.academic'), (req, res) => {
  const db = getDB()
  const byGrade = db.prepare(`
    SELECT grade, COUNT(*) as count
    FROM students WHERE status = 'active'
    GROUP BY grade ORDER BY grade
  `).all()

  const byGender = db.prepare(`
    SELECT gender, COUNT(*) as count
    FROM students WHERE status = 'active'
    GROUP BY gender
  `).all()

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM students GROUP BY status
  `).all()

  res.json({ success: true, data: { byGrade, byGender, byStatus } })
})

function getMonthName(m) {
  const names = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  return names[m - 1]
}
// ============================================
// تقرير شامل للفترة
// ============================================
router.get('/comprehensive', checkPermission('reports.financial'), (req, res) => {
  const db = getDB()
  const { from_date, to_date } = req.query

  if (!from_date || !to_date) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد الفترة' })
  }

  // === الإيرادات (المدفوعات) ===
  const income = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as count
    FROM payments
    WHERE payment_date BETWEEN ? AND ?
  `).get(from_date, to_date)

  // === المصاريف ===
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
  `).get(from_date, to_date)

  // === المصاريف حسب الفئة ===
  const expensesByCategory = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
    GROUP BY category
    ORDER BY total DESC
  `).all(from_date, to_date)

  // === المدفوعات حسب الطريقة ===
  const incomeByMethod = db.prepare(`
    SELECT method, SUM(paid_amount) as total, COUNT(*) as count
    FROM payments
    WHERE payment_date BETWEEN ? AND ?
    GROUP BY method
    ORDER BY total DESC
  `).all(from_date, to_date)

  // === المدفوعات حسب الصف ===
  const incomeByGrade = db.prepare(`
    SELECT s.grade, SUM(p.paid_amount) as total, COUNT(DISTINCT p.student_id) as students
    FROM payments p
    JOIN students s ON s.id = p.student_id
    WHERE p.payment_date BETWEEN ? AND ?
    GROUP BY s.grade
    ORDER BY s.grade
  `).all(from_date, to_date)

  // === إجمالي الرسوم المتوقعة ===
  const totalExpected = db.prepare(`
    SELECT COALESCE(SUM(total_fees), 0) as total
    FROM students
    WHERE status = 'active'
  `).get().total

  // === إجمالي ما تم تحصيله (الكل) ===
  const totalCollected = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total
    FROM payments
  `).get().total

  // === إجمالي المصاريف (الكل) ===
  const totalExpensesAll = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
  `).get().total

  // === رواتب مدفوعة ===
  const paidPayrolls = db.prepare(`
    SELECT COALESCE(SUM(net_salary), 0) as total, COUNT(*) as count
    FROM payroll_records
    WHERE status = 'paid' AND paid_at BETWEEN ? AND ?
  `).get(from_date + ' 00:00:00', to_date + ' 23:59:59')

  // === سلف معتمدة ===
  const approvedAdvances = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM advances
    WHERE status = 'approved' AND request_date BETWEEN ? AND ?
  `).get(from_date, to_date)

  // === إحصائيات الطلاب ===
  const studentsStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active
    FROM students
  `).get()

  // === صافي الربح ===
  const netProfit = income.total - expenses.total

  res.json({
    success: true,
    data: {
      period: { from_date, to_date },
      summary: {
        totalIncome: income.total,
        incomeCount: income.count,
        totalExpenses: expenses.total,
        expensesCount: expenses.count,
        netProfit,
        totalExpected,
        totalCollected,
        totalRemaining: totalExpected - totalCollected,
        collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      },
      expensesByCategory,
      incomeByMethod,
      incomeByGrade,
      paidPayrolls,
      approvedAdvances,
      studentsStats,
    },
  })
})

// ============================================
// تقرير شهري (12 شهر من السنة)
// ============================================
router.get('/yearly', checkPermission('reports.financial'), (req, res) => {
  const db = getDB()
  const year = parseInt(req.query.year) || new Date().getFullYear()

  const months = []
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`

    const income = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total
      FROM payments
      WHERE payment_date LIKE ?
    `).get(`${monthStr}%`).total

    const expense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE expense_date LIKE ?
    `).get(`${monthStr}%`).total

    months.push({
      month: m,
      monthName: getMonthName(m),
      income,
      expense,
      net: income - expense,
    })
  }

  const totalIncome = months.reduce((s, m) => s + m.income, 0)
  const totalExpense = months.reduce((s, m) => s + m.expense, 0)

  res.json({
    success: true,
    data: {
      year,
      months,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        net: totalIncome - totalExpense,
      },
    },
  })
})

// ============================================
// تقرير الميزانية العمومية
// ============================================
router.get('/balance', checkPermission('reports.financial'), (req, res) => {
  const db = getDB()

  // الأصول (المتحصلات)
  const totalCollected = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments
  `).get().total

  // المتأخرات (ديون)
  const totalExpected = db.prepare(`
    SELECT COALESCE(SUM(total_fees), 0) as total FROM students WHERE status = 'active'
  `).get().total
  const outstanding = totalExpected - totalCollected

  // المصاريف الكلية
  const totalExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses
  `).get().total

  // الرواتب المدفوعة
  const totalPayrolls = db.prepare(`
    SELECT COALESCE(SUM(net_salary), 0) as total
    FROM payroll_records WHERE status = 'paid'
  `).get().total

  // السلف المعتمدة (غير مخصومة بعد)
  const pendingAdvances = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM advances WHERE status = 'approved'
  `).get().total

  res.json({
    success: true,
    data: {
      assets: {
        collected: totalCollected,
        outstanding,
        total: totalCollected + outstanding,
      },
      liabilities: {
        expenses: totalExpenses,
        payrolls: totalPayrolls,
        advances: pendingAdvances,
        total: totalExpenses + totalPayrolls + pendingAdvances,
      },
      net: totalCollected - totalExpenses - totalPayrolls,
    },
  })
})

// دالة مساعدة
// ============================================
// GET - إحصائيات سريعة للـ Sidebar
// ============================================
router.get('/sidebar-stats', checkPermission('attendance.view'), (req, res) => {
  try {
    const db = getDB()
    const user = req.user

    let queryParams = []
    let whereStudents = 'WHERE s.status = ?'
    queryParams.push('active')

    // تقييد المرشد
    if (user.role !== 'admin') {
      const fullUser = db.prepare('SELECT is_advisor, advisor_grade, advisor_section FROM users WHERE id = ?').get(user.id)

      if (fullUser?.is_advisor) {
        whereStudents += ' AND s.grade = ?'
        queryParams.push(fullUser.advisor_grade)

        if (fullUser.advisor_section) {
          whereStudents += ' AND s.section = ?'
          queryParams.push(fullUser.advisor_section)
        }
      }
    }

    // ============================================
    // 1) عدد إنذارات الغياب النشطة
    // ============================================
    let warningsSql = `
      SELECT COUNT(*) as c
      FROM students s
      ${whereStudents}
      AND s.absence_level >= 1
    `
    const warningsCount = db.prepare(warningsSql).get(...queryParams).c

    // ============================================
    // 2) عدد الطلاب المتأخرين (عليهم دين)
    // ============================================
    let outstandingSql = `
      SELECT COUNT(*) as c
      FROM students s
      ${whereStudents}
      AND (
        s.total_fees - COALESCE(
          (SELECT SUM(paid_amount) FROM payments WHERE student_id = s.id), 0
        )
      ) > 0
    `
    const outstandingCount = db.prepare(outstandingSql).get(...queryParams).c

    // ============================================
    // 3) عدد الواجبات المتأخرة (للمعلم)
    // ============================================
    let lateAssignmentsCount = 0
    try {
      const lateSql = `
        SELECT COUNT(DISTINCT sub.student_id) as c
        FROM assignment_submissions sub
        JOIN students s ON s.id = sub.student_id
        ${whereStudents}
        AND sub.status IN ('late', 'not_submitted')
      `
      lateAssignmentsCount = db.prepare(lateSql).get(...queryParams).c
    } catch (e) {
      lateAssignmentsCount = 0
    }

    res.json({
      success: true,
      data: {
        warnings: warningsCount,
        outstanding: outstandingCount,
        lateAssignments: lateAssignmentsCount,
      },
    })
  } catch (error) {
    console.error('GET /reports/sidebar-stats error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
export default router