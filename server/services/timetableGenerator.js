// server/services/timetableGenerator.js
import { getDB } from '../database/db.js'

const DAY_NAMES = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

/**
 * توليد الجدول الدراسي لصف/شعبة محددة
 */
export function generateTimetable({ grade, section, academicYear }) {
  const db = getDB()

  // 1) جلب الإعدادات
  const settings = db.prepare(`
    SELECT * FROM timetable_settings WHERE is_active = 1 ORDER BY id DESC LIMIT 1
  `).get()

  if (!settings) {
    throw new Error('لا توجد إعدادات للجدول. اضبط الإعدادات أولًا.')
  }

  const workingDays = JSON.parse(settings.working_days || '[]')
  const periodsPerDay = settings.periods_per_day
  const periodDuration = settings.period_duration
  const dayStart = settings.day_start_time
  const breaks = JSON.parse(settings.breaks || '[]')

  // 2) جلب المواد للصف/الشعبة
  let subjectsSql = `
    SELECT s.*, 
           (SELECT COUNT(*) FROM timetable_subject_teachers WHERE subject_id = s.id) as teachers_count
    FROM timetable_subjects s
    WHERE s.grade = ? AND (s.section = ? OR s.section IS NULL)
  `
  const subjects = db.prepare(subjectsSql).all(grade, section || null)

  if (subjects.length === 0) {
    throw new Error('لا توجد مواد مُدخلة لهذا الصف. أضف المواد أولًا.')
  }

  // 3) جلب معلمي كل مادة
  const getTeachers = db.prepare(`
    SELECT tst.teacher_id, tst.lessons_count, u.full_name
    FROM timetable_subject_teachers tst
    JOIN users u ON u.id = tst.teacher_id
    WHERE tst.subject_id = ?
  `)
  for (const s of subjects) {
    s.teachers = getTeachers.all(s.id)
  }

  // 4) توليد الفترات الزمنية
  const periods = computePeriodTimes(dayStart, periodDuration, periodsPerDay, breaks)

  // 5) بناء المهام (كل حصة = مهمة)
  const tasks = []
  for (const subject of subjects) {
    for (const teacher of subject.teachers) {
      for (let i = 0; i < teacher.lessons_count; i++) {
        tasks.push({
          subject_id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.full_name,
          grade: subject.grade,
          section: subject.section || section,
        })
      }
    }
  }

  // 6) ترتيب المهام: الأصعب أولًا (معلم مشغول في صفوف أخرى + مادة بحصص كثيرة)
  // حساب انشغال كل معلم في صفوف أخرى
  const teacherBusyLoad = {}
  for (const task of tasks) {
    teacherBusyLoad[task.teacher_id] = (teacherBusyLoad[task.teacher_id] || 0) + 1
  }

  tasks.sort((a, b) => {
    const loadDiff = (teacherBusyLoad[b.teacher_id] || 0) - (teacherBusyLoad[a.teacher_id] || 0)
    if (loadDiff !== 0) return loadDiff
    // عند التساوي: حسب عدد حصص المادة في الجدول الكلي
    const subjectLoadA = subjects.find((s) => s.id === a.subject_id)?.weekly_lessons || 0
    const subjectLoadB = subjects.find((s) => s.id === b.subject_id)?.weekly_lessons || 0
    return subjectLoadB - subjectLoadA
  })

  // 7) الجدول الفارغ: [اليوم][الحصة] = null
  const grid = {}
  for (const day of workingDays) {
    grid[day] = {}
    for (let p = 1; p <= periodsPerDay; p++) {
      grid[day][p] = null
    }
  }

  // 8) المعلمون المشغولون من الجداول الموجودة (صفوف أخرى)
  const teacherBusy = {} // { teacher_id: Set("day-period") }
  const existingSlots = db.prepare(`
    SELECT teacher_id, day_of_week, period FROM timetable
    WHERE grade != ? OR (section != ? OR section IS NULL)
  `).all(grade, section || null)

  for (const slot of existingSlots) {
    if (!teacherBusy[slot.teacher_id]) teacherBusy[slot.teacher_id] = new Set()
    teacherBusy[slot.teacher_id].add(`${slot.day_of_week}-${slot.period}`)
  }

  // 9) خوارزمية التوزيع
  const unassigned = []
  for (const task of tasks) {
    const placed = placeTask(task, grid, teacherBusy, workingDays, periodsPerDay, subjects)
    if (!placed) {
      unassigned.push(task)
    }
  }

  // 10) حفظ في قاعدة البيانات
  const tx = db.transaction(() => {
    // حذف الجدول الحالي للصف/الشعبة
    db.prepare(`
      DELETE FROM timetable
      WHERE grade = ? AND (section = ? OR (section IS NULL AND ? IS NULL))
    `).run(grade, section || null, section || null)

    // إدراج الحصص الجديدة
    const insert = db.prepare(`
      INSERT INTO timetable 
      (grade, section, day_of_week, period, start_time, end_time, subject, teacher_id, room, academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const day of workingDays) {
      for (let p = 1; p <= periodsPerDay; p++) {
        const cell = grid[day][p]
        if (cell) {
          const periodInfo = periods.find((pp) => pp.num === p)
          insert.run(
            grade,
            section || null,
            day,
            p,
            periodInfo?.start || '',
            periodInfo?.end || '',
            cell.subject_code,
            cell.teacher_id,
            null,
            academicYear || settings.academic_year
          )
        }
      }
    }
  })

  tx()

  return {
    placed: tasks.length - unassigned.length,
    total: tasks.length,
    unassigned,
  }
}

/**
 * محاولة وضع مهمة في مكان متاح
 */
function placeTask(task, grid, teacherBusy, workingDays, periodsPerDay, subjects) {
  // جمع كل الأماكن المتاحة
  const candidates = []

  // كم حصة موجودة لنفس المادة في كل يوم
  const lessonsPerDay = {}
  for (const day of workingDays) {
    lessonsPerDay[day] = 0
    for (let p = 1; p <= periodsPerDay; p++) {
      if (grid[day][p]?.subject_code === task.subject_code) {
        lessonsPerDay[day]++
      }
    }
  }

  // عدد الأيام المتاحة
  const daysAvailable = workingDays.length
  const subjectTotalLessons = subjects.find((s) => s.id === task.subject_id)?.weekly_lessons || 0
  const maxLessonsPerDay = Math.ceil(subjectTotalLessons / daysAvailable)

  for (const day of workingDays) {
    // تخطَّ إن كانت المادة قد استوفت الحد اليومي
    if (lessonsPerDay[day] >= maxLessonsPerDay) continue

    for (let p = 1; p <= periodsPerDay; p++) {
      if (grid[day][p]) continue // الخانة مشغولة

      // فحص تعارض المعلم
      const teacherSet = teacherBusy[task.teacher_id]
      if (teacherSet && teacherSet.has(`${day}-${p}`)) continue

      candidates.push({ day, period: p, dayLoad: lessonsPerDay[day] })
    }
  }

  if (candidates.length === 0) return false

  // ترتيب: أيام قليلة الحمل أولًا، ثم الحصص المبكرة
  candidates.sort((a, b) => {
    if (a.dayLoad !== b.dayLoad) return a.dayLoad - b.dayLoad
    return a.period - b.period
  })

  const chosen = candidates[0]
  grid[chosen.day][chosen.period] = {
    subject_id: task.subject_id,
    subject_code: task.subject_code,
    teacher_id: task.teacher_id,
  }

  // تحديث انشغال المعلم
  if (!teacherBusy[task.teacher_id]) teacherBusy[task.teacher_id] = new Set()
  teacherBusy[task.teacher_id].add(`${chosen.day}-${chosen.period}`)

  return true
}

/**
 * حساب أوقات الفترات مع الفسح
 */
function computePeriodTimes(dayStart, periodDuration, periodsPerDay, breaks) {
  const periods = []
  let [h, m] = (dayStart || '08:00').split(':').map(Number)
  for (let i = 1; i <= periodsPerDay; i++) {
    const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    m += periodDuration
    h += Math.floor(m / 60)
    m = m % 60
    const end = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    periods.push({ num: i, start, end })

    const brk = breaks.find((b) => b.after_period === i)
    if (brk) {
      m += brk.minutes
      h += Math.floor(m / 60)
      m = m % 60
    }
  }
  return periods
}