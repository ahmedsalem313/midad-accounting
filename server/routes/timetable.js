import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import { generateTimetable } from '../services/timetableGenerator.js'
const router = express.Router()
router.use(authMiddleware)

// GET - كل الحصص (فلترة حسب الصف/الشعبة/المعلم)
router.get('/', checkPermission('timetable.view'), (req, res) => {
  const db = getDB()
  const { grade, section, teacher_id } = req.query

  let sql = `
    SELECT t.*, u.full_name as teacher_name
    FROM timetable t
    JOIN users u ON u.id = t.teacher_id
    WHERE 1=1
  `
  const params = []

  if (grade) { sql += ' AND t.grade = ?'; params.push(grade) }
  if (section) { sql += ' AND t.section = ?'; params.push(section) }
  if (teacher_id) { sql += ' AND t.teacher_id = ?'; params.push(teacher_id) }

  sql += ' ORDER BY t.day_of_week, t.period'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// POST - إضافة حصة
router.post('/', checkPermission('timetable.create'), (req, res) => {
  try {
    const { grade, section, day_of_week, period, start_time, end_time, subject, teacher_id, room, academic_year } = req.body

    if (!grade || day_of_week === undefined || !period || !subject || !teacher_id) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال الحقول المطلوبة' })
    }

    const db = getDB()

    // فحص تعارض المعلم
    const teacherConflict = db.prepare(`
      SELECT 1 FROM timetable
      WHERE day_of_week = ? AND period = ? AND teacher_id = ?
    `).get(day_of_week, period, teacher_id)

    if (teacherConflict) {
      return res.status(400).json({ success: false, error: 'المعلم مشغول في هذا الوقت' })
    }

    // فحص تعارض الصف
    const classConflict = db.prepare(`
      SELECT 1 FROM timetable
      WHERE day_of_week = ? AND period = ? AND grade = ? AND (section = ? OR (section IS NULL AND ? IS NULL))
    `).get(day_of_week, period, grade, section || null, section || null)

    if (classConflict) {
      return res.status(400).json({ success: false, error: 'الصف مشغول في هذا الوقت' })
    }

    const result = db.prepare(`
      INSERT INTO timetable (
        grade, section, day_of_week, period, start_time, end_time,
        subject, teacher_id, room, academic_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      grade, section || null, day_of_week, period, start_time, end_time,
      subject, teacher_id, room || null, academic_year || null
    )

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid }, message: 'تمت إضافة الحصة' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// PUT - تعديل حصة
router.put('/:id', checkPermission('timetable.edit'), (req, res) => {
  try {
    const db = getDB()
    const fields = ['grade', 'section', 'day_of_week', 'period', 'start_time', 'end_time', 'subject', 'teacher_id', 'room', 'academic_year']
    const updates = []
    const values = []

    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]) }
    }

    if (updates.length === 0) return res.status(400).json({ success: false, error: 'لا توجد تعديلات' })
    values.push(req.params.id)

    db.prepare(`UPDATE timetable SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    res.json({ success: true, message: 'تم التحديث' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// DELETE
router.delete('/:id', checkPermission('timetable.edit'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'غير موجود' })
  res.json({ success: true, message: 'تم الحذف' })
})

// GET - جدول المعلم
router.get('/teacher/:id', checkPermission('timetable.view'), (req, res) => {
  const db = getDB()
  const rows = db.prepare(`
    SELECT t.*, u.full_name as teacher_name
    FROM timetable t
    JOIN users u ON u.id = t.teacher_id
    WHERE t.teacher_id = ?
    ORDER BY t.day_of_week, t.period
  `).all(req.params.id)

  res.json({ success: true, data: rows })
})

// GET - حذف كل جدول صف
router.delete('/class/:grade/:section', checkPermission('timetable.edit'), (req, res) => {
  const db = getDB()
  const { grade, section } = req.params
  const result = db.prepare(`
    DELETE FROM timetable WHERE grade = ? AND (section = ? OR (? = 'all' AND section IS NULL))
  `).run(grade, section, section)

  res.json({ success: true, message: `تم حذف ${result.changes} حصة` })
})
// POST — توليد الجدول تلقائيًا
router.post('/generate', checkPermission('timetable.edit'), (req, res) => {
  try {
    const { grade, section, academic_year } = req.body
    if (!grade) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد الصف' })
    }

    const result = generateTimetable({
      grade,
      section: section || null,
      academicYear: academic_year || '2025-2026',
    })

    if (result.unassigned.length > 0) {
      const summary = result.unassigned
        .slice(0, 5)
        .map((u) => `${u.subject_name} (${u.teacher_name})`)
        .join('، ')
      return res.json({
        success: true,
        data: result,
        message: `تم توزيع ${result.placed} من ${result.total}. لم تُوزّع: ${summary}${result.unassigned.length > 5 ? '...' : ''}`,
        warning: true,
      })
    }

    res.json({
      success: true,
      data: result,
      message: `تم توزيع ${result.placed} حصة بنجاح`,
    })
  } catch (error) {
    console.error('Generate error:', error)
    res.status(500).json({ success: false, error: error.message || 'فشل التوليد' })
  }
})
export default router