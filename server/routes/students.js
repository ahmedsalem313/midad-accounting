import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET - كل الطلاب
router.get('/', checkPermission('students.view'), (req, res) => {
  const db = getDB()
  const { grade, section, status, search } = req.query

  let sql = 'SELECT * FROM students WHERE 1=1'
  const params = []

  if (grade) { sql += ' AND grade = ?'; params.push(grade) }
  if (section) { sql += ' AND section = ?'; params.push(section) }
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (search) {
    sql += ' AND (full_name LIKE ? OR guardian_name LIKE ? OR student_number LIKE ?)'
    const s = `%${search}%`
    params.push(s, s, s)
  }

  sql += ' ORDER BY grade, section, full_name'

  const students = db.prepare(sql).all(...params)
  res.json({ success: true, data: students })
})

// GET - طالب واحد
router.get('/:id', checkPermission('students.view'), (req, res) => {
  const db = getDB()
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)

  if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود' })

  // جلب المدفوعات
  const payments = db.prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC').all(req.params.id)
  const totalPaid = payments.reduce((sum, p) => sum + (p.paid_amount || 0), 0)

  // جلب الدرجات
  const grades = db.prepare('SELECT * FROM grades WHERE student_id = ? ORDER BY exam_date DESC').all(req.params.id)

  res.json({
    success: true,
    data: { ...student, payments, grades, totalPaid },
  })
})

// POST - إضافة طالب
router.post('/', checkPermission('students.create'), (req, res) => {
  try {
    const {
      student_number, full_name, grade, section, birth_date, gender,
      guardian_name, guardian_phone, guardian_phone_alt, address,
      enrollment_date, total_fees, notes
    } = req.body

    if (!full_name || !grade || !guardian_name || !guardian_phone) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال الحقول المطلوبة' })
    }

    const db = getDB()
    const result = db.prepare(`
      INSERT INTO students (
        student_number, full_name, grade, section, birth_date, gender,
        guardian_name, guardian_phone, guardian_phone_alt, address,
        enrollment_date, total_fees, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_number || null, full_name, grade, section || null,
      birth_date || null, gender || null, guardian_name, guardian_phone,
      guardian_phone_alt || null, address || null, enrollment_date || null,
      total_fees || 0, notes || null
    )

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: 'تم إضافة الطالب بنجاح',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// PUT - تعديل طالب
router.put('/:id', checkPermission('students.edit'), (req, res) => {
  try {
    const db = getDB()
    const fields = ['student_number', 'full_name', 'grade', 'section', 'birth_date',
      'gender', 'guardian_name', 'guardian_phone', 'guardian_phone_alt',
      'address', 'enrollment_date', 'total_fees', 'status', 'notes']

    const updates = []
    const values = []
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`)
        values.push(req.body[f])
      }
    }

    if (updates.length === 0) return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)

    db.prepare(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث بنجاح' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// DELETE - حذف طالب
router.delete('/:id', checkPermission('students.delete'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
  res.json({ success: true, message: 'تم الحذف بنجاح' })
})
// ============================================
// فحص حجب النتائج لطالب
// ============================================
router.get('/:id/check-block', authMiddleware, (req, res) => {
  const db = getDB()
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)

  if (!student) {
    return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
  }

  // ============================================
  // 1) هل المستخدم عنده صلاحية تجاوز الحجب؟
  // ============================================
  const user = req.user
  let canOverride = user.role === 'admin'

  if (!canOverride) {
    const perm = db.prepare(`
      SELECT 1 FROM user_permissions
      WHERE user_id = ? AND permission_code = 'grades.override_block'
    `).get(user.id)
    canOverride = !!perm
  }

  // ============================================
  // 2) إعدادات الحجب المالي
  // ============================================
  const getSetting = (key, def) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : def
  }

  const blockFinancial = getSetting('block_grades_enabled', 'false') === 'true'
  const minDebt = parseFloat(getSetting('block_grades_min_debt', '0')) || 0

  // حساب المتأخرات
  const totalPaid = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as t FROM payments WHERE student_id = ?
  `).get(student.id).t

  const remaining = (student.total_fees || 0) - totalPaid
  const financialBlock = blockFinancial && remaining >= minDebt && remaining > 0

  // ============================================
  // 3) حجب بسبب الغياب
  // ============================================
  const absenceLevel = student.absence_level || 0
  const absenceBlock = absenceLevel >= 3  // تعهد أو راسب
  const absenceCritical = absenceLevel >= 4  // راسب

  // ============================================
  // 4) تحديد الحجب النهائي
  // ============================================
  const wouldBlock = financialBlock || absenceBlock
  const isBlocked = wouldBlock && !canOverride

  // ============================================
  // 5) بناء سبب الحجب
  // ============================================
  const reasons = []
  if (financialBlock) {
    reasons.push(`متأخرات مالية: ${remaining.toLocaleString('ar-IQ')} د.ع`)
  }
  if (absenceBlock) {
    const absLabel = absenceLevel === 4 ? 'راسب بالغياب' : 'تعهد'
    reasons.push(`الغياب: ${absLabel} (${student.absence_total} يوم)`)
  }

  res.json({
    success: true,
    data: {
      isBlocked,
      wouldBlock,
      canOverride,
      
      // الحجب المالي
      financialBlock,
      blockEnabled: blockFinancial,
      minDebt,
      totalFees: student.total_fees || 0,
      totalPaid,
      remaining,
      
      // حجب الغياب
      absenceBlock,
      absenceCritical,
      absenceLevel,
      absenceTotal: student.absence_total || 0,
      absenceStreak: student.absence_streak || 0,
      absenceLabel: 
        absenceLevel === 4 ? 'راسب بالغياب' :
        absenceLevel === 3 ? 'تعهد' :
        absenceLevel === 2 ? 'إنذار ثاني' :
        absenceLevel === 1 ? 'إنذار أول' : 'نشط',
      
      reason: reasons.length > 0 ? reasons.join(' • ') : null,
    },
  })
})
// ============================================
// GET - أفضل طلاب في صف (بمعادلة مركبة)
// ============================================
router.get('/top/ranking', authMiddleware, (req, res) => {
  try {
    const db = getDB()
    const { grade, section, limit = 5 } = req.query

    // قراءة الإعدادات
    const getSetting = (key, def) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
      return row ? parseFloat(row.value) : def
    }

    const wGrades = getSetting('ranking_weight_grades', 70)
    const wAttendance = getSetting('ranking_weight_attendance', 20)
    const wBehavior = getSetting('ranking_weight_behavior', 10)
    const absenceWarning = getSetting('ranking_absence_warning', 30)
    const absenceExclude = getSetting('ranking_absence_exclude', 60)
    const absencePenalty = getSetting('ranking_absence_penalty', 10)

    // ⚠️ التحقق من الصلاحية
    const user = req.user
    let finalGrade = grade
    let finalSection = section

    if (user.role !== 'admin') {
      const fullUser = db.prepare('SELECT is_advisor, advisor_grade, advisor_section FROM users WHERE id = ?').get(user.id)

      if (!fullUser?.is_advisor) {
        return res.status(403).json({ success: false, error: 'لا يمكنك الوصول لهذه البيانات' })
      }

      finalGrade = fullUser.advisor_grade
      finalSection = fullUser.advisor_section

      if (grade && grade !== finalGrade) {
        return res.status(403).json({ success: false, error: 'لا يمكنك الوصول لهذا الصف' })
      }
    }

    if (!finalGrade) {
      return res.status(400).json({ success: false, error: 'الصف مطلوب' })
    }

    // ============================================
    // جلب الطلاب مع كل البيانات
    // ============================================
    let sql = `
      SELECT 
        s.id,
        s.full_name,
        s.student_code,
        s.grade,
        s.section,
        s.guardian_name,
        s.guardian_phone,
        s.absence_total,
        s.absence_streak,
        s.absence_level,
        s.absence_status,
        
        -- المعدل الأكاديمي
        COALESCE(AVG(
          CASE 
            WHEN g.max_score > 0 THEN (g.score / g.max_score) * 100
            ELSE NULL
          END
        ), 0) as academic_avg,
        COUNT(DISTINCT g.id) as grades_count,
        
        -- عدد أيام الحضور الكلي (من attendance)
        COALESCE((
          SELECT COUNT(*) 
          FROM student_attendance 
          WHERE student_id = s.id AND status IN ('present', 'late')
        ), 0) as present_days,
        
        COALESCE((
          SELECT COUNT(*) 
          FROM student_attendance 
          WHERE student_id = s.id
        ), 0) as total_attendance_records,
        
        -- تقييم السلوك (آخر تقييم)
        (
          SELECT rating 
          FROM behavior_evaluations 
          WHERE student_id = s.id 
          ORDER BY evaluated_at DESC 
          LIMIT 1
        ) as behavior_rating
        
      FROM students s
      LEFT JOIN grades g ON g.student_id = s.id
      WHERE s.status = 'active' AND s.grade = ?
    `
    const params = [finalGrade]

    if (finalSection) {
      sql += ' AND s.section = ?'
      params.push(finalSection)
    }

    sql += ' GROUP BY s.id'

    const rawStudents = db.prepare(sql).all(...params)

    // ============================================
    // حساب النتيجة المركبة
    // ============================================
    const behaviorScores = {
      'excellent':  100,
      'good':       85,
      'acceptable': 70,
      'poor':       40,
    }

    const ranked = rawStudents
      .map(s => {
        const academicScore = Math.round(s.academic_avg * 100) / 100
        const attendanceRate = s.total_attendance_records > 0
          ? Math.round((s.present_days / s.total_attendance_records) * 100)
          : 100
        const behaviorScore = s.behavior_rating ? (behaviorScores[s.behavior_rating] || 70) : 75 // افتراضي
        
        // النتيجة الأساسية
        const baseScore = 
          (academicScore * wGrades / 100) +
          (attendanceRate * wAttendance / 100) +
          (behaviorScore * wBehavior / 100)
        
        // نسبة الغياب (من الحد الأقصى للغياب = 20 يوم افتراضي)
        const totalDays = s.present_days + (s.absence_total || 0)
        const absenceRate = totalDays > 0 
          ? (s.absence_total / totalDays) * 100 
          : 0
        
        // خصم إذا تجاوز 30%
        let penalty = 0
        if (absenceRate >= absenceWarning && absenceRate < absenceExclude) {
          penalty = absencePenalty
        }
        
        // استبعاد إذا تجاوز 60%
        const excluded = absenceRate >= absenceExclude
        
        const finalScore = Math.max(0, Math.round((baseScore - penalty) * 100) / 100)
        
        return {
          id: s.id,
          full_name: s.full_name,
          student_code: s.student_code,
          grade: s.grade,
          section: s.section,
          guardian_name: s.guardian_name,
          guardian_phone: s.guardian_phone,
          
          // تفاصيل النقاط
          academic_avg: academicScore,
          attendance_rate: attendanceRate,
          behavior_rating: s.behavior_rating,
          behavior_score: behaviorScore,
          
          // الغياب
          absence_total: s.absence_total || 0,
          absence_rate: Math.round(absenceRate * 10) / 10,
          penalty: penalty,
          excluded: excluded,
          
          // النتيجة النهائية
          base_score: Math.round(baseScore * 100) / 100,
          final_score: finalScore,
          grades_count: s.grades_count,
        }
      })
      .filter(s => !s.excluded) // استبعاد المفرطين
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, parseInt(limit))
      .map((s, i) => ({
        ...s,
        rank: i + 1,
        medal: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null,
      }))

    res.json({
      success: true,
      data: ranked,
      grade: finalGrade,
      section: finalSection,
      weights: {
        grades: wGrades,
        attendance: wAttendance,
        behavior: wBehavior,
      },
      thresholds: {
        warning: absenceWarning,
        exclude: absenceExclude,
        penalty: absencePenalty,
      },
    })
  } catch (error) {
    console.error('GET /students/top/ranking error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
export default router