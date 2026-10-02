import express from 'express'
import { getDB } from '../database/db.js'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

const router = express.Router()

// ============================================
// POST /api/parent/login
// دخول ولي الأمر برقم الهاتف
// ============================================
router.post('/login', (req, res) => {
  try {
    const { phone } = req.body

    if (!phone || phone.length < 8) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رقم هاتف صحيح' })
    }

    // تنظيف الرقم
    const cleanPhone = phone.replace(/[^\d]/g, '')

    const db = getDB()

    // البحث عن طلاب بنفس رقم ولي الأمر
    const students = db.prepare(`
      SELECT id, full_name, grade, section, guardian_name, guardian_phone,
             student_code, status
      FROM students
      WHERE (guardian_phone = ? OR guardian_phone_alt = ?)
        AND status = 'active'
      ORDER BY full_name
    `).all(cleanPhone, cleanPhone)

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'لا يوجد طالب مسجل بهذا الرقم. تواصل مع إدارة المدرسة.',
      })
    }

    // إنشاء توكن مؤقت
    const token = jwt.sign(
      {
        type: 'parent',
        phone: cleanPhone,
        studentIds: students.map(s => s.id),
      },
      config.jwt.secret,
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      data: {
        token,
        phone: cleanPhone,
        students: students.map(s => ({
          id: s.id,
          full_name: s.full_name,
          grade: s.grade,
          section: s.section,
          student_code: s.student_code,
          guardian_name: s.guardian_name,
        })),
      },
    })
  } catch (error) {
    console.error('Parent login error:', error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// ============================================
// Middleware للتحقق من ولي الأمر
// ============================================
function parentAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'غير مصرح' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.jwt.secret)

    if (decoded.type !== 'parent') {
      return res.status(401).json({ success: false, error: 'توكن غير صالح' })
    }

    req.parent = decoded
    next()
  } catch (error) {
    return res.status(401).json({ success: false, error: 'انتهت الجلسة' })
  }
}

// ============================================
// GET /api/parent/student/:id
// بيانات كاملة لطالب واحد
// ============================================
router.get('/student/:id', parentAuth, (req, res) => {
  try {
    const studentId = parseInt(req.params.id)

    // التحقق أن الطالب ضمن أبناء ولي الأمر
    if (!req.parent.studentIds.includes(studentId)) {
      return res.status(403).json({ success: false, error: 'غير مصرح' })
    }

    const db = getDB()

    const student = db.prepare(`
  SELECT id, full_name, grade, section, student_code,
         guardian_name, guardian_phone, total_fees, status, created_at,
         absence_total, absence_streak, absence_level, absence_status
  FROM students WHERE id = ?
`).get(studentId)

    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    }

    // ============================================
    // فحص الحجب
    // ============================================
    const getSetting = (key, def) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
      return row ? row.value : def
    }

    // حجب مالي
    const blockFinancial = getSetting('block_grades_enabled', 'false') === 'true'
    const minDebt = parseFloat(getSetting('block_grades_min_debt', '0')) || 0

    // حجب أكاديمي (غياب)
    const absenceLevel = student.absence_level || 0
    const absenceBlock = absenceLevel >= 3

    // ============================================
    // 1) الأقساط (دائماً مرئية)
    // ============================================
    const payments = db.prepare(`
      SELECT id, amount, paid_amount, payment_date, method, receipt_number, notes
      FROM payments
      WHERE student_id = ?
      ORDER BY payment_date ASC
    `).all(studentId)

    const totalPaid = payments.reduce((s, p) => s + (p.paid_amount || 0), 0)
    const totalFees = student.total_fees || 0
    const remaining = totalFees - totalPaid

    const financialBlock = blockFinancial && remaining >= minDebt && remaining > 0

    // ============================================
    // 2) الدرجات (قد تُحجب)
    // ============================================
    let grades = []
    let gradesBlocked = false
    let gradesBlockReason = null

    if (absenceBlock || financialBlock) {
      gradesBlocked = true
      const reasons = []
      if (absenceBlock) {
        reasons.push(
          absenceLevel === 4
            ? `راسب بالغياب (${student.absence_total} يوم)`
            : `تعهد (${student.absence_total} يوم)`
        )
      }
      if (financialBlock) {
        reasons.push(`متأخرات مالية: ${remaining.toLocaleString('ar-IQ')} د.ع`)
      }
      gradesBlockReason = reasons.join(' • ')
    } else {
      grades = db.prepare(`
        SELECT subject, exam_type, score, max_score, exam_date, semester, components
        FROM grades
        WHERE student_id = ?
        ORDER BY exam_date DESC, subject
      `).all(studentId)
    }

    // ============================================
    // 3) الحضور (دائماً مرئي)
    // ============================================
    const attendance = db.prepare(`
      SELECT date, session, status, check_in_time, notes
      FROM student_attendance
      WHERE student_id = ?
      ORDER BY date DESC
      LIMIT 60
    `).all(studentId)

    const attendanceStats = {
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      excused: attendance.filter(a => a.status === 'excused').length,
      total: attendance.length,
    }
// ============================================
// 3.5) الملاحظات العامة (المرئية لولي الأمر)
// ============================================
const publicNotes = db.prepare(`
  SELECT 
    n.id,
    n.category,
    n.title,
    n.content,
    n.is_pinned,
    n.created_at,
    u.full_name as teacher_name
  FROM student_notes n
  JOIN users u ON u.id = n.teacher_id
  WHERE n.student_id = ? AND n.is_public = 1
  ORDER BY n.is_pinned DESC, n.created_at DESC
`).all(studentId)
// ============================================
// 3.6) سجل التواصل (مع ولي الأمر نفسه)
// ============================================
const communications = db.prepare(`
  SELECT 
    c.id,
    c.type,
    c.subject,
    c.reason,
    c.result,
    c.result_status,
    c.communication_date,
    c.follow_up_date,
    u.full_name as teacher_name
  FROM communications c
  JOIN users u ON u.id = c.teacher_id
  WHERE c.student_id = ?
  ORDER BY c.communication_date DESC
`).all(studentId)

    // ============================================
    // 4) السلوك (يُحجب مع الدرجات؟) — لا، دائماً مرئي
    // ============================================
    const behavior = db.prepare(`
      SELECT id, rating, note, evaluated_at, evaluator_id
      FROM behavior_evaluations
      WHERE student_id = ?
      ORDER BY evaluated_at DESC
      LIMIT 10
    `).all(studentId)

    // ============================================
    // 5) سجل الإنذارات
    // ============================================
    const warnings = db.prepare(`
      SELECT id, level, reason, absence_total, absence_streak, issued_at
      FROM absence_warnings
      WHERE student_id = ? AND cancelled = 0
      ORDER BY issued_at DESC
    `).all(studentId)

    // ============================================
    // 6) اسم المدرسة
    // ============================================
    const schoolRow = db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get()
    const schoolName = schoolRow?.value || 'مداد المحاسبي'

    res.json({
  success: true,
  data: {
    student,
    fees: {
      totalFees,
      totalPaid,
      remaining,
      payments,
      collectionRate: totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0,
    },
    grades,
    gradesBlocked,
    gradesBlockReason,
    attendance,
    attendanceStats,
    behavior,
    warnings,
    publicNotes,
     communications,
    schoolName,
  },
})
  } catch (error) {
    console.error('Parent dashboard error:', error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})
export default router