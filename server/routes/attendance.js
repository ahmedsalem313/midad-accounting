import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// GET - حضور يوم معين
router.get('/', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const { date, teacher_id } = req.query

  let sql = `
    SELECT a.*, u.full_name as teacher_name, 
           c.full_name as confirmed_by_name
    FROM teacher_attendance a
    JOIN users u ON u.id = a.teacher_id
    LEFT JOIN users c ON c.id = a.confirmed_by
    WHERE 1=1
  `
  const params = []

  if (date) { sql += ' AND a.date = ?'; params.push(date) }
  if (teacher_id) { sql += ' AND a.teacher_id = ?'; params.push(teacher_id) }

  sql += ' ORDER BY a.date DESC, u.full_name'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// GET - حضور اليوم الحالي لجميع المعلمين
router.get('/today', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const today = new Date().toISOString().split('T')[0]

  const teachers = db.prepare(`
    SELECT id, full_name, username, role FROM users
    WHERE role IN ('teacher', 'admin', 'accountant') AND is_active = 1
    ORDER BY full_name
  `).all()

  const attendance = db.prepare(`
    SELECT * FROM teacher_attendance WHERE date = ?
  `).all(today)

  const map = {}
  for (const a of attendance) map[a.teacher_id] = a

  const result = teachers.map(t => ({
    teacher_id: t.id,
    teacher_name: t.full_name,
    role: t.role,
    date: today,
    ...(map[t.id] || {
      status: null,
      check_in_time: null,
      check_out_time: null,
      late_minutes: 0,
    }),
  }))

  res.json({ success: true, data: result })
})

// POST - تسجيل حضور (من المعلم نفسه)
router.post('/mark', checkPermission('attendance.mark'), (req, res) => {
  try {
    const { teacher_id, date, status, check_in_time, teacher_note } = req.body

    // المعلم يسجل لنفسه فقط
    const targetTeacherId = req.user.role === 'teacher' ? req.user.id : (teacher_id || req.user.id)

    if (!date || !status) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال التاريخ والحالة' })
    }

    const db = getDB()
    const now = new Date()
    const checkIn = check_in_time || now.toTimeString().substring(0, 5)

    // حساب التأخير
    const settings = db.prepare("SELECT value FROM settings WHERE key = 'school_start_time'").get()
    const startTime = settings?.value || '08:00'
    let lateMinutes = 0

    if (status === 'late' && checkIn) {
      const [sh, sm] = startTime.split(':').map(Number)
      const [ch, cm] = checkIn.split(':').map(Number)
      lateMinutes = Math.max(0, (ch * 60 + cm) - (sh * 60 + sm))
    }

    // upsert
    const existing = db.prepare('SELECT id, status FROM teacher_attendance WHERE teacher_id = ? AND date = ?')
      .get(targetTeacherId, date)

    if (existing) {
      // إذا كان مؤكد من المدير، لا يعدله المعلم
      if (existing.status === 'confirmed') {
        return res.status(400).json({ success: false, error: 'الحضور مؤكد من المدير' })
      }

      db.prepare(`
        UPDATE teacher_attendance
        SET status = ?, check_in_time = ?, late_minutes = ?, teacher_note = ?
        WHERE id = ?
      `).run(status, checkIn, lateMinutes, teacher_note || null, existing.id)

      return res.json({ success: true, message: 'تم التحديث', data: { id: existing.id } })
    }

    const result = db.prepare(`
      INSERT INTO teacher_attendance (
        teacher_id, date, status, check_in_time, late_minutes, teacher_note, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(targetTeacherId, date, status, checkIn, lateMinutes, teacher_note || null, req.user.id)

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid }, message: 'تم التسجيل' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// PUT - تأكيد/تعديل من المدير
router.put('/:id', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const { status, check_in_time, check_out_time, late_minutes, admin_note } = req.body
    const db = getDB()

    const updates = []
    const values = []

    if (status !== undefined) { updates.push('status = ?'); values.push(status) }
    if (check_in_time !== undefined) { updates.push('check_in_time = ?'); values.push(check_in_time) }
    if (check_out_time !== undefined) { updates.push('check_out_time = ?'); values.push(check_out_time) }
    if (late_minutes !== undefined) { updates.push('late_minutes = ?'); values.push(late_minutes) }
    if (admin_note !== undefined) { updates.push('admin_note = ?'); values.push(admin_note) }

    updates.push('confirmed_by = ?'); values.push(req.user.id)
    updates.push('confirmed_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)

    db.prepare(`UPDATE teacher_attendance SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    res.json({ success: true, message: 'تم التأكيد' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// POST - تأكيد جماعي
router.post('/confirm-bulk', checkPermission('attendance.confirm'), (req, res) => {
  try {
    const { date } = req.body
    if (!date) return res.status(400).json({ success: false, error: 'يرجى تحديد التاريخ' })

    const db = getDB()
    const result = db.prepare(`
      UPDATE teacher_attendance
      SET confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP
      WHERE date = ? AND confirmed_by IS NULL
    `).run(req.user.id, date)

    res.json({ success: true, message: `تم تأكيد ${result.changes} سجل` })
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' })
  }
})

// DELETE
router.delete('/:id', checkPermission('attendance.confirm'), (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM teacher_attendance WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'غير موجود' })
  res.json({ success: true, message: 'تم الحذف' })
})

// GET - تقرير شهري
router.get('/report/monthly', checkPermission('attendance.view'), (req, res) => {
  const db = getDB()
  const { year, month, teacher_id } = req.query

  const y = parseInt(year) || new Date().getFullYear()
  const m = parseInt(month) || new Date().getMonth() + 1
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const end = `${y}-${String(m).padStart(2, '0')}-31`

  let sql = `
    SELECT 
      u.id, u.full_name,
      COUNT(CASE WHEN a.status IN ('present', 'confirmed') THEN 1 END) as present_days,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
      COALESCE(SUM(a.late_minutes), 0) as total_late_minutes
    FROM users u
    LEFT JOIN teacher_attendance a ON a.teacher_id = u.id AND a.date BETWEEN ? AND ?
    WHERE u.role = 'teacher' AND u.is_active = 1
  `
  const params = [start, end]

  if (teacher_id) { sql += ' AND u.id = ?'; params.push(teacher_id) }

  sql += ' GROUP BY u.id ORDER BY u.full_name'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: { report: rows, year: y, month: m } })
})

// GET - حالات الحضور
router.get('/meta/statuses', checkPermission('attendance.view'), (req, res) => {
  const statuses = [
    { value: 'present',   label_ar: 'حاضر',          label_en: 'Present',   color: 'green' },
    { value: 'late',      label_ar: 'متأخر',         label_en: 'Late',      color: 'orange' },
    { value: 'absent',    label_ar: 'غائب',          label_en: 'Absent',    color: 'red' },
    { value: 'excused',   label_ar: 'غياب بعذر',     label_en: 'Excused',   color: 'yellow' },
    { value: 'sick_leave',label_ar: 'إجازة مرضية',   label_en: 'Sick Leave',color: 'blue' },
    { value: 'annual_leave',label_ar:'إجازة سنوية',  label_en: 'Annual Leave',color: 'blue' },
    { value: 'emergency', label_ar: 'إجازة طارئة',   label_en: 'Emergency', color: 'purple' },
    { value: 'holiday',   label_ar: 'عطلة رسمية',    label_en: 'Holiday',   color: 'gray' },
  ]
  res.json({ success: true, data: statuses })
})

export default router