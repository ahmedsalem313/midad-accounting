import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// دوال مساعدة
// ============================================
function isAdmin(user) {
  return user.role === 'admin'
}

function getAllowedClasses(db, user) {
  if (isAdmin(user)) return null // الكل
  const fullUser = db.prepare('SELECT is_advisor, advisor_grade, advisor_section FROM users WHERE id = ?').get(user.id)
  if (!fullUser?.is_advisor) return []
  return [{
    grade: fullUser.advisor_grade,
    section: fullUser.advisor_section || null,
  }]
}

// ============================================
// GET - كل الواجبات
// ============================================
router.get('/', checkPermission('assignments.view'), (req, res) => {
  try {
    const db = getDB()
    const { grade, section, subject, teacher_id, from_date, to_date } = req.query

    let sql = `
      SELECT 
        a.*,
        u.full_name as teacher_name,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as total_students,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND status = 'submitted') as submitted_count,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND status = 'late') as late_count,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND status = 'not_submitted') as not_submitted_count
      FROM assignments a
      JOIN users u ON u.id = a.teacher_id
      WHERE 1=1
    `
    const params = []

    // تقييد المرشد بصفه
    if (!isAdmin(req.user)) {
      const allowed = getAllowedClasses(db, req.user)
      if (allowed.length === 0) {
        return res.json({ success: true, data: [] })
      }
      const cls = allowed[0]
      sql += ' AND a.grade = ?'
      params.push(cls.grade)
      if (cls.section) {
        sql += ' AND a.section = ?'
        params.push(cls.section)
      }
    } else {
      if (grade) { sql += ' AND a.grade = ?'; params.push(grade) }
      if (section) { sql += ' AND a.section = ?'; params.push(section) }
    }

    if (subject) { sql += ' AND a.subject = ?'; params.push(subject) }
    if (teacher_id) { sql += ' AND a.teacher_id = ?'; params.push(teacher_id) }
    if (from_date) { sql += ' AND a.due_date >= ?'; params.push(from_date) }
    if (to_date) { sql += ' AND a.due_date <= ?'; params.push(to_date) }

    sql += ' ORDER BY a.due_date DESC, a.id DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GET /assignments error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - واجب واحد + قائمة الطلاب
// ============================================
router.get('/:id', checkPermission('assignments.view'), (req, res) => {
  try {
    const db = getDB()
    const assignment = db.prepare(`
      SELECT a.*, u.full_name as teacher_name
      FROM assignments a
      JOIN users u ON u.id = a.teacher_id
      WHERE a.id = ?
    `).get(req.params.id)

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'الواجب غير موجود' })
    }

    // ⚠️ التحقق من الصلاحية
    if (!isAdmin(req.user)) {
      const allowed = getAllowedClasses(db, req.user)
      const canAccess = allowed.some(c => 
        c.grade === assignment.grade && 
        (!c.section || c.section === assignment.section)
      )
      if (!canAccess) {
        return res.status(403).json({ success: false, error: 'لا يمكنك الوصول لهذا الواجب' })
      }
    }

    // قائمة الطلاب في الصف + حالة التسليم
    let studentsSql = `
      SELECT 
        s.id as student_id,
        s.full_name,
        s.student_code,
        s.section,
        sub.id as submission_id,
        sub.status,
        sub.score,
        sub.submitted_at,
        sub.notes
      FROM students s
      LEFT JOIN assignment_submissions sub 
        ON sub.student_id = s.id AND sub.assignment_id = ?
      WHERE s.status = 'active' AND s.grade = ?
    `
    const studentsParams = [assignment.id, assignment.grade]

    if (assignment.section) {
      studentsSql += ' AND s.section = ?'
      studentsParams.push(assignment.section)
    }

    studentsSql += ' ORDER BY s.full_name'

    const students = db.prepare(studentsSql).all(...studentsParams)

    // إحصائيات
    const stats = {
      total: students.length,
      submitted: students.filter(s => s.status === 'submitted').length,
      late: students.filter(s => s.status === 'late').length,
      not_submitted: students.filter(s => s.status === 'not_submitted').length,
      pending: students.filter(s => !s.status || s.status === 'pending').length,
      avg_score: (() => {
        const scored = students.filter(s => s.score !== null && s.score !== undefined)
        if (scored.length === 0) return 0
        return Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length)
      })(),
    }

    res.json({ success: true, data: { assignment, students, stats } })
  } catch (error) {
    console.error('GET /assignments/:id error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إنشاء واجب جديد
// ============================================
router.post('/', checkPermission('assignments.create'), (req, res) => {
  try {
    // ⚠️ منع المدير من إنشاء الواجبات
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'الواجبات يُنشئها المعلمون فقط',
      })
    }

    const { title, description, grade, section, subject, due_date, max_score, academic_year } = req.body

    if (!title || !grade || !subject || !due_date) {
      return res.status(400).json({ success: false, error: 'يرجى ملء الحقول المطلوبة' })
    }

    const db = getDB()
    const result = db.prepare(`
      INSERT INTO assignments (
        title, description, grade, section, subject,
        teacher_id, due_date, max_score, academic_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description || null, grade, section || null, subject,
      req.user.id, due_date, max_score || 100, academic_year || '2026-2027'
    )

    // إضافة صفوف فارغة للطلاب في assignment_submissions
    const assignmentId = result.lastInsertRowid

    let studentsSql = `SELECT id FROM students WHERE status = 'active' AND grade = ?`
    const studentsParams = [grade]
    if (section) {
      studentsSql += ' AND section = ?'
      studentsParams.push(section)
    }

    const students = db.prepare(studentsSql).all(...studentsParams)

    const insertSubmission = db.prepare(`
      INSERT OR IGNORE INTO assignment_submissions (assignment_id, student_id, status)
      VALUES (?, ?, 'pending')
    `)

    const tx = db.transaction((list) => {
      for (const s of list) insertSubmission.run(assignmentId, s.id)
    })
    tx(students)

    res.status(201).json({
      success: true,
      data: { id: assignmentId, students_count: students.length },
      message: `تم إنشاء الواجب لـ ${students.length} طالب`,
    })
  } catch (error) {
    console.error('POST /assignments error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT - تعديل واجب
// ============================================
router.put('/:id', checkPermission('assignments.edit'), (req, res) => {
  try {
    const { title, description, due_date, max_score } = req.body
    const db = getDB()

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id)
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'الواجب غير موجود' })
    }

    // فقط المُنشئ أو المدير
    if (assignment.teacher_id !== req.user.id) {
  return res.status(403).json({
    success: false,
    error: 'لا يمكنك تعديل/حذف واجب لا يخصك',
  })
}
    const updates = []
    const values = []

    if (title !== undefined) { updates.push('title = ?'); values.push(title) }
    if (description !== undefined) { updates.push('description = ?'); values.push(description) }
    if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date) }
    if (max_score !== undefined) { updates.push('max_score = ?'); values.push(max_score) }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)

    db.prepare(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - تسجيل تسليم طالب
// ============================================
router.post('/:id/submit/:studentId', checkPermission('assignments.grade'), (req, res) => {
  try {
    const { status, score, notes } = req.body
    const { id: assignmentId, studentId } = req.params

    if (!['submitted', 'late', 'not_submitted', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'حالة غير صالحة' })
    }

    const db = getDB()

    // إدراج أو تحديث
    const existing = db.prepare(`
      SELECT id FROM assignment_submissions 
      WHERE assignment_id = ? AND student_id = ?
    `).get(assignmentId, studentId)

    if (existing) {
      db.prepare(`
        UPDATE assignment_submissions 
        SET status = ?, score = ?, notes = ?, 
            submitted_at = CASE WHEN ? IN ('submitted', 'late') THEN CURRENT_TIMESTAMP ELSE submitted_at END,
            graded_by = ?, graded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, score || null, notes || null, status, req.user.id, existing.id)
    } else {
      db.prepare(`
        INSERT INTO assignment_submissions (
          assignment_id, student_id, status, score, notes, graded_by, graded_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(assignmentId, studentId, status, score || null, notes || null, req.user.id)
    }

    res.json({ success: true, message: 'تم الحفظ' })
  } catch (error) {
    console.error('POST /assignments/:id/submit error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - حفظ جماعي (كل الطلاب)
// ============================================
router.post('/:id/bulk-submit', checkPermission('assignments.grade'), (req, res) => {
  try {
    const { students } = req.body
    const assignmentId = req.params.id

    if (!Array.isArray(students)) {
      return res.status(400).json({ success: false, error: 'البيانات غير صحيحة' })
    }

    const db = getDB()
    const upsert = db.prepare(`
      INSERT INTO assignment_submissions (
        assignment_id, student_id, status, score, notes, graded_by, graded_at, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CASE WHEN ? IN ('submitted', 'late') THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT(assignment_id, student_id) DO UPDATE SET
        status = excluded.status,
        score = excluded.score,
        notes = excluded.notes,
        graded_by = excluded.graded_by,
        graded_at = CURRENT_TIMESTAMP,
        submitted_at = CASE WHEN excluded.status IN ('submitted', 'late') THEN CURRENT_TIMESTAMP ELSE submitted_at END
    `)

    const tx = db.transaction((list) => {
      for (const s of list) {
        upsert.run(
          assignmentId, s.student_id, s.status || 'pending',
          s.score !== undefined ? s.score : null,
          s.notes || null, req.user.id, s.status
        )
      }
    })
    tx(students)

    res.json({ success: true, message: `تم حفظ ${students.length} طالب` })
  } catch (error) {
    console.error('POST /assignments/:id/bulk-submit error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - حذف واجب
// ============================================
router.delete('/:id', checkPermission('assignments.delete'), (req, res) => {
  try {
    const db = getDB()
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id)

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'الواجب غير موجود' })
    }

    if (!isAdmin(req.user) && assignment.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'لا يمكنك حذف هذا الواجب' })
    }

    db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: 'تم الحذف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - المتأخرون في الواجبات
// ============================================
router.get('/reports/late', checkPermission('assignments.view'), (req, res) => {
  try {
    const db = getDB()
    const { grade, section, from_date, to_date, subject } = req.query

    let sql = `
      SELECT 
        s.id as student_id,
        s.full_name,
        s.grade,
        s.section,
        s.guardian_name,
        s.guardian_phone,
        COUNT(sub.id) as total_assignments,
        COUNT(CASE WHEN sub.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN sub.status = 'not_submitted' THEN 1 END) as not_submitted_count,
        COUNT(CASE WHEN sub.status = 'pending' THEN 1 END) as pending_count,
        a.subject as subject_name
      FROM students s
      JOIN assignment_submissions sub ON sub.student_id = s.id
      JOIN assignments a ON a.id = sub.assignment_id
      WHERE s.status = 'active'
    `
    const params = []

    // تقييد المرشد
    if (!isAdmin(req.user)) {
      const allowed = getAllowedClasses(db, req.user)
      if (allowed.length === 0) {
        return res.json({ success: true, data: [] })
      }
      const cls = allowed[0]
      sql += ' AND s.grade = ?'
      params.push(cls.grade)
      if (cls.section) {
        sql += ' AND s.section = ?'
        params.push(cls.section)
      }
    } else {
      if (grade) { sql += ' AND s.grade = ?'; params.push(grade) }
      if (section) { sql += ' AND s.section = ?'; params.push(section) }
    }

    if (subject) { sql += ' AND a.subject = ?'; params.push(subject) }
    if (from_date) { sql += ' AND a.due_date >= ?'; params.push(from_date) }
    if (to_date) { sql += ' AND a.due_date <= ?'; params.push(to_date) }

    sql += ` 
      GROUP BY s.id
      HAVING (late_count + not_submitted_count) > 0
      ORDER BY not_submitted_count DESC, late_count DESC
    `

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GET /assignments/reports/late error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router