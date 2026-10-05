// server/routes/promotions.js
import express from 'express'
import { getDB } from '../database/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'

const router = express.Router()
router.use(authMiddleware)

// ============================================
// ترتيب الصفوف (من الأصغر للأكبر)
// ============================================
const GRADE_ORDER = [
  'الأول الابتدائي',
  'الثاني الابتدائي',
  'الثالث الابتدائي',
  'الرابع الابتدائي',
  'الخامس الابتدائي',
  'السادس الابتدائي',
  'الأول المتوسط',
  'الثاني المتوسط',
  'الثالث المتوسط',
  'الرابع العلمي',
  'الرابع الأدبي',
  'الخامس العلمي',
  'الخامس الأدبي',
  'السادس العلمي',
  'السادس الأدبي',
]

// الصفوف النهائية (لا يوجد بعدها)
const FINAL_GRADES = ['السادس الابتدائي', 'السادس العلمي', 'السادس الأدبي']

function getNextGrade(grade) {
  if (FINAL_GRADES.includes(grade)) return null
  const idx = GRADE_ORDER.indexOf(grade)
  if (idx === -1 || idx === GRADE_ORDER.length - 1) return null
  return GRADE_ORDER[idx + 1]
}

function isFinalGrade(grade) {
  return FINAL_GRADES.includes(grade)
}

// ============================================
// GET - معاينة الترحيل (قبل التطبيق)
// ============================================
router.get('/preview', checkPermission('students.edit'), (req, res) => {
  try {
    const db = getDB()
    const { from_grade, academic_year } = req.query

    if (!from_grade) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد الصف' })
    }

    const nextYear = academic_year || getNextAcademicYear()

    // جلب الطلاب النشطين في هذا الصف
    const students = db.prepare(`
      SELECT id, full_name, student_number, grade, section, gender,
             total_fees, status
      FROM students
      WHERE grade = ? AND status = 'active'
      ORDER BY section, full_name
    `).all(from_grade)

    // لكل طالب: حساب المعدل من الدرجات في هذه السنة الدراسية
    const results = []
    for (const student of students) {
      // المعدل: متوسط كل الدرجات النهائية (final) في هذه السنة
      const grades = db.prepare(`
        SELECT subject, score, max_score
        FROM grades
        WHERE student_id = ? AND academic_year = ?
      `).all(student.id, academic_year || getCurrentAcademicYear())

      let average = 0
      if (grades.length > 0) {
        // مجموعة حسب المادة: نأخذ أعلى درجة لكل مادة
        const bySubject = {}
        for (const g of grades) {
          if (!bySubject[g.subject] || g.score > bySubject[g.subject].score) {
            bySubject[g.subject] = g
          }
        }
        const subjects = Object.values(bySubject)
        const totalScore = subjects.reduce((s, g) => s + g.score, 0)
        const totalMax = subjects.reduce((s, g) => s + (g.max_score || 100), 0)
        average = totalMax > 0 ? (totalScore / totalMax) * 100 : 0
      }

      // النتيجة المقترحة: ناجح إذا المعدل >= 50
      const passed = average >= 50
      const nextGrade = passed ? getNextGrade(student.grade) : null
      const isFinal = isFinalGrade(student.grade)

      results.push({
        ...student,
        average: Math.round(average * 100) / 100,
        grades_count: grades.length,
        suggested_result: isFinal
          ? (passed ? 'graduated' : 'repeating')
          : (passed ? 'passed' : 'repeating'),
        suggested_next_grade: passed ? (nextGrade || 'graduated') : student.grade,
        is_final_grade: isFinal,
      })
    }

    // إحصائيات
    const stats = {
      total: results.length,
      passed: results.filter((r) => r.suggested_result === 'passed').length,
      graduated: results.filter((r) => r.suggested_result === 'graduated').length,
      repeating: results.filter((r) => r.suggested_result === 'repeating').length,
      next_year: nextYear,
    }

    res.json({
      success: true,
      data: { students: results, stats },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// POST - تطبيق الترحيل
// ============================================
router.post('/apply', checkPermission('students.edit'), (req, res) => {
  try {
    const db = getDB()
    const { academic_year, decisions } = req.body
    // decisions = [{ student_id, result: 'passed'|'repeating'|'graduated', next_grade, next_section, final_average }]

    if (!Array.isArray(decisions) || decisions.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد قرارات' })
    }

    const currentYear = academic_year || getCurrentAcademicYear()
    const nextYear = getNextAcademicYear(academic_year)

    const tx = db.transaction(() => {
      let count = 0

      for (const d of decisions) {
        const student = db.prepare('SELECT * FROM students WHERE id = ?').get(d.student_id)
        if (!student) continue

        // 1) احفظ السجل الأكاديمي للسنة المنتهية
        const existingHistory = db.prepare(`
          SELECT id FROM student_history
          WHERE student_id = ? AND academic_year = ?
        `).get(d.student_id, currentYear)

        if (existingHistory) {
          db.prepare(`
            UPDATE student_history SET
              status = ?,
              final_average = ?,
              result = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            d.result === 'graduated' ? 'graduated' : 'enrolled',
            d.final_average || null,
            d.result,
            existingHistory.id
          )
        } else {
          db.prepare(`
            INSERT INTO student_history
            (student_id, academic_year, grade, section, status, final_average, result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            d.student_id,
            currentYear,
            student.grade,
            student.section,
            d.result === 'graduated' ? 'graduated' : 'enrolled',
            d.final_average || null,
            d.result
          )
        }

        // 2) سجل الترحيل
        db.prepare(`
          INSERT INTO promotions
          (student_id, from_grade, from_section, to_grade, to_section,
           academic_year, next_academic_year, final_average, result, decided_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          d.student_id,
          student.grade,
          student.section,
          d.next_grade || student.grade,
          d.next_section || student.section,
          currentYear,
          nextYear,
          d.final_average || null,
          d.result,
          req.user.id
        )

        // 3) حدّث الطالب
        if (d.result === 'graduated') {
          db.prepare(`
            UPDATE students SET
              status = 'graduated',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(d.student_id)
        } else if (d.result === 'passed' && d.next_grade) {
          db.prepare(`
            UPDATE students SET
              grade = ?,
              section = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(d.next_grade, d.next_section || student.section, d.student_id)
        }
        // نتيجة 'repeating' — لا تغيير في الصف

        count++
      }

      return count
    })

    const count = tx()

    res.json({
      success: true,
      message: `تم ترحيل ${count} طالب بنجاح`,
      count,
      from_year: currentYear,
      to_year: nextYear,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - سجل الترحيلات (كل السنوات)
// ============================================
router.get('/history', checkPermission('students.view'), (req, res) => {
  try {
    const db = getDB()
    const { academic_year, grade } = req.query

    let sql = `
      SELECT p.*,
             s.full_name, s.student_number,
             u.full_name as decided_by_name
      FROM promotions p
      JOIN students s ON s.id = p.student_id
      LEFT JOIN users u ON u.id = p.decided_by
      WHERE 1=1
    `
    const params = []

    if (academic_year) {
      sql += ' AND p.academic_year = ?'
      params.push(academic_year)
    }
    if (grade) {
      sql += ' AND p.from_grade = ?'
      params.push(grade)
    }

    sql += ' ORDER BY p.decided_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// GET - إحصائيات سريعة
// ============================================
router.get('/stats', checkPermission('students.view'), (req, res) => {
  try {
    const db = getDB()

    const totals = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN result = 'passed' THEN 1 END) as passed,
        COUNT(CASE WHEN result = 'repeating' THEN 1 END) as repeating,
        COUNT(CASE WHEN result = 'graduated' THEN 1 END) as graduated
      FROM promotions
    `).get()

    const byYear = db.prepare(`
      SELECT academic_year,
             COUNT(*) as count,
             COUNT(CASE WHEN result = 'passed' THEN 1 END) as passed,
             COUNT(CASE WHEN result = 'repeating' THEN 1 END) as repeating,
             COUNT(CASE WHEN result = 'graduated' THEN 1 END) as graduated
      FROM promotions
      GROUP BY academic_year
      ORDER BY academic_year DESC
    `).all()

    res.json({ success: true, data: { totals, byYear } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// Helpers
// ============================================
function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  // افترض أن السنة الدراسية تبدأ في سبتمبر (شهر 8)
  if (month >= 8) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}

function getNextAcademicYear(fromYear) {
  const current = fromYear || getCurrentAcademicYear()
  const [start, end] = current.split('-').map(Number)
  return `${start + 1}-${end + 1}`
}

export default router