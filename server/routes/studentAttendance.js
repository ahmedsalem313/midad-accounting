import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import {
  recordAbsence,
  recordAttendance as recordStudentAttendance,
  calculateAbsenceLevel,
  cancelWarning,
  recalculateStudent,
} from '../services/absenceLogic.js'
const router = express.Router()
router.use(authMiddleware)
// ============================================
// دوال مساعدة للتحقق من صلاحية المستخدم
// ============================================

// هل المستخدم مدير؟
function isAdmin(user) {
  return user.role === 'admin'
}

// ما هي الصفوف المسموحة لهذا المستخدم؟
function getAllowedClasses(db, user) {
  // المدير يرى الكل
  if (isAdmin(user)) return null // null = الكل

  // المرشد يرى صفه (أو صفوفه)
  const fullUser = db.prepare('SELECT is_advisor, advisor_grade, advisor_section FROM users WHERE id = ?').get(user.id)
  
  if (!fullUser?.is_advisor) {
    return [] // لا صفوف مسموحة
  }

  return [{
    grade: fullUser.advisor_grade,
    section: fullUser.advisor_section || null, // null = كل الشعب
  }]
}

// هل يمكن لهذا المستخدم الوصول لهذا الصف/الشعبة؟
function canAccessClass(db, user, grade, section) {
  if (isAdmin(user)) return true

  const allowed = getAllowedClasses(db, user)
  if (allowed.length === 0) return false

  for (const cls of allowed) {
    if (cls.grade === grade) {
      if (cls.section === null || cls.section === section) return true
    }
  }
  return false
}
// ============================================
// GET - حضور صف معين في تاريخ
// ============================================
router.get('/class', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const { grade, section, date, session = 'morning' } = req.query

  if (!date) {
    return res.status(400).json({ success: false, error: 'التاريخ مطلوب' })
  }

  // ⚠️ التحقق من صلاحية الوصول لهذا الصف
  if (grade && !canAccessClass(db, req.user, grade, section)) {
    return res.status(403).json({ 
      success: false, 
      error: 'لا يمكنك الوصول لهذا الصف' 
    })
  }

  // إذا لم يُحدَّد صف → خذ صف المرشد
  let finalGrade = grade
  let finalSection = section

  if (!finalGrade && !isAdmin(req.user)) {
    const allowed = getAllowedClasses(db, req.user)
    if (allowed.length === 0) {
      return res.json({ success: true, data: [] })
    }
    finalGrade = allowed[0].grade
    finalSection = allowed[0].section
  }

  let sql = `
    SELECT 
      s.id as student_id,
      s.full_name,
      s.grade,
      s.section,
      s.student_code,
      a.id,
      a.status,
      a.check_in_time,
      a.late_minutes,
      a.notes
    FROM students s
    LEFT JOIN student_attendance a 
      ON a.student_id = s.id 
      AND a.date = ? 
      AND a.session = ?
    WHERE s.status = 'active'
  `
  const params = [date, session]

  if (finalGrade) { sql += ' AND s.grade = ?'; params.push(finalGrade) }
  if (finalSection) { sql += ' AND s.section = ?'; params.push(finalSection) }

  sql += ' ORDER BY s.full_name'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// ============================================
// POST - تسجيل حضور طالب واحد
// ============================================
router.post('/mark', checkPermission('attendance.mark'), (req, res) => {
  try {
    const { student_id, date, session = 'morning', status = 'present', notes } = req.body

    if (!student_id || !date) {
      return res.status(400).json({ success: false, error: 'البيانات ناقصة' })
    }

    const db = getDB()

    // ⚠️ التحقق: هل يمكن للمستخدم الوصول لهذا الطالب؟
    const student = db.prepare('SELECT grade, section FROM students WHERE id = ?').get(student_id)
    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    }

    if (!canAccessClass(db, req.user, student.grade, student.section)) {
      return res.status(403).json({ 
        success: false, 
        error: 'لا يمكنك تسجيل حضور لهذا الطالب' 
      })

    }

    const now = new Date()
    const checkInTime = now.toTimeString().substring(0, 5)

    // حساب التأخير
    const settingKey = session === 'morning'
      ? 'school_start_time_morning'
      : 'school_start_time_afternoon'
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(settingKey)
    const startTime = setting?.value || (session === 'morning' ? '08:00' : '13:00')

    let lateMinutes = 0
    if (status === 'late') {
      const [sh, sm] = startTime.split(':').map(Number)
      const [ch, cm] = checkInTime.split(':').map(Number)
      lateMinutes = Math.max(0, (ch * 60 + cm) - (sh * 60 + sm))
    }

    // حفظ السجل
    db.prepare(`
      INSERT INTO student_attendance (
        student_id, date, session, status, check_in_time, late_minutes, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, date, session) DO UPDATE SET
        status = excluded.status,
        check_in_time = excluded.check_in_time,
        late_minutes = excluded.late_minutes,
        notes = excluded.notes,
        recorded_by = excluded.recorded_by
    `).run(
      student_id, date, session, status, checkInTime, lateMinutes, notes || null, req.user.id
    )

    // ============================================
    // منطق الغياب التلقائي (الحصة الصباحية فقط)
    // ============================================
    let absenceResult = null
    if (session === 'morning') {
      if (status === 'absent') {
        absenceResult = recordAbsence(student_id, date)
      } else if (status === 'present' || status === 'late') {
        recordStudentAttendance(student_id)
      }
      // إذا excused → لا تغيير
    }

    res.json({
      success: true,
      message: 'تم التسجيل',
      warning: absenceResult?.isNewWarning ? absenceResult.levelInfo : null,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - تسجيل جماعي لصف كامل
// ============================================
router.post('/bulk', checkPermission('attendance.mark'), (req, res) => {
  try {
    const { date, session = 'morning', students } = req.body

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد بيانات' })
    }

    const db = getDB()
    const insert = db.prepare(`
      INSERT INTO student_attendance (
        student_id, date, session, status, late_minutes, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, date, session) DO UPDATE SET
        status = excluded.status,
        late_minutes = excluded.late_minutes,
        notes = excluded.notes,
        recorded_by = excluded.recorded_by
    `)

      const tx = db.transaction((list) => {
      for (const s of list) {
        insert.run(
          s.student_id, date, session, s.status || 'present',
          s.late_minutes || 0, s.notes || null, req.user.id
        )
      }
    })
    tx(students)

    // ============================================
    // منطق الغياب التلقائي (الحصة الصباحية فقط)
    // ============================================
    const warnings = []
    if (session === 'morning') {
      for (const s of students) {
        let result = null
        if (s.status === 'absent') {
          result = recordAbsence(s.student_id, date)
        } else if (s.status === 'present' || s.status === 'late') {
          recordStudentAttendance(s.student_id)
        }
        if (result?.isNewWarning) {
          warnings.push(result)
        }
      }
    }

    res.json({
      success: true,
      message: `تم تسجيل ${students.length} طالب`,
      warnings,
      warningsCount: warnings.length,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - تقرير حضور طالب
// ============================================
router.get('/student/:id/report', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const { from_date, to_date } = req.query

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
  if (!student) {
    return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
  }

  let sql = `
    SELECT date, session, status, check_in_time, late_minutes, notes
    FROM student_attendance
    WHERE student_id = ?
  `
  const params = [req.params.id]

  if (from_date) { sql += ' AND date >= ?'; params.push(from_date) }
  if (to_date) { sql += ' AND date <= ?'; params.push(to_date) }

  sql += ' ORDER BY date DESC, session'

  const records = db.prepare(sql).all(...params)

  // الإحصائيات
  const stats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
    total: records.length,
    totalLateMinutes: records.reduce((s, r) => s + (r.late_minutes || 0), 0),
  }

  // الحد الأقصى للغياب
  const defaultLimit = db.prepare("SELECT value FROM settings WHERE key = 'absence_limit_default'").get()
  const absenceLimit = student.absence_limit || parseInt(defaultLimit?.value) || 20

  stats.absenceLimit = absenceLimit
  stats.remaining = Math.max(0, absenceLimit - stats.absent)
  stats.warningLevel = stats.absent >= absenceLimit * 0.75 ? 'high' 
                     : stats.absent >= absenceLimit * 0.5 ? 'medium' 
                     : 'low'

  res.json({
    success: true,
    data: { student, records, stats },
  })
})

/// ============================================
// GET - تقرير حضور شامل للصف (مُفلتر حسب الصلاحيات)
// ============================================
router.get('/class/report', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const { grade, section, from_date, to_date } = req.query

  if (!from_date || !to_date) {
    return res.status(400).json({ success: false, error: 'الفترة مطلوبة' })
  }

  // ⚠️ التحقق من الصلاحيات
  let finalGrade = grade
  let finalSection = section

  // إذا كان المستخدم مرشداً (وليس مديراً) → قيّد لصفه فقط
  if (!isAdmin(req.user)) {
    const allowed = getAllowedClasses(db, req.user)
    
    if (allowed.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'ليس لديك صلاحية لعرض التقارير' 
      })
    }

    // تجاهل ما أرسله المستخدم — استخدم صف المرشد
    finalGrade = allowed[0].grade
    finalSection = allowed[0].section

    // ⚠️ تحقق: هل يطلب صفاً غير مسموح؟
    if (grade && grade !== finalGrade) {
      return res.status(403).json({ 
        success: false, 
        error: 'لا يمكنك الوصول لهذا الصف' 
      })
    }
  }

  let sql = `
    SELECT
      s.id, s.full_name, s.student_code, s.grade, s.section,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
      COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_days,
      COALESCE(SUM(a.late_minutes), 0) as total_late_minutes
    FROM students s
    LEFT JOIN student_attendance a 
      ON a.student_id = s.id 
      AND a.date BETWEEN ? AND ?
    WHERE s.status = 'active'
  `
  const params = [from_date, to_date]

  if (finalGrade) { sql += ' AND s.grade = ?'; params.push(finalGrade) }
  if (finalSection) { sql += ' AND s.section = ?'; params.push(finalSection) }

  sql += ' GROUP BY s.id ORDER BY s.section, s.full_name'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// ============================================
// GET - إحصائيات اليوم
// ============================================
router.get('/stats/today', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const today = new Date().toISOString().split('T')[0]

  const stats = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused,
      COUNT(*) as total
    FROM student_attendance
    WHERE date = ?
  `).get(today)

  res.json({ success: true, data: stats })
})

// ============================================
// GET - الطلاب المتجاوزين للحد
// ============================================
router.get('/warnings', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()

  const defaultLimit = db.prepare("SELECT value FROM settings WHERE key = 'absence_limit_default'").get()
  const defaultLimitNum = parseInt(defaultLimit?.value) || 20

  const rows = db.prepare(`
    SELECT
      s.id, s.full_name, s.grade, s.section, s.guardian_name, s.guardian_phone,
      COALESCE(s.absence_limit, ?) as absence_limit,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days
    FROM students s
    LEFT JOIN student_attendance a ON a.student_id = s.id
    WHERE s.status = 'active'
    GROUP BY s.id
    HAVING absent_days >= (COALESCE(s.absence_limit, ?) * 0.75)
    ORDER BY absent_days DESC
  `).all(defaultLimitNum, defaultLimitNum)

  const students = rows.map(r => ({
    ...r,
    remaining: Math.max(0, r.absence_limit - r.absent_days),
    percent: Math.round((r.absent_days / r.absence_limit) * 100),
    status: r.absent_days >= r.absence_limit ? 'critical'
          : r.absent_days >= r.absence_limit * 0.75 ? 'warning'
          : 'normal',
  }))

  res.json({ success: true, data: students })
})
// ============================================
// GET - حالة غياب طالب
// ============================================
router.get('/absence-status/:studentId', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.studentId)

  if (!student) {
    return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
  }

  const levelInfo = calculateAbsenceLevel(student)

  res.json({
    success: true,
    data: {
      student_id: student.id,
      full_name: student.full_name,
      absence_total: student.absence_total || 0,
      absence_streak: student.absence_streak || 0,
      absence_level: student.absence_level || 0,
      absence_status: student.absence_status || 'active',
      level_info: levelInfo,
    },
  })
})

// ============================================
// GET - سجل الإنذارات لطالب
// ============================================
router.get('/warnings/:studentId', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()

  const warnings = db.prepare(`
    SELECT w.*, 
           u1.full_name as issued_by_name,
           u2.full_name as cancelled_by_name
    FROM absence_warnings w
    LEFT JOIN users u1 ON u1.id = w.issued_by
    LEFT JOIN users u2 ON u2.id = w.cancelled_by
    WHERE w.student_id = ?
    ORDER BY w.issued_at DESC
  `).all(req.params.studentId)

  res.json({ success: true, data: warnings })
})

// ============================================
// POST - إلغاء إنذار (للمدير)
// ============================================
router.post('/warnings/:id/cancel', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const { reason } = req.body
    const result = cancelWarning(req.params.id, req.user.id, reason)
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إعادة حساب غياب طالب (للمدير)
// ============================================
router.post('/recalculate/:studentId', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const result = recalculateStudent(req.params.studentId)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - قائمة الطلاب المهددين (على وشك الفصل)
// ============================================
router.get('/danger-zone', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()

  const students = db.prepare(`
    SELECT 
      s.id, s.full_name, s.grade, s.section, s.guardian_name, s.guardian_phone,
      s.absence_total, s.absence_streak, s.absence_level, s.absence_status
    FROM students s
    WHERE s.status = 'active' AND s.absence_level >= 2
    ORDER BY s.absence_level DESC, s.absence_total DESC
  `).all()

  const byLevel = {}
  for (const s of students) {
    if (!byLevel[s.absence_level]) byLevel[s.absence_level] = []
    byLevel[s.absence_level].push(s)
  }

  res.json({
    success: true,
    data: {
      students,
      byLevel,
      total: students.length,
    },
  })
})
// ============================================
// GET - سجلات غياب طالب (للإدارة)
// ============================================
router.get('/absence/:studentId', checkPermission('attendance.view'), (req, res) => {
  try {
    const db = getDB()
    const { studentId } = req.params

    // التحقق من الصلاحية
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    }

    if (!canAccessClass(db, req.user, student.grade, student.section)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك الوصول لهذا الطالب' })
    }

    // كل سجلات الحضور/الغياب
    const records = db.prepare(`
      SELECT 
        id, date, session, status, check_in_time, late_minutes, notes, recorded_by,
        (SELECT full_name FROM users WHERE id = recorded_by) as recorded_by_name
      FROM student_attendance
      WHERE student_id = ?
      ORDER BY date DESC, session
    `).all(studentId)

    // إحصائيات
    const stats = {
      total: student.absence_total || 0,
      streak: student.absence_streak || 0,
      level: student.absence_level || 0,
      status: student.absence_status || 'active',
      records_count: records.length,
      absent_count: records.filter(r => r.status === 'absent').length,
      present_count: records.filter(r => r.status === 'present').length,
      late_count: records.filter(r => r.status === 'late').length,
      excused_count: records.filter(r => r.status === 'excused').length,
    }

    res.json({
      success: true,
      data: {
        student,
        records,
        stats,
      },
    })
  } catch (error) {
    console.error('GET /absence/:studentId error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إضافة غياب يدوي
// ============================================
router.post('/absence/:studentId/add', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const db = getDB()
    const { studentId } = req.params
    const { date, session = 'morning', status = 'absent', notes } = req.body

    if (!date) {
      return res.status(400).json({ success: false, error: 'التاريخ مطلوب' })
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    }

    if (!canAccessClass(db, req.user, student.grade, student.section)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك التعديل' })
    }

    // فحص التكرار
    const existing = db.prepare(`
      SELECT id FROM student_attendance
      WHERE student_id = ? AND date = ? AND session = ?
    `).get(studentId, date, session)

    if (existing) {
      return res.status(400).json({ success: false, error: 'يوجد سجل لنفس التاريخ والحصة' })
    }

    const result = db.prepare(`
      INSERT INTO student_attendance (
        student_id, date, session, status, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(studentId, date, session, status, notes || 'إضافة يدوية', req.user.id)

    // إعادة حساب الغيابات
    const recalc = recalculateStudent(studentId)

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid, recalc },
      message: 'تم إضافة السجل وإعادة الحساب',
    })
  } catch (error) {
    console.error('POST /absence/add error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT - تعديل يوم غياب
// ============================================
router.put('/absence/record/:recordId', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const db = getDB()
    const { recordId } = req.params
    const { status, notes, check_in_time, late_minutes } = req.body

    const record = db.prepare('SELECT * FROM student_attendance WHERE id = ?').get(recordId)
    if (!record) {
      return res.status(404).json({ success: false, error: 'السجل غير موجود' })
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(record.student_id)
    if (!canAccessClass(db, req.user, student.grade, student.section)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك التعديل' })
    }

    const updates = []
    const values = []

    if (status !== undefined) { updates.push('status = ?'); values.push(status) }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes) }
    if (check_in_time !== undefined) { updates.push('check_in_time = ?'); values.push(check_in_time) }
    if (late_minutes !== undefined) { updates.push('late_minutes = ?'); values.push(late_minutes) }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    }

    values.push(recordId)
    db.prepare(`UPDATE student_attendance SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    // إعادة حساب
    const recalc = recalculateStudent(record.student_id)

    res.json({
      success: true,
      data: { recalc },
      message: 'تم التحديث وإعادة الحساب',
    })
  } catch (error) {
    console.error('PUT /absence/record error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - حذف سجل غياب واحد
// ============================================
router.delete('/absence/record/:recordId', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const db = getDB()
    const record = db.prepare('SELECT * FROM student_attendance WHERE id = ?').get(req.params.recordId)

    if (!record) {
      return res.status(404).json({ success: false, error: 'السجل غير موجود' })
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(record.student_id)
    if (!canAccessClass(db, req.user, student.grade, student.section)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك الحذف' })
    }

    db.prepare('DELETE FROM student_attendance WHERE id = ?').run(req.params.recordId)

    // إعادة حساب
    const recalc = recalculateStudent(record.student_id)

    res.json({
      success: true,
      data: { recalc },
      message: 'تم الحذف وإعادة الحساب',
    })
  } catch (error) {
    console.error('DELETE /absence/record error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - محو كل غيابات طالب
// ============================================
router.delete('/absence/:studentId/clear', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const db = getDB()
    const { studentId } = req.params

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    }

    if (!canAccessClass(db, req.user, student.grade, student.section)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك الحذف' })
    }

    // فقط المدير يمكنه محو كل شيء
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'فقط المدير يمكنه المحو الكامل' })
    }

    // حذف كل السجلات
    const result = db.prepare('DELETE FROM student_attendance WHERE student_id = ?').run(studentId)

    // حذف الإنذارات المرتبطة
    db.prepare('DELETE FROM absence_warnings WHERE student_id = ?').run(studentId)

    // تصفير العدادات
    db.prepare(`
      UPDATE students
      SET absence_total = 0,
          absence_streak = 0,
          absence_level = 0,
          absence_status = 'active',
          last_absence_date = NULL
      WHERE id = ?
    `).run(studentId)

    res.json({
      success: true,
      message: `تم محو ${result.changes} سجل غياب`,
      cleared: result.changes,
    })
  } catch (error) {
    console.error('DELETE /absence/clear error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إعادة حساب (موجود مسبقاً، لكن نستخدمه)
// ============================================
// (المسار الموجود: /recalculate/:studentId)
export default router