import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET - كل الدرجات
router.get('/', checkPermission('grades.view'), (req, res) => {
  const db = getDB()
  const { student_id, subject, exam_type, grade, semester } = req.query

  let sql = `
    SELECT g.*, s.full_name as student_name, s.grade as student_grade, s.section
    FROM grades g
    JOIN students s ON s.id = g.student_id
    WHERE 1=1
  `
  const params = []

  if (student_id) { sql += ' AND g.student_id = ?'; params.push(student_id) }
  if (subject) { sql += ' AND g.subject = ?'; params.push(subject) }
  if (exam_type) { sql += ' AND g.exam_type = ?'; params.push(exam_type) }
  if (grade) { sql += ' AND s.grade = ?'; params.push(grade) }
  if (semester) { sql += ' AND g.semester = ?'; params.push(semester) }

  sql += ' ORDER BY g.created_at DESC'

  const rows = db.prepare(sql).all(...params)

  // فك تشفير components (JSON)
  const grades = rows.map(r => ({
    ...r,
    components: r.components ? JSON.parse(r.components) : null,
  }))

  res.json({ success: true, data: grades })
})

// POST - إضافة درجة (بسيطة أو مركبة)
router.post('/', checkPermission('grades.create'), (req, res) => {
  try {
    const {
      student_id, subject, exam_type, score, max_score,
      components, is_composite,
      exam_date, semester, academic_year, notes
    } = req.body

    if (!student_id || !subject || !exam_type || score === undefined) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال الحقول المطلوبة' })
    }

    const db = getDB()
    const result = db.prepare(`
      INSERT INTO grades (
        student_id, subject, exam_type, score, max_score,
        components, is_composite,
        exam_date, semester, academic_year, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_id, subject, exam_type, score, max_score || 100,
      components ? JSON.stringify(components) : null,
      is_composite ? 1 : 0,
      exam_date || null, semester || null, academic_year || null,
      notes || null, req.user.id
    )

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid }, message: 'تم الحفظ' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// POST - إدخال جماعي (لصف كامل)
router.post('/bulk', checkPermission('grades.create'), (req, res) => {
  try {
    const {
      grade, section, subject, exam_type, exam_date,
      semester, academic_year, students
    } = req.body

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد درجات' })
    }

    const db = getDB()
    const insert = db.prepare(`
      INSERT INTO grades (
        student_id, subject, exam_type, score, max_score,
        components, is_composite,
        exam_date, semester, academic_year, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction((list) => {
      for (const s of list) {
        insert.run(
          s.student_id, subject, exam_type, s.score, s.max_score || 100,
          s.components ? JSON.stringify(s.components) : null,
          s.is_composite ? 1 : 0,
          exam_date || null, semester || null, academic_year || null, req.user.id
        )
      }
    })
    tx(students)

    res.status(201).json({ success: true, message: `تم حفظ ${students.length} درجة` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// PUT - تعديل درجة
router.put('/:id', checkPermission('grades.edit'), (req, res) => {
  try {
    const db = getDB()
    const fields = ['score', 'max_score', 'exam_date', 'semester', 'academic_year', 'notes']
    const updates = []
    const values = []

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`)
        values.push(req.body[f])
      }
    }

    // حقل components يدوياً (JSON)
    if (req.body.components !== undefined) {
      updates.push('components = ?')
      values.push(req.body.components ? JSON.stringify(req.body.components) : null)
    }
    if (req.body.is_composite !== undefined) {
      updates.push('is_composite = ?')
      values.push(req.body.is_composite ? 1 : 0)
    }

    if (updates.length === 0) return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    values.push(req.params.id)

    db.prepare(`UPDATE grades SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// DELETE
router.delete('/:id', checkPermission('grades.delete'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM grades WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'غير موجود' })
  res.json({ success: true, message: 'تم الحذف' })
})

// GET - كشف درجات طالب
router.get('/student/:id/report', checkPermission('grades.view'), (req, res) => {
  const db = getDB()
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
  if (!student) return res.status(404).json({ success: false, error: 'الطالب غير موجود' })

  const rows = db.prepare(`
    SELECT subject, exam_type, score, max_score, components, is_composite, exam_date, semester
    FROM grades WHERE student_id = ?
    ORDER BY subject, exam_date
  `).all(req.params.id)

  const grades = rows.map(r => ({
    ...r,
    components: r.components ? JSON.parse(r.components) : null,
  }))

  const avg = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.score / g.max_score) * 100, 0) / grades.length
    : 0

  res.json({
    success: true,
    data: {
      student,
      grades,
      average: Math.round(avg * 100) / 100,
    },
  })
})

// GET - المواد الدراسية
router.get('/meta/subjects', checkPermission('grades.view'), (req, res) => {
  const subjects = [
    { value: 'arabic',   label_ar: 'اللغة العربية', label_en: 'Arabic' },
    { value: 'english',  label_ar: 'اللغة الإنجليزية', label_en: 'English' },
    { value: 'math',     label_ar: 'الرياضيات',     label_en: 'Mathematics' },
    { value: 'science',  label_ar: 'العلوم',        label_en: 'Science' },
    { value: 'social',   label_ar: 'الاجتماعيات',   label_en: 'Social Studies' },
    { value: 'islamic',  label_ar: 'التربية الإسلامية', label_en: 'Islamic Studies' },
    { value: 'computer', label_ar: 'الحاسوب',       label_en: 'Computer' },
    { value: 'art',      label_ar: 'الفنون',        label_en: 'Art' },
    { value: 'pe',       label_ar: 'التربية الرياضية', label_en: 'Physical Education' },
  ]
  res.json({ success: true, data: subjects })
})

export default router