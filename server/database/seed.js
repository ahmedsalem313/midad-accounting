import bcrypt from 'bcryptjs'
import { initDatabase, getDB } from './db.js'

console.log('🌱 Seeding database...')

initDatabase()
const db = getDB()

// ============================================
// 1) الصلاحيات
// ============================================
const permissions = [
  // الطلاب
  ['students.view',    'عرض الطلاب',       'View Students',    'students'],
  ['students.create',  'إضافة طالب',       'Create Student',   'students'],
  ['students.edit',    'تعديل طالب',       'Edit Student',     'students'],
  ['students.delete',  'حذف طالب',         'Delete Student',   'students'],

  // الأقساط
  ['payments.view',    'عرض الأقساط',      'View Payments',    'payments'],
  ['payments.create',  'تسجيل دفعة',       'Add Payment',      'payments'],
  ['payments.edit',    'تعديل دفعة',       'Edit Payment',     'payments'],
  ['payments.delete',  'حذف دفعة',         'Delete Payment',   'payments'],
  ['payments.print',   'طباعة إيصال',      'Print Receipt',    'payments'],

  // المصاريف
  ['expenses.view',    'عرض المصاريف',     'View Expenses',    'expenses'],
  ['expenses.create',  'إضافة مصروف',      'Add Expense',      'expenses'],
  ['expenses.edit',    'تعديل مصروف',      'Edit Expense',     'expenses'],
  ['expenses.delete',  'حذف مصروف',        'Delete Expense',   'expenses'],

    // الدرجات
  ['grades.view',           'عرض الدرجات',         'View Grades',         'grades'],
  ['grades.create',         'إدخال درجات',         'Add Grades',          'grades'],
  ['grades.edit',           'تعديل درجات',         'Edit Grades',         'grades'],
  ['grades.delete',         'حذف درجات',           'Delete Grades',       'grades'],
  ['grades.override_block', 'تجاوز حجب النتائج',   'Override Block',      'grades'],
  ['behavior.view',         'عرض السلوك',          'View Behavior',       'grades'],
  ['behavior.create',       'تقييم السلوك',        'Evaluate Behavior',   'grades'],
  ['behavior.delete',       'حذف تقييم السلوك',    'Delete Behavior',     'grades'],
  // جدول الحصص
  ['timetable.view',   'عرض جدول الحصص',   'View Timetable',   'timetable'],
  ['timetable.create', 'إنشاء جدول',       'Create Timetable', 'timetable'],
  ['timetable.edit',   'تعديل الجدول',     'Edit Timetable',   'timetable'],

  // الحضور
  ['attendance.view',  'عرض الحضور',       'View Attendance',  'attendance'],
  ['attendance.mark',  'تسجيل الحضور',     'Mark Attendance',  'attendance'],
  ['attendance.confirm','تأكيد الحضور',    'Confirm Attendance','attendance'],

  // الرواتب
  ['payroll.view',     'عرض الرواتب',      'View Payroll',     'payroll'],
  ['payroll.calculate','حساب الرواتب',     'Calculate Payroll','payroll'],
  ['payroll.pay',      'صرف الرواتب',      'Pay Salaries',     'payroll'],
  ['payroll.own',      'رؤية راتبي',       'View Own Salary',  'payroll'],

  // السلف
  ['advances.view',    'عرض السلف',        'View Advances',    'advances'],
  ['advances.request', 'طلب سلفة',         'Request Advance',  'advances'],
  ['advances.approve', 'الموافقة على سلفة','Approve Advance',  'advances'],

  // واتساب
  ['whatsapp.fees',    'إرسال تذكير أقساط','Send Fee Reminders','whatsapp'],
  ['whatsapp.grades',  'إرسال نتائج',      'Send Grades',      'whatsapp'],
  ['whatsapp.bulk',    'إرسال جماعي',      'Send Bulk',        'whatsapp'],

  // التقارير
  ['reports.financial','تقارير مالية',     'Financial Reports','reports'],
  ['reports.academic', 'تقارير أكاديمية',  'Academic Reports', 'reports'],
  ['reports.export',   'تصدير التقارير',   'Export Reports',   'reports'],

  // المستخدمون
  ['users.view',       'عرض المستخدمين',   'View Users',       'users'],
  ['users.create',     'إضافة مستخدم',     'Create User',      'users'],
  ['users.edit',       'تعديل مستخدم',     'Edit User',        'users'],
  ['users.delete',     'حذف مستخدم',       'Delete User',      'users'],
  ['users.permissions','إدارة الصلاحيات',  'Manage Permissions','users'],

  // الإعدادات
  ['settings.view',    'عرض الإعدادات',    'View Settings',    'settings'],
  ['settings.edit',    'تعديل الإعدادات',  'Edit Settings',    'settings'],

  // النسخ الاحتياطي
  ['backup.create',    'إنشاء نسخة',       'Create Backup',    'backup'],
  ['backup.restore',   'استعادة نسخة',     'Restore Backup',   'backup'],
]

const insertPerm = db.prepare(`
  INSERT OR IGNORE INTO permissions (code, name_ar, name_en, category)
  VALUES (?, ?, ?, ?)
`)

const insertManyPerms = db.transaction((perms) => {
  for (const p of perms) insertPerm.run(...p)
})
insertManyPerms(permissions)

console.log(`✅ ${permissions.length} permissions inserted`)

// ============================================
// 2) المستخدمون الافتراضيون
// ============================================
const defaultUsers = [
  {
    username: 'admin',
    password: 'admin123',
    full_name: 'مدير النظام',
    role: 'admin',
    phone: '07700000000',
  },
  {
    username: 'accountant',
    password: 'accountant123',
    full_name: 'المحاسب',
    role: 'accountant',
    phone: '07701111111',
  },
  {
    username: 'teacher',
    password: 'teacher123',
    full_name: 'معلم تجريبي',
    role: 'teacher',
    phone: '07702222222',
    base_salary: 1200000,
  },
]

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users 
  (username, password, full_name, role, phone, base_salary)
  VALUES (?, ?, ?, ?, ?, ?)
`)

for (const u of defaultUsers) {
  const hashed = bcrypt.hashSync(u.password, 10)
  insertUser.run(u.username, hashed, u.full_name, u.role, u.phone, u.base_salary || 0)
  console.log(`👤 User: ${u.username} / ${u.password}`)
}

// ============================================
// 3) الصلاحيات الافتراضية حسب الدور
// ============================================
function grantPermissions(username, codes) {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (!user) return

  const insert = db.prepare(`
    INSERT OR IGNORE INTO user_permissions (user_id, permission_code)
    VALUES (?, ?)
  `)

  const tx = db.transaction((codes) => {
    for (const code of codes) insert.run(user.id, code)
  })
  tx(codes)
  console.log(`🔐 Granted ${codes.length} permissions to ${username}`)
}

// المحاسب: كل شيء إلا إدارة المستخدمين والصلاحيات
const accountantPerms = permissions
  .map(p => p[0])
  .filter(c => !c.startsWith('users.'))

grantPermissions('accountant', accountantPerms)

// المعلم: صلاحيات محدودة
grantPermissions('teacher', [
  'students.view',
  'grades.view', 'grades.create', 'grades.edit',
  'behavior.view', 'behavior.create',
  'timetable.view',
  'attendance.view', 'attendance.mark',
  'payroll.own',
  'advances.request',
  'whatsapp.grades',
])

// ============================================
// 4) الإعدادات الافتراضية
// ============================================
const settings = [
  ['school_name',        'مدرسة مداد النموذجية'],
  ['school_phone',       '07700000000'],
  ['school_address',     'بغداد - العراق'],
  ['currency',           'IQD'],
  ['currency_symbol',    'د.ع'],
  ['language',           'ar'],
  ['academic_year',      '2026-2027'],
  ['weekend_days',       '[5,6]'],
  ['periods_per_day',    '6'],
  ['school_start_time',  '08:00'],
  ['school_end_time',    '14:00'],
  ['whatsapp_enabled',   'false'],
  ['backup_enabled',     'true'],
]

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`)
for (const s of settings) insertSetting.run(...s)

console.log('⚙️  Settings inserted')

// ============================================
// انتهى
// ============================================
console.log('')
console.log('╔════════════════════════════════════════════╗')
console.log('║   ✅ Seeding completed successfully!      ║')
console.log('╠════════════════════════════════════════════╣')
console.log('║   Users:                                   ║')
console.log('║   👑 admin       / admin123                ║')
console.log('║   💰 accountant  / accountant123           ║')
console.log('║   👨‍🏫 teacher     / teacher123              ║')
console.log('╚════════════════════════════════════════════╝')
console.log('')

process.exit(0)