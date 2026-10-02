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
  if (!fullUser?.is_advisor) return false

  const student = db.prepare('SELECT grade, section FROM students WHERE id = ?').get(studentId)
  if (!student) return false

  if (student.grade !== fullUser.advisor_grade) return false
  if (fullUser.advisor_section && student.section !== fullUser.advisor_section) return false

  return true
}

// ============================================
// GET - كل الملاحظات
// ============================================
router.get('/', checkPermission('notes.view'), (req, res) => {
  try {
    const db = getDB()
    const { student_id, category, teacher_id, is_public, grade, section } = req.query

    let sql = `
      SELECT 
        n.*,
        s.full_name as student_name,
        s.grade as student_grade,
        s.section as student_section,
        u.full_name as teacher_name,
        u.role as teacher_role
      FROM student_notes n
      JOIN students s ON s.id = n.student_id
      JOIN users u ON u.id = n.teacher_id
      WHERE 1=1
    `
    const params = []

    // تقييد المرشد
    if (!isAdmin(req.user)) {
      const fullUser = db.prepare('SELECT is_advisor, advisor_grade, advisor_section FROM users WHERE id = ?').get(req.user.id)

      if (!fullUser?.is_advisor) {
        return res.json({ success: true, data: [] })
      }

      sql += ' AND s.grade = ?'
      params.push(fullUser.advisor_grade)

      if (fullUser.advisor_section) {
        sql += ' AND s.section = ?'
        params.push(fullUser.advisor_section)
      }
    } else {
      if (grade) { sql += ' AND s.grade = ?'; params.push(grade) }
      if (section) { sql += ' AND s.section = ?'; params.push(section) }
    }

    if (student_id) { sql += ' AND n.student_id = ?'; params.push(student_id) }
    if (category) { sql += ' AND n.category = ?'; params.push(category) }
    if (teacher_id) { sql += ' AND n.teacher_id = ?'; params.push(teacher_id) }
    if (is_public !== undefined) { sql += ' AND n.is_public = ?'; params.push(is_public === 'true' ? 1 : 0) }

    sql += ' ORDER BY n.is_pinned DESC, n.created_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('GET /notes error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - ملاحظات طالب واحد
// ============================================
router.get('/student/:studentId', checkPermission('notes.view'), (req, res) => {
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

    const notes = db.prepare(`
      SELECT 
        n.*,
        u.full_name as teacher_name,
        u.role as teacher_role
      FROM student_notes n
      JOIN users u ON u.id = n.teacher_id
      WHERE n.student_id = ?
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `).all(studentId)

    // إحصائيات
    const stats = {
      total: notes.length,
      behavior: notes.filter(n => n.category === 'behavior').length,
      academic: notes.filter(n => n.category === 'academic').length,
      health: notes.filter(n => n.category === 'health').length,
      general: notes.filter(n => n.category === 'general').length,
      public: notes.filter(n => n.is_public === 1).length,
    }

    res.json({
      success: true,
      data: { student, notes, stats },
    })
  } catch (error) {
    console.error('GET /notes/student error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - إضافة ملاحظة
// ============================================
router.post('/', checkPermission('notes.create'), (req, res) => {
  try {
    const { student_id, category, title, content, is_public, is_pinned } = req.body

    if (!student_id || !content) {
      return res.status(400).json({ success: false, error: 'الطالب والمحتوى مطلوبان' })
    }

    const validCategories = ['behavior', 'academic', 'health', 'general']
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'تصنيف غير صالح' })
    }

    const db = getDB()

    if (!canAccessStudent(db, req.user, student_id)) {
      return res.status(403).json({ success: false, error: 'لا يمكنك إضافة ملاحظة لهذا الطالب' })
    }

    const result = db.prepare(`
      INSERT INTO student_notes (
        student_id, teacher_id, category, title, content, is_public, is_pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_id,
      req.user.id,
      category,
      title || null,
      content,
      is_public ? 1 : 0,
      is_pinned ? 1 : 0
    )

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: 'تم إضافة الملاحظة',
    })
  } catch (error) {
    console.error('POST /notes error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// PUT - تعديل ملاحظة
// ============================================
router.put('/:id', checkPermission('notes.edit'), (req, res) => {
  try {
    const { category, title, content, is_public, is_pinned } = req.body
    const db = getDB()

    const note = db.prepare('SELECT * FROM student_notes WHERE id = ?').get(req.params.id)
    if (!note) {
      return res.status(404).json({ success: false, error: 'الملاحظة غير موجودة' })
    }

    // فقط المُنشئ أو المدير
    if (!isAdmin(req.user) && note.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'لا يمكنك تعديل هذه الملاحظة' })
    }

    const updates = []
    const values = []

    if (category !== undefined) { updates.push('category = ?'); values.push(category) }
    if (title !== undefined) { updates.push('title = ?'); values.push(title) }
    if (content !== undefined) { updates.push('content = ?'); values.push(content) }
    if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public ? 1 : 0) }
    if (is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(is_pinned ? 1 : 0) }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)

    db.prepare(`UPDATE student_notes SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    console.error('PUT /notes error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// DELETE - حذف ملاحظة
// ============================================
router.delete('/:id', checkPermission('notes.delete'), (req, res) => {
  try {
    const db = getDB()
    const note = db.prepare('SELECT * FROM student_notes WHERE id = ?').get(req.params.id)

    if (!note) {
      return res.status(404).json({ success: false, error: 'الملاحظة غير موجودة' })
    }

    if (!isAdmin(req.user) && note.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'لا يمكنك حذف هذه الملاحظة' })
    }

    db.prepare('DELETE FROM student_notes WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: 'تم الحذف' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router