import { getDB } from '../database/db.js'

// ============================================
// جلب إعدادات الحدود
// ============================================
function getLimits(db, student) {
  const getSetting = (key, def) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? parseInt(row.value) : def
  }

  // تحديد المرحلة
  const schoolType = db.prepare("SELECT value FROM settings WHERE key = 'school_type'").get()
  const isSecondary = (schoolType?.value === 'secondary')

  if (isSecondary) {
    return {
      type: 'secondary',
      streak_1: getSetting('abs_secondary_streak_1', 7),
      streak_2: getSetting('abs_secondary_streak_2', 14),
      streak_3: getSetting('abs_secondary_streak_3', 21),
      total_expel: getSetting('abs_secondary_total_expel', 26),
      has_level_3: true,  // ثانوي فيه 3 إنذارات
      has_pledges: false, // ثانوي ما فيه تعهدات
    }
  } else {
    return {
      type: 'primary',
      streak_1: getSetting('abs_primary_streak_1', 3),
      streak_2: getSetting('abs_primary_streak_2', 7),
      streak_3: null,
      total_pledge: getSetting('abs_primary_total_pledge', 30),
      total_written: getSetting('abs_primary_total_written', 45),
      total_expel: getSetting('abs_primary_total_expel', 51),
      has_level_3: false,
      has_pledges: true,  // ابتدائي فيه تعهدات
    }
  }
}

// ============================================
// تحديد المستوى بناءً على الغياب
// ============================================
export function calculateAbsenceLevel(student) {
  const db = getDB()
  const limits = getLimits(db, student)
  
  const streak = student.absence_streak || 0
  const total = student.absence_total || 0

  if (limits.type === 'primary') {
    // ابتدائي: فصل → تعهد خطي → تعهد → إنذار 2 → إنذار 1
    if (total >= limits.total_expel) {
      return { level: 4, code: 'expelled', label: 'راسب بالغياب', severity: 'critical' }
    }
    if (total >= limits.total_written) {
      return { level: 3, code: 'written_pledge', label: 'تعهد خطي', severity: 'high' }
    }
    if (total >= limits.total_pledge) {
      return { level: 3, code: 'pledge', label: 'تعهد', severity: 'high' }
    }
    if (streak >= limits.streak_2) {
      return { level: 2, code: 'warn_2', label: 'إنذار ثاني + استدعاء', severity: 'medium' }
    }
    if (streak >= limits.streak_1) {
      return { level: 1, code: 'warn_1', label: 'إنذار أول', severity: 'low' }
    }
  } else {
    // ثانوي: فصل → إنذار 3 → إنذار 2 → إنذار 1
    if (total >= limits.total_expel) {
      return { level: 4, code: 'expelled', label: 'راسب بالغياب', severity: 'critical' }
    }
    if (streak >= limits.streak_3) {
      return { level: 3, code: 'warn_3', label: 'إنذار ثالث + تعهد', severity: 'high' }
    }
    if (streak >= limits.streak_2) {
      return { level: 2, code: 'warn_2', label: 'إنذار ثاني + استدعاء', severity: 'medium' }
    }
    if (streak >= limits.streak_1) {
      return { level: 1, code: 'warn_1', label: 'إنذار أول', severity: 'low' }
    }
  }

  return { level: 0, code: 'active', label: 'نشط', severity: 'none' }
}

// ============================================
// تسجيل غياب وتحديث العدّادات
// ============================================
export function recordAbsence(studentId, date) {
  const db = getDB()

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
  if (!student) return null

  const today = date
  const lastAbsence = student.last_absence_date

  // حساب الأيام منذ آخر غياب (بدون عطل)
  let newStreak = student.absence_streak || 0

  if (lastAbsence) {
    const last = new Date(lastAbsence)
    const curr = new Date(today)
    const diffDays = Math.floor((curr - last) / (1000 * 60 * 60 * 24))

    // إذا كان الفرق 1 أو 2 (يعني يوم أو يومين) — نكمل السلسلة
    // مع مراعاة عطلة نهاية الأسبوع
    const lastDow = last.getDay() // 0 = أحد، 5 = جمعة، 6 = سبت
    const currDow = curr.getDay()

    // حساب الأيام الفعلية بينهما (بدون جُمَع)
    let workingDaysBetween = 0
    for (let d = new Date(last); d < curr; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay()
      if (dow !== 5 && dow !== 6) workingDaysBetween++ // الجمعة والسبت عطلة
    }

    // إذا بينهما يوم دوام واحد فقط (يعني آخر غياب كان يوم دوام سابق مباشرة)
    if (workingDaysBetween === 1) {
      newStreak = (student.absence_streak || 0) + 1
    } else if (workingDaysBetween > 1) {
      // انقطاع، ابدأ من 1
      newStreak = 1
    } else {
      // نفس اليوم — لا تكرار
      newStreak = student.absence_streak || 1
    }
  } else {
    newStreak = 1
  }

  const newTotal = (student.absence_total || 0) + 1

  // تحديث الطالب
  db.prepare(`
    UPDATE students
    SET absence_streak = ?,
        absence_total = ?,
        last_absence_date = ?
    WHERE id = ?
  `).run(newStreak, newTotal, today, studentId)

  // جلب الطالب المحدّث
  const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)

  // حساب المستوى الجديد
  const oldLevel = student.absence_level || 0
  const newLevelInfo = calculateAbsenceLevel(updated)
  const newLevel = newLevelInfo.level

  // تحديث الحالة والمستوى
  db.prepare(`
    UPDATE students
    SET absence_level = ?, absence_status = ?
    WHERE id = ?
  `).run(newLevel, newLevelInfo.code, studentId)

  // إذا ارتفع المستوى → سجّل إنذار
  if (newLevel > oldLevel) {
    db.prepare(`
      INSERT INTO absence_warnings (
        student_id, level, reason, absence_total, absence_streak, action_taken
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      studentId,
      newLevelInfo.code,
      `تلقائي: ${newLevelInfo.label}`,
      newTotal,
      newStreak,
      newLevelInfo.code
    )
  }

  return {
    student: updated,
    oldLevel,
    newLevel,
    levelInfo: newLevelInfo,
    isNewWarning: newLevel > oldLevel,
  }
}

// ============================================
// إعادة تعيين العدّاد عند الحضور
// ============================================
export function recordAttendance(studentId) {
  const db = getDB()

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
  if (!student) return null

  // تصفير العدّاد المتتالي فقط
  db.prepare(`
    UPDATE students
    SET absence_streak = 0
    WHERE id = ?
  `).run(studentId)

  return { streak: 0 }
}

// ============================================
// إلغاء إنذار (للمدير)
// ============================================
export function cancelWarning(warningId, userId, reason) {
  const db = getDB()

  db.prepare(`
    UPDATE absence_warnings
    SET cancelled = 1, cancelled_by = ?, cancelled_at = CURRENT_TIMESTAMP, cancel_reason = ?
    WHERE id = ?
  `).run(userId, reason || null, warningId)

  return { success: true }
}

// ============================================
// إعادة حساب كامل للطالب (للمدير)
// ============================================
export function recalculateStudent(studentId) {
  const db = getDB()

  // جلب كل غيابات الطالب
  const attendances = db.prepare(`
    SELECT date, status FROM student_attendance
    WHERE student_id = ?
    ORDER BY date ASC
  `).all(studentId)

  let total = 0
  let streak = 0
  let lastDate = null

  for (const att of attendances) {
    if (att.status === 'absent') {
      // تحقق من الاستمرارية (بدون عطل)
      if (lastDate) {
        const last = new Date(lastDate)
        const curr = new Date(att.date)
        let workingDaysBetween = 0
        for (let d = new Date(last); d < curr; d.setDate(d.getDate() + 1)) {
          const dow = d.getDay()
          if (dow !== 5 && dow !== 6) workingDaysBetween++
        }
        if (workingDaysBetween === 1) {
          streak++
        } else if (workingDaysBetween > 1) {
          streak = 1
        }
      } else {
        streak = 1
      }
      total++
      lastDate = att.date
    } else if (att.status === 'present') {
      // تصفير السلسلة
      streak = 0
    }
    // إذا excused → لا تغيير
  }

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
  const updated = { ...student, absence_total: total, absence_streak: streak }
  const levelInfo = calculateAbsenceLevel(updated)

  db.prepare(`
    UPDATE students
    SET absence_total = ?, absence_streak = ?, 
        absence_level = ?, absence_status = ?
    WHERE id = ?
  `).run(total, streak, levelInfo.level, levelInfo.code, studentId)

  return {
    total, streak,
    level: levelInfo.level,
    status: levelInfo.code,
    label: levelInfo.label,
  }
}