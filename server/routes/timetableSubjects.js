// server/routes/timetableSubjects.js
import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET — كل المواد (فلترة حسب grade, section, academic_year)
router.get('/', checkPermission('timetable.view'), (req, res) => {
  const db = getDB()
  const { grade, section, academic_year } = req.query

  let sql = `
    SELECT s.*,
           (SELECT COUNT(*) FROM timetable_subject_teachers WHERE subject_id = s.id) as teachers_count,
           (SELECT COALESCE(SUM(lessons_count), 0) FROM timetable_subject_teachers WHERE subject_id = s.id) as teachers_lessons_total
    FROM timetable_subjects s
    WHERE 1=1
  `
  const params = []

  if (grade) { sql += ' AND s.grade = ?'; params.push(grade) }
  if (section) { sql += ' AND s.section = ?'; params.push(section) }
  if (academic_year) { sql += ' AND s.academic_year = ?'; params.push(academic_year) }

  sql += ' ORDER BY s.grade, s.section, s.subject_name'

  const subjects = db.prepare(sql).all(...params)

  // جلب معلمي كل مادة
  const getTeachers = db.prepare(`
    SELECT tst.id, tst.teacher_id, tst.lessons_count, u.full_name as teacher_name
    FROM timetable_subject_teachers tst
    JOIN users u ON u.id = tst.teacher_id
    WHERE tst.subject_id = ?
    ORDER BY u.full_name
  `)
  for (const s of subjects) {
    s.teachers = getTeachers.all(s.id)
  }

  res.json({ success: true, data: subjects })
})

// GET — مادة واحدة
router.get('/:id', checkPermission('timetable.view'), (req, res) => {
  const db = getDB()
  const subject = db.prepare('SELECT * FROM timetable_subjects WHERE id = ?').get(req.params.id)
  if (!subject) return res.status(404).json({ success: false, error: 'غير موجودة' })

  subject.teachers = db.prepare(`
    SELECT tst.id, tst.teacher_id, tst.lessons_count, u.full_name as teacher_name
    FROM timetable_subject_teachers tst
    JOIN users u ON u.id = tst.teacher_id
    WHERE tst.subject_id = ?
  `).all(subject.id)

  res.json({ success: true, data: subject })
})

// POST — إضافة مادة جديدة
router.post('/', checkPermission('timetable.edit'), (req, res) => {
  try {
    const db = getDB()
    const {
      grade, section, subject_code, subject_name,
      weekly_lessons, academic_year, notes, teachers,
    } = req.body

    if (!grade || !subject_code || !subject_name || !weekly_lessons) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال الحقول المطلوبة' })
    }
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب تحديد معلم واحد على الأقل' })
    }

    // فحص مجموع حصص المعلمين = الحصص الأسبوعية
    const totalTeacherLessons = teachers.reduce((s, t) => s + (parseInt(t.lessons_count) || 0), 0)
    if (totalTeacherLessons !== parseInt(weekly_lessons)) {
      return res.status(400).json({
        success: false,
        error: `مجموع حصص المعلمين (${totalTeacherLessons}) لا يساوي الحصص الأسبوعية (${weekly_lessons})`,
      })
    }

    const tx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO timetable_subjects
        (grade, section, subject_code, subject_name, weekly_lessons, academic_year, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        grade, section || null, subject_code, subject_name,
        parseInt(weekly_lessons),
        academic_year || '2025-2026',
        notes || null
      )

      const subjectId = result.lastInsertRowid

      const insertTeacher = db.prepare(`
        INSERT INTO timetable_subject_teachers (subject_id, teacher_id, lessons_count)
        VALUES (?, ?, ?)
      `)
      for (const t of teachers) {
        insertTeacher.run(subjectId, parseInt(t.teacher_id), parseInt(t.lessons_count) || 0)
      }

      return subjectId
    })

    const id = tx()
    res.status(201).json({ success: true, data: { id }, message: 'تمت الإضافة' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ' })
  }
})

// PUT — تعديل مادة
router.put('/:id', checkPermission('timetable.edit'), (req, res) => {
  try {
    const db = getDB()
    const {
      grade, section, subject_code, subject_name,
      weekly_lessons, academic_year, notes, teachers,
    } = req.body

    const existing = db.prepare('SELECT id FROM timetable_subjects WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ success: false, error: 'غير موجودة' })

    const totalTeacherLessons = (teachers || []).reduce((s, t) => s + (parseInt(t.lessons_count) || 0), 0)
    if (teachers && teachers.length > 0 && totalTeacherLessons !== parseInt(weekly_lessons)) {
      return res.status(400).json({
        success: false,
        error: `مجموع حصص المعلمين (${totalTeacherLessons}) لا يساوي الحصص الأسبوعية (${weekly_lessons})`,
      })
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE timetable_subjects SET
          grade = ?, section = ?, subject_code = ?, subject_name = ?,
          weekly_lessons = ?, academic_year = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        grade, section || null, subject_code, subject_name,
        parseInt(weekly_lessons),
        academic_year || '2025-2026',
        notes || null,
        req.params.id
      )

      if (Array.isArray(teachers)) {
        db.prepare('DELETE FROM timetable_subject_teachers WHERE subject_id = ?').run(req.params.id)
        const insertTeacher = db.prepare(`
          INSERT INTO timetable_subject_teachers (subject_id, teacher_id, lessons_count)
          VALUES (?, ?, ?)
        `)
        for (const t of teachers) {
          insertTeacher.run(req.params.id, parseInt(t.teacher_id), parseInt(t.lessons_count) || 0)
        }
      }
    })

    tx()
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ' })
  }
})

// DELETE — حذف مادة
router.delete('/:id', checkPermission('timetable.edit'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM timetable_subjects WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'غير موجودة' })
  res.json({ success: true, message: 'تم الحذف' })
})

// GET — قائمة المعلمين المتاحين (للاختيار في الواجهة)
router.get('/meta/teachers', checkPermission('timetable.view'), (req, res) => {
  const db = getDB()
  const teachers = db.prepare(`
    SELECT id, full_name, role FROM users
    WHERE role IN ('teacher', 'admin', 'accountant') AND is_active = 1
    ORDER BY full_name
  `).all()
  res.json({ success: true, data: teachers })
})

export default router