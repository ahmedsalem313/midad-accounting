import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// حساب الراتب حسب النوع
// ============================================
function calculateSalary(db, teacherId, month, year) {
  const teacher = db.prepare(`
    SELECT id, full_name, base_salary FROM users WHERE id = ?
  `).get(teacherId)
  if (!teacher) return null

  const config = db.prepare('SELECT * FROM teacher_salaries WHERE teacher_id = ?').get(teacherId)

  const salaryType = config?.salary_type || 'fixed'

  const baseSalary = config?.base_salary || 0
  const lessonPrice = config?.lesson_price || 0
  const hourlyRate = config?.hourly_rate || 0
  const commissionRate = config?.commission_rate || 0

  const housing = config?.housing_allowance || 0
  const transport = config?.transport_allowance || 0
  const other = config?.other_allowance || 0
  const allowances = housing + transport + other

  const absenceDedPerDay = config?.absence_deduction_per_day || 0
  const lateDedPerMin = config?.late_deduction_per_minute || 0

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`

  const att = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
      COALESCE(SUM(late_minutes), 0) as late_minutes
    FROM teacher_attendance
    WHERE teacher_id = ? AND date BETWEEN ? AND ?
  `).get(teacherId, start, end)

  const advances = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM advances
    WHERE teacher_id = ? AND deduction_month = ? AND deduction_year = ?
      AND status = 'approved'
  `).get(teacherId, month, year)

  const rewards = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM teacher_rewards
    WHERE teacher_id = ? AND reward_month = ? AND reward_year = ?
  `).get(teacherId, month, year)

  const rewardsList = db.prepare(`
    SELECT id, title, category, amount, description
    FROM teacher_rewards
    WHERE teacher_id = ? AND reward_month = ? AND reward_year = ?
    ORDER BY granted_at
  `).all(teacherId, month, year)

  const rewardsTotal = rewards.total
  const rewardsCount = rewards.count

  let lessonCount = 0
  let lessonAmount = 0
  let hoursCount = 0
  let hourlyAmount = 0
  let commissionAmount = 0

  if (salaryType === 'per_lesson' || salaryType === 'mixed') {
    const timetableCount = db.prepare(`
      SELECT COUNT(*) as c FROM timetable WHERE teacher_id = ?
    `).get(teacherId).c

    const weeksInMonth = 4.3
    lessonCount = Math.round(timetableCount * weeksInMonth)

    const lessonsPerDay = timetableCount > 0
      ? timetableCount / Math.max(1, (att.present_days + att.absent_days))
      : 0
    const missedLessons = Math.round(att.absent_days * lessonsPerDay)
    lessonCount = Math.max(0, lessonCount - missedLessons)

    lessonAmount = lessonCount * lessonPrice
  }

  if (salaryType === 'mixed') {
    hoursCount = att.present_days * 6
    hourlyAmount = hoursCount * hourlyRate

    if (commissionRate > 0) {
      const revenue = db.prepare(`
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM payments
        WHERE payment_date BETWEEN ? AND ?
      `).get(start, end).total

      commissionAmount = Math.round((revenue * commissionRate) / 100)
    }
  }

  let grossSalary = 0

  if (salaryType === 'fixed') {
    grossSalary = baseSalary
  } else if (salaryType === 'per_lesson') {
    grossSalary = lessonAmount
  } else if (salaryType === 'mixed') {
    grossSalary = baseSalary + lessonAmount + hourlyAmount + commissionAmount
  }

  const absenceDeduction = salaryType === 'fixed'
    ? att.absent_days * absenceDedPerDay
    : 0

  const lateDeduction = att.late_minutes * lateDedPerMin
  const advancesDeduction = advances.total
  const bonus = rewardsTotal
  const rewardsDataJSON = rewardsList.length > 0 ? JSON.stringify(rewardsList) : null
  const netSalary = grossSalary + allowances + rewardsTotal - absenceDeduction - lateDeduction - advancesDeduction

  return {
    teacher_id: teacher.id,
    teacher_name: teacher.full_name,
    month, year,
    salary_type: salaryType,

    base_salary: baseSalary,
    lesson_count: lessonCount,
    lesson_price: lessonPrice,
    lesson_amount: lessonAmount,
    hourly_rate: hourlyRate,
    hours_count: hoursCount,
    hourly_amount: hourlyAmount,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,

    allowances,
    allowances_breakdown: { housing, transport, other },
    bonus: bonus,
    rewards_count: rewardsCount,
    rewards_list: rewardsList,
    rewards_data: rewardsDataJSON,

    attendance_days: att.present_days,
    absence_days: att.absent_days,
    late_count: att.late_days,
    late_minutes: att.late_minutes,

    absence_deduction: absenceDeduction,
    late_deduction: lateDeduction,
    advances_deduction: advancesDeduction,
    other_deductions: 0,
    manual_adjustment: 0,

    net_salary: Math.round(netSalary),
    gross_salary: Math.round(grossSalary),
  }
}

// ============================================
// GET - كل كشوف الرواتب
// ============================================
router.get('/', checkPermission('payroll.view'), (req, res) => {
  const db = getDB()
  const { year, month, teacher_id, status } = req.query

  let sql = `
    SELECT p.*, u.full_name as teacher_name
    FROM payroll_records p
    JOIN users u ON u.id = p.teacher_id
    WHERE 1=1
  `
  const params = []

  if (year) { sql += ' AND p.year = ?'; params.push(year) }
  if (month) { sql += ' AND p.month = ?'; params.push(month) }
  if (teacher_id) { sql += ' AND p.teacher_id = ?'; params.push(teacher_id) }
  if (status) { sql += ' AND p.status = ?'; params.push(status) }

  sql += ' ORDER BY p.year DESC, p.month DESC, u.full_name'

  const rows = db.prepare(sql).all(...params)

  for (const row of rows) {
    try {
      row.rewards_list = row.rewards_data ? JSON.parse(row.rewards_data) : []
    } catch {
      row.rewards_list = []
    }
  }

  res.json({ success: true, data: rows })
})

// ============================================
// GET - معاينة حساب الرواتب
// ============================================
router.get('/preview', checkPermission('payroll.calculate'), (req, res) => {
  const db = getDB()
  const { year, month } = req.query

  const y = parseInt(year) || new Date().getFullYear()
  const m = parseInt(month) || new Date().getMonth() + 1

  const teachers = db.prepare(`
    SELECT id FROM users WHERE role IN ('teacher', 'accountant') AND is_active = 1 ORDER BY full_name
  `).all()

  const results = teachers.map(t => calculateSalary(db, t.id, m, y)).filter(Boolean)
  const grandTotal = results.reduce((s, r) => s + r.net_salary, 0)

  res.json({ success: true, data: { records: results, grandTotal, year: y, month: m } })
})

// ============================================
// POST - إنشاء كشوف الرواتب
// ============================================
router.post('/generate', checkPermission('payroll.calculate'), (req, res) => {
  try {
    const { year, month } = req.body
    if (!year || !month) return res.status(400).json({ success: false, error: 'يرجى تحديد الشهر والسنة' })

    const db = getDB()
    const teachers = db.prepare(`
      SELECT id FROM users WHERE role IN ('teacher', 'accountant') AND is_active = 1
    `).all()

    const insert = db.prepare(`
      INSERT OR REPLACE INTO payroll_records (
        teacher_id, month, year, salary_type,
        base_salary, lesson_count, lesson_price, lesson_amount,
        hourly_rate, hours_count, hourly_amount,
        commission_rate, commission_amount,
        allowances, bonus, rewards_data,
        absence_deduction, late_deduction, advances_deduction,
        other_deductions, manual_adjustment, net_salary,
        attendance_days, absence_days, late_count, late_minutes,
        status, created_by
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        'draft', ?
      )
    `)

    const tx = db.transaction(() => {
      for (const t of teachers) {
        const r = calculateSalary(db, t.id, month, year)
        if (!r) continue

        const existing = db.prepare(`
          SELECT status FROM payroll_records
          WHERE teacher_id = ? AND month = ? AND year = ?
        `).get(t.id, month, year)

        if (existing?.status === 'paid') continue

        insert.run(
          r.teacher_id, r.month, r.year, r.salary_type,
          r.base_salary, r.lesson_count, r.lesson_price, r.lesson_amount,
          r.hourly_rate, r.hours_count, r.hourly_amount,
          r.commission_rate, r.commission_amount,
          r.allowances, r.bonus, r.rewards_data,
          r.absence_deduction, r.late_deduction, r.advances_deduction,
          r.other_deductions, r.manual_adjustment, r.net_salary,
          r.attendance_days, r.absence_days, r.late_count, r.late_minutes,
          req.user.id
        )

        db.prepare(`
          UPDATE teacher_rewards
          SET paid = 1, paid_at = CURRENT_TIMESTAMP, status = 'paid'
          WHERE teacher_id = ? AND reward_month = ? AND reward_year = ?
        `).run(t.id, month, year)
      }
    })
    tx()

    res.json({ success: true, message: 'تم إنشاء كشوف الرواتب' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// ============================================
// PUT - تعديل كشف راتب
// ============================================
router.put('/:id', checkPermission('payroll.calculate'), (req, res) => {
  try {
    const db = getDB()
    const record = db.prepare('SELECT * FROM payroll_records WHERE id = ?').get(req.params.id)
    if (!record) return res.status(404).json({ success: false, error: 'غير موجود' })
    if (record.status === 'paid') return res.status(400).json({ success: false, error: 'لا يمكن تعديل راتب مدفوع' })

    const { bonus, other_deductions, manual_adjustment, adjustment_note,
            base_salary, allowances, lesson_count, hourly_rate, commission_rate } = req.body

    const newBonus = bonus !== undefined ? bonus : record.bonus
    const newOther = other_deductions !== undefined ? other_deductions : record.other_deductions
    const newAdjust = manual_adjustment !== undefined ? manual_adjustment : (record.manual_adjustment || 0)
    const newBase = base_salary !== undefined ? base_salary : record.base_salary
    const newAllow = allowances !== undefined ? allowances : record.allowances
    const newLessonCount = lesson_count !== undefined ? lesson_count : record.lesson_count
    const newLessonAmount = newLessonCount * record.lesson_price
    const newHourlyRate = hourly_rate !== undefined ? hourly_rate : record.hourly_rate
    const newHourlyAmount = record.hours_count * newHourlyRate
    const newCommissionRate = commission_rate !== undefined ? commission_rate : record.commission_rate

    let newCommissionAmount = record.commission_amount
    if (commission_rate !== undefined && record.commission_rate > 0 && record.commission_amount > 0) {
      newCommissionAmount = Math.round((record.commission_amount / record.commission_rate) * newCommissionRate)
    }

    const gross = newBase + newLessonAmount + newHourlyAmount + newCommissionAmount
    const net = gross + newAllow + newBonus
      - record.absence_deduction - record.late_deduction
      - record.advances_deduction - newOther + newAdjust

    db.prepare(`
      UPDATE payroll_records
      SET bonus = ?, other_deductions = ?, manual_adjustment = ?,
          adjustment_note = ?, base_salary = ?, allowances = ?,
          lesson_count = ?, lesson_amount = ?, hourly_rate = ?, hourly_amount = ?,
          commission_rate = ?, commission_amount = ?, net_salary = ?
      WHERE id = ?
    `).run(
      newBonus, newOther, newAdjust, adjustment_note || null,
      newBase, newAllow,
      newLessonCount, newLessonAmount, newHourlyRate, newHourlyAmount,
      newCommissionRate, newCommissionAmount, Math.round(net),
      req.params.id
    )

    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// ============================================
// POST - اعتماد راتب
// ============================================
router.post('/:id/approve', checkPermission('payroll.calculate'), (req, res) => {
  const db = getDB()
  db.prepare(`
    UPDATE payroll_records SET status = 'approved', approved_by = ? WHERE id = ?
  `).run(req.user.id, req.params.id)
  res.json({ success: true, message: 'تم الاعتماد' })
})

// ============================================
// POST - صرف راتب
// ============================================
router.post('/:id/pay', checkPermission('payroll.pay'), (req, res) => {
  const db = getDB()
  const { paid_method } = req.body
  db.prepare(`
    UPDATE payroll_records
    SET status = 'paid', paid_at = CURRENT_TIMESTAMP, paid_method = ?
    WHERE id = ?
  `).run(paid_method || 'cash', req.params.id)
  res.json({ success: true, message: 'تم الصرف' })
})

// ============================================
// POST - صرف جماعي
// ============================================
router.post('/pay-bulk', checkPermission('payroll.pay'), (req, res) => {
  const db = getDB()
  const { year, month, paid_method } = req.body
  const result = db.prepare(`
    UPDATE payroll_records
    SET status = 'paid', paid_at = CURRENT_TIMESTAMP, paid_method = ?
    WHERE year = ? AND month = ? AND status = 'approved'
  `).run(paid_method || 'cash', year, month)

  res.json({ success: true, message: `تم صرف ${result.changes} راتب` })
})

// ============================================
// GET - كشوف معلم
// ============================================
router.get('/teacher/:id', (req, res) => {
  const db = getDB()
  const teacherId = parseInt(req.params.id)

  if (req.user.role === 'teacher' && req.user.id !== teacherId) {
    return res.status(403).json({ success: false, error: 'لا يمكنك رؤية رواتب الآخرين' })
  }

  const records = db.prepare(`
    SELECT * FROM payroll_records
    WHERE teacher_id = ?
    ORDER BY year DESC, month DESC
  `).all(teacherId)

  for (const row of records) {
    try {
      row.rewards_list = row.rewards_data ? JSON.parse(row.rewards_data) : []
    } catch {
      row.rewards_list = []
    }
  }

  res.json({ success: true, data: records })
})

// ============================================
// DELETE
// ============================================
router.delete('/:id', checkPermission('payroll.calculate'), (req, res) => {
  const db = getDB()
  const record = db.prepare('SELECT status FROM payroll_records WHERE id = ?').get(req.params.id)
  if (!record) return res.status(404).json({ success: false, error: 'غير موجود' })
  if (record.status === 'paid') return res.status(400).json({ success: false, error: 'لا يمكن حذف راتب مدفوع' })

  db.prepare('DELETE FROM payroll_records WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: 'تم الحذف' })
})

export default router