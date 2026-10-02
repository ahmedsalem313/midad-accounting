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

function canAccessStudent(db, user, studentId) {
  if (isAdmin(user)) return true

  // المرشد يرى طلاب صفه فقط
  const fullUser = db.prepare('SELECT is_advisor, advisor_grade, advisor_section FROM users WHERE id = ?').get(user.id)
  if (!fullUser?.is_advisor) {
    // المعلم غير المرشد — يرى طلاب الصفوف التي درسها
    const teacherAssignments = db.prepare(`
      SELECT DISTINCT grade, section FROM assignments WHERE teacher_id = ?
    `).all(user.id)
    
    if (teacherAssignments.length === 0) return false
    
    const student = db.prepare('SELECT grade, section FROM students WHERE id = ?').get(studentId)
    if (!student) return false
    
    return teacherAssignments.some(a => 
      a.grade === student.grade && (!a.section || a.section === student.section)
    )
  }

  const student = db.prepare('SELECT grade, section FROM students WHERE id = ?').get(studentId)
  if (!student) return false

  if (student.grade !== fullUser.advisor_grade) return false
  if (fullUser.advisor_section && student.section !== fullUser.advisor_section) return false

  return true
}

// ============================================
// GET - كل سجلات التواصل
// ============================================
router.get('/', checkPermission('communications.view'), (req, res) => {
  try {
    const db = getDB()
    const { student_id, type, result_status, teacher_id, from_date, to_date, grade } = req.query

    let sql = `
      SELECT 
        c.*,
        s.full_name as student_name,
        s.grade as student_grade,
        s.section as student_section,
        s.guardian_name,
        s.guardian_phone,
        u.full_name as teacher_name,
        u.role as teacher_role
      FROM communications c
      JOIN students s ON s.id = c.student_id
      JOIN users u ON u.id = c.teacher_id
      WHERE 1=1
    `
    const params = []

    // تقييد المرشد
    if (!isAdmin(req.user)) {
      const fullUser = db.prepare('SELECT is_advisor, advisor_grade, advisor_section FROM users WHERE id = ?').get(req.user.id)

      if (fullUser?.is_advisor) {
        sql += ' AND s.grade = ?'
        params.push(fullUser.advisor_grade)

        if (fullUser.advisor_section) {
          sql += ' AND s.section = ?'
          params.push(fullUser.advisor_section)
        }
      } else {
        // المعلم — فقط التواصل الذي سجّله
        sql += ' AND c.teacher_id = ?'
        params.push(req.user.id)
      }
    } else {
      if (grade) { sql += ' AND s.grade = ?'; params.push(grade) }
    }

    if (student_id) { sql += ' AND c.student_id = ?'; params.push(student_id) }
    if (type) { sql += ' AND c.type = ?'; params.push(type) }
    if (result_status) { sql += ' AND c.result_status = ?'; params.push(result_status) }
    if (teacher_id) { sql += ' AND c.teacher_id = ?'; params.push(teacher_id) }
    if (from_date) { sql += ' AND c.communication_date >= ?'; params.push(from_date) }
    if (to_date) { sql += ' AND c.communication_date <= ?'; params.push(to_date) }

    sql += ' ORDER BY c.communication_date DESC, c.created_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GET /communications error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - سجلات طالب واحد
// ============================================
router.get('/student/:studentId', checkPermission('communications.view'), (req, res) => {
  try {
    const db = getDB()
    const { studentId } = req.params

    if (!canAccessStudent(db, req.user, studentId)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك الوصول لهذا الطالب' })
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
    if (!student) {
      return res.status(404).json({ success: false, error: 'الطالب غير موجود' })
    }

    const records = db.prepare(`
      SELECT 
        c.*,
        u.full_name as teacher_name,
        u.role as teacher_role
      FROM communications c
      JOIN users u ON u.id = c.teacher_id
      WHERE c.student_id = ?
      ORDER BY c.communication_date DESC, c.created_at DESC
    `).all(studentId)

    // إحصائيات
    const stats = {
      total: records.length,
      calls: records.filter(r => r.type === 'call').length,
      whatsapp: records.filter(r => r.type === 'whatsapp').length,
      visits: records.filter(r => r.type === 'visit').length,
      letters: records.filter(r => r.type === 'letter').length,
      meetings: records.filter(r => r.type === 'meeting').length,
      pending: records.filter(r => r.result_status === 'pending').length,
      resolved: records.filter(r => r.result_status === 'resolved').length,
      needs_followup: records.filter(r => r.result_status === 'needs_followup').length,
    }

    res.json({
      success: true,
      data: { student, records, stats },
    })
  } catch (error) {
    console.error('GET /communications/student error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إضافة سجل تواصل
// ============================================
router.post('/', checkPermission('communications.create'), (req, res) => {
  try {
    const {
      student_id, type, subject, reason, notes,
      result, result_status, communication_date, follow_up_date,
    } = req.body

    if (!student_id || !type || !subject || !reason || !communication_date) {
      return res.status(400).json({ success: false, error: 'الحقول المطلوبة ناقصة' })
    }

    const validTypes = ['call', 'whatsapp', 'visit', 'letter', 'meeting']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'نوع تواصل غير صالح' })
    }

    const validStatuses = ['pending', 'resolved', 'needs_followup']
    const status = validStatuses.includes(result_status) ? result_status : 'pending'

    const db = getDB()

    if (!canAccessStudent(db, req.user, student_id)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك تسجيل تواصل لهذا الطالب' })
    }

    const result_insert = db.prepare(`
      INSERT INTO communications (
        student_id, teacher_id, type, subject, reason, notes,
        result, result_status, communication_date, follow_up_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_id, req.user.id, type, subject, reason,
      notes || null, result || null, status,
      communication_date, follow_up_date || null
    )

    res.status(201).json({
      success: true,
      data: { id: result_insert.lastInsertRowid },
      message: 'تم إضافة السجل',
    })
  } catch (error) {
    console.error('POST /communications error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT - تعديل سجل
// ============================================
router.put('/:id', checkPermission('communications.edit'), (req, res) => {
  try {
    const db = getDB()
    const record = db.prepare('SELECT * FROM communications WHERE id = ?').get(req.params.id)

    if (!record) {
      return res.status(404).json({ success: false, error: 'السجل غير موجود' })
    }

    if (!isAdmin(req.user) && record.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'لا يمكنك تعديل هذا السجل' })
    }

    const fields = ['type', 'subject', 'reason', 'notes', 'result', 'result_status', 'communication_date', 'follow_up_date']
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

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)

    db.prepare(`UPDATE communications SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - حذف سجل
// ============================================
router.delete('/:id', checkPermission('communications.delete'), (req, res) => {
  try {
    const db = getDB()
    const record = db.prepare('SELECT * FROM communications WHERE id = ?').get(req.params.id)

    if (!record) {
      return res.status(404).json({ success: false, error: 'السجل غير موجود' })
    }

    if (!isAdmin(req.user) && record.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'لا يمكنك حذف هذا السجل' })
    }

    db.prepare('DELETE FROM communications WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: 'تم الحذف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router