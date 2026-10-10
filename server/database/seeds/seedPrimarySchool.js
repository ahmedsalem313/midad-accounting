// server/database/seeds/seedPrimarySchool.js
import { getDB } from '../db.js'
import { hashPassword } from '../../utils/bcrypt.js'
import {
  MALE_FIRST_NAMES, FEMALE_FIRST_NAMES, FAMILY_NAMES,
  ACCOUNTANT_NAMES, ADMIN_NAMES,
  generateStudentName, generateTeacherName,
  generateIraqiPhone, generateStudentNumber,
  pickRandom,
} from './data/arabicNames.js'
import { PRIMARY_SUBJECTS_BY_GRADE, PRIMARY_GRADES_LIST, SECTIONS } from './data/subjects.js'

// ============================================
// توليد بيانات مدرسة ابتدائية كاملة
// ============================================
export async function seedPrimarySchool() {
  const db = getDB()
    // إعادة تعيين مؤشر تدوير المعلمين
  global.teacherRotation = {}
  const stats = {
    teachers: 0,
    accountants: 0,
    admins: 0,
    students: 0,
    subjects: 0,
    subjectTeachers: 0,
    timetableEntries: 0,
    grades: 0,
    payments: 0,
    expenses: 0,
    rewards: 0,
  }

  console.log('🚀 بدء توليد بيانات المدرسة الابتدائية...')

  // ============================================
  // 1) حذف البيانات القديمة (بترتيب آمن)
  // ============================================
  console.log('🧹 حذف البيانات القديمة...')

  db.exec(`
    DELETE FROM grades;
    DELETE FROM payments;
    DELETE FROM student_attendance;
    DELETE FROM teacher_attendance;
    DELETE FROM advances;
    DELETE FROM payroll_records;
    DELETE FROM teacher_rewards;
    DELETE FROM teacher_salaries;
    DELETE FROM timetable_subject_teachers;
    DELETE FROM timetable_subjects;
    DELETE FROM timetable;
    DELETE FROM student_history;
    DELETE FROM promotions;
    DELETE FROM messages;
    DELETE FROM notifications;
    DELETE FROM activity_log;
    DELETE FROM expenses;
    DELETE FROM students;
    DELETE FROM user_permissions;
    DELETE FROM users WHERE username != 'admin';
  `)

  // ============================================
  // 2) إعدادات المدرسة
  // ============================================
  const upsertSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)

  upsertSetting.run('school_name', 'مدرسة النور الابتدائية النموذجية')
  upsertSetting.run('school_type', 'primary')
  upsertSetting.run('school_gender', 'mixed')
  upsertSetting.run('working_days', JSON.stringify([0, 1, 2, 3, 4, 5]))
  upsertSetting.run('block_grades_enabled', 'false')
  upsertSetting.run('block_grades_min_debt', '0')
  upsertSetting.run('academic_year', '2025-2026')

  // ============================================
  // 3) إعدادات الجدول
  // ============================================
  db.exec(`DELETE FROM timetable_settings`)
  db.prepare(`
    INSERT INTO timetable_settings
    (academic_year, working_days, periods_per_day, period_duration, day_start_time, breaks, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(
    '2025-2026',
    JSON.stringify([0, 1, 2, 3, 4, 5]),
    6,
    45,
    '08:00',
    JSON.stringify([{ after_period: 3, minutes: 20 }])
  )

  // ============================================
  // 4) إنشاء المعلمين
  // ============================================
  console.log('👨‍🏫 إنشاء المعلمين...')

  const teacherPassword = await hashPassword('teacher123')

  // مواد أساسية + عدد المعلمين لكل مادة
   const teacherPlan = [
    { subject: 'islamic',   count: 5 },
    { subject: 'arabic',    count: 6 },
    { subject: 'english',   count: 6 },
    { subject: 'math',      count: 6 },
    { subject: 'science',   count: 4 },
    { subject: 'social',    count: 3 },
    { subject: 'computer',  count: 2 },
    { subject: 'art',       count: 2 },
    { subject: 'pe',        count: 2 },
  ]
  const teachersBySubject = {}
  let teacherIndex = 1

  for (const plan of teacherPlan) {
    teachersBySubject[plan.subject] = []
    for (let i = 0; i < plan.count; i++) {
      const gender = Math.random() > 0.5 ? 'female' : 'male'
      const { full_name } = generateTeacherName(gender)
      const username = `teacher${teacherIndex}`
      const phone = generateIraqiPhone()

      const r = db.prepare(`
        INSERT INTO users
        (username, password, full_name, phone, role, is_active)
        VALUES (?, ?, ?, ?, 'teacher', 1)
      `).run(username, teacherPassword, full_name, phone)

      teachersBySubject[plan.subject].push({
        id: r.lastInsertRowid,
        name: full_name,
        gender,
      })
      teacherIndex++
      stats.teachers++
    }
  }

  // ============================================
  // 5) إنشاء المحاسبين والمديرين
  // ============================================
  console.log('💰 إنشاء المحاسبين والمديرين...')

  const accountantPassword = await hashPassword('accountant123')
  const adminPassword = await hashPassword('admin123')

  const accountants = []
  for (const acc of ACCOUNTANT_NAMES) {
    const { full_name } = generateTeacherName(acc.gender)
    const username = `accountant${accountants.length + 1}`
    const r = db.prepare(`
      INSERT INTO users
      (username, password, full_name, phone, role, is_active)
      VALUES (?, ?, ?, ?, 'accountant', 1)
    `).run(username, accountantPassword, full_name, generateIraqiPhone())
    accountants.push({ id: r.lastInsertRowid, name: full_name })
    stats.accountants++
  }

  // ============================================
  // 6) إنشاء الطلاب
  // ============================================
  console.log('👥 إنشاء الطلاب (540 طالب)...')

  const students = []
  let studentIndex = 1

  for (const grade of PRIMARY_GRADES_LIST) {
    for (const section of SECTIONS) {
      for (let i = 0; i < 30; i++) {
        const gender = Math.random() > 0.5 ? 'female' : 'male'
        const { full_name, father_name } = generateStudentName(gender)
        const phone = generateIraqiPhone()
        const studentNumber = generateStudentNumber(studentIndex)

        const r = db.prepare(`
          INSERT INTO students
          (student_number, full_name, grade, section, gender,
           guardian_name, guardian_phone, total_fees, status, enrollment_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `).run(
          studentNumber,
          full_name,
          grade,
          section,
          gender,
          father_name + ' ' + full_name.split(' ').slice(-1)[0],
          phone,
          750000,
          '2025-09-01'
        )

        students.push({
          id: r.lastInsertRowid,
          name: full_name,
          grade,
          section,
          gender,
        })
        stats.students++
        studentIndex++
      }
    }
  }

  // ============================================
  // 7) المواد لكل صف/شعبة + ربط المعلمين
  // ============================================
  console.log('📚 إدخال المواد وربط المعلمين...')

  const subjectsByGrade = {}

  for (const grade of PRIMARY_GRADES_LIST) {
    subjectsByGrade[grade] = {}
    const gradeSubjects = PRIMARY_SUBJECTS_BY_GRADE[grade]

    for (const section of SECTIONS) {
      subjectsByGrade[grade][section] = {}

      for (const subject of gradeSubjects) {
        // إدخال المادة
        const r = db.prepare(`
          INSERT INTO timetable_subjects
          (grade, section, subject_code, subject_name, weekly_lessons, academic_year)
          VALUES (?, ?, ?, ?, ?, '2025-2026')
        `).run(grade, section, subject.code, subject.name, subject.weekly)

        const subjectId = r.lastInsertRowid
        stats.subjects++

        subjectsByGrade[grade][section][subject.code] = {
          id: subjectId,
          weekly: subject.weekly,
          teachers: [],
        }

              // توزيع ذكي: نستخدم مؤشر عالمي لكل مادة لتدوير المعلمين
        const availableTeachers = teachersBySubject[subject.code] || []
        if (availableTeachers.length === 0) continue

        // مؤشر عالمي لكل مادة (يستمر عبر الصفوف)
        if (!global.teacherRotation) global.teacherRotation = {}
        if (!global.teacherRotation[subject.code]) global.teacherRotation[subject.code] = 0

        // اختر معلمًا بالتدوير
        const t = availableTeachers[global.teacherRotation[subject.code] % availableTeachers.length]
        global.teacherRotation[subject.code]++

        // سجّل الربط
        db.prepare(`
          INSERT INTO timetable_subject_teachers (subject_id, teacher_id, lessons_count)
          VALUES (?, ?, ?)
        `).run(subjectId, t.id, subject.weekly)

        subjectsByGrade[grade][section][subject.code].teachers.push({
          id: t.id,
          count: subject.weekly,
        })
        stats.subjectTeachers++
      }
    }
  }

  // ============================================
  // 8) توليد الجدول الدراسي
  // ============================================
  console.log('📅 توليد الجداول الدراسية (قد يستغرق دقيقة)...')

  const { generateTimetable } = await import('../../services/timetableGenerator.js')

  for (const grade of PRIMARY_GRADES_LIST) {
    for (const section of SECTIONS) {
      try {
        const result = generateTimetable({
          grade,
          section,
          academicYear: '2025-2026',
        })
        stats.timetableEntries += result.placed
      } catch (e) {
        console.warn(`⚠️ فشل توليد جدول ${grade} - ${section}:`, e.message)
      }
    }
  }

  // ============================================
  // 9) الدرجات (فصلية — 4 امتحانات لكل مادة)
  // ============================================
  console.log('📝 إدخال الدرجات...')

  const examTypes = [
    { type: 'monthly_1', max: 20, month: 10 },
    { type: 'monthly_2', max: 20, month: 11 },
    { type: 'midterm',   max: 30, month: 1 },
    { type: 'final',     max: 30, month: 4 },
  ]

  const insertGrade = db.prepare(`
    INSERT INTO grades
    (student_id, subject, exam_type, score, max_score, exam_date, semester, academic_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, '2025-2026')
  `)

  const txGrades = db.transaction(() => {
    for (const student of students) {
      const subjects = PRIMARY_SUBJECTS_BY_GRADE[student.grade]
      for (const subject of subjects) {
        for (const exam of examTypes) {
          // درجة عشوائية واقعية (60% - 100%)
          const percentage = 0.6 + Math.random() * 0.4
          const score = Math.round(exam.max * percentage)

          insertGrade.run(
            student.id,
            subject.code,
            exam.type,
            score,
            exam.max,
            `2025-${String(exam.month).padStart(2, '0')}-15`,
            exam.month <= 12 ? 'first' : 'second'
          )
          stats.grades++
        }
      }
    }
  })
  txGrades()

  // ============================================
  // 10) المدفوعات (60% دفعوا كامل، 30% جزئي، 10% لم يدفعوا)
  // ============================================
  console.log('💵 إدخال المدفوعات...')

  const insertPayment = db.prepare(`
    INSERT INTO payments
    (student_id, amount, paid_amount, payment_date, method, receipt_number, notes, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const txPayments = db.transaction(() => {
    let receiptNum = 1000
    for (const student of students) {
      const roll = Math.random()
      let paidAmount = 0
      let method = 'cash'
      let date = null

      if (roll < 0.6) {
        // دفع كامل
        paidAmount = 750000
        method = pickRandom(['cash', 'cash', 'cash', 'transfer'])
        const month = 9 + Math.floor(Math.random() * 3) // 9-11
        date = `2025-${String(month).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`
      } else if (roll < 0.9) {
        // دفع جزئي
        paidAmount = pickRandom([250000, 375000, 500000])
        method = 'cash'
        const month = 9 + Math.floor(Math.random() * 4)
        date = `2025-${String(month).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`
      }

      if (paidAmount > 0) {
        insertPayment.run(
          student.id,
          750000,
          paidAmount,
          date,
          method,
          `REC-${receiptNum++}`,
          null,
          1
        )
        stats.payments++
      }
    }
  })
  txPayments()

  // ============================================
  // 11) الحضور (شهر أكتوبر)
  // ============================================
  console.log('✅ إدخال الحضور...')

  const insertAttendance = db.prepare(`
    INSERT INTO teacher_attendance
    (teacher_id, date, status, check_in_time, check_out_time, late_minutes, confirmed_by)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `)

  const allTeachers = Object.values(teachersBySubject).flat()
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  const txAtt = db.transaction(() => {
    for (let day = 1; day <= 20; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayOfWeek = new Date(dateStr).getDay()
      if (dayOfWeek === 5 || dayOfWeek === 6) continue // تخطى الجمعة والسبت

      for (const teacher of allTeachers) {
        const roll = Math.random()
        let status = 'present'
        let lateMin = 0
        let checkIn = '08:00'

        if (roll < 0.85) {
          status = 'present'
        } else if (roll < 0.95) {
          status = 'late'
          lateMin = 5 + Math.floor(Math.random() * 30)
          checkIn = `08:${String(lateMin).padStart(2, '0')}`
        } else {
          status = 'absent'
        }

        insertAttendance.run(
          teacher.id,
          dateStr,
          status,
          status === 'absent' ? null : checkIn,
          status === 'absent' ? null : '13:00',
          lateMin
        )
      }
    }
  })
  txAtt()

  // ============================================
  // 12) المصاريف
  // ============================================
  console.log('📊 إدخال المصاريف...')

  const insertExpense = db.prepare(`
    INSERT INTO expenses
    (category, description, amount, expense_date, payment_method, recorded_by)
    VALUES (?, ?, ?, ?, 'cash', 1)
  `)

  const expenses = [
    { cat: 'rent',        desc: 'إيجار المدرسة - تشرين الأول', amount: 2000000, date: '2025-10-01' },
    { cat: 'electricity', desc: 'فاتورة كهرباء', amount: 350000, date: '2025-10-05' },
    { cat: 'water',       desc: 'فاتورة ماء', amount: 150000, date: '2025-10-05' },
    { cat: 'internet',    desc: 'اشتراك إنترنت', amount: 100000, date: '2025-10-03' },
    { cat: 'stationery',  desc: 'قرطاسية ومستلزمات', amount: 250000, date: '2025-10-08' },
    { cat: 'cleaning',    desc: 'مواد تنظيف', amount: 80000, date: '2025-10-10' },
    { cat: 'salaries',    desc: 'رواتب المعلمين - أيلول', amount: 4500000, date: '2025-10-01' },
  ]

  for (const e of expenses) {
    insertExpense.run(e.cat, e.desc, e.amount, e.date)
    stats.expenses++
  }

  // ============================================
  // 13) المكافآت
  // ============================================
  console.log('🎁 إدخال المكافآت...')

  const insertReward = db.prepare(`
    INSERT INTO teacher_rewards
    (teacher_id, category, title, description, amount, reward_month, reward_year, paid, granted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
  `)

  const rewardTitles = [
    { cat: 'attendance', title: 'التزام كامل بالدوام', amount: 100000 },
    { cat: 'performance', title: 'أداء متميز', amount: 150000 },
    { cat: 'extra_work', title: 'مهام إضافية', amount: 75000 },
  ]

  for (let i = 0; i < 5; i++) {
    const teacher = pickRandom(allTeachers)
    const r = pickRandom(rewardTitles)
    insertReward.run(
      teacher.id,
      r.cat,
      r.title,
      'مكافأة شهرية',
      r.amount,
      currentMonth,
      currentYear
    )
    stats.rewards++
  }

  console.log('✅ اكتمل التوليد!')
  console.log('')
  console.log('📊 الإحصائيات:')
  console.log(`  👥 الطلاب: ${stats.students}`)
  console.log(`  👨‍🏫 المعلمون: ${stats.teachers}`)
  console.log(`  💰 المحاسبون: ${stats.accountants}`)
  console.log(`  📚 المواد: ${stats.subjects}`)
  console.log(`  🔗 ربط المواد بالمعلمين: ${stats.subjectTeachers}`)
  console.log(`  📅 حصص الجدول: ${stats.timetableEntries}`)
  console.log(`  📝 الدرجات: ${stats.grades}`)
  console.log(`  💵 المدفوعات: ${stats.payments}`)
  console.log(`  📊 المصاريف: ${stats.expenses}`)
  console.log(`  🎁 المكافآت: ${stats.rewards}`)
  console.log('')
  console.log('🔑 بيانات الدخول:')
  console.log('  مدير: admin / admin123')
  console.log('  معلم: teacher1 / teacher123')
  console.log('  محاسب: accountant1 / accountant123')
  console.log('')

  return stats
}