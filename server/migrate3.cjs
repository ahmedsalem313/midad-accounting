const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// حذف الجداول القديمة (فارغة)
db.exec('DROP TABLE IF EXISTS teacher_salaries');
db.exec('DROP TABLE IF EXISTS payroll_records');
db.exec('DROP TABLE IF EXISTS advances');

// ============================================
// جدول بيانات الرواتب (إعدادات كل معلم)
// ============================================
db.exec(`
  CREATE TABLE teacher_salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL UNIQUE,

    salary_type TEXT NOT NULL DEFAULT 'fixed',

    base_salary REAL DEFAULT 0,
    lesson_price REAL DEFAULT 0,
    hourly_rate REAL DEFAULT 0,
    commission_rate REAL DEFAULT 0,

    housing_allowance REAL DEFAULT 0,
    transport_allowance REAL DEFAULT 0,
    other_allowance REAL DEFAULT 0,

    absence_deduction_per_day REAL DEFAULT 0,
    late_deduction_per_minute REAL DEFAULT 0,

    effective_from TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
console.log('✅ teacher_salaries');

// ============================================
// جدول كشوف الرواتب الشهرية
// ============================================
db.exec(`
  CREATE TABLE payroll_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,

    salary_type TEXT NOT NULL,
    base_salary REAL DEFAULT 0,
    lesson_count INTEGER DEFAULT 0,
    lesson_price REAL DEFAULT 0,
    lesson_amount REAL DEFAULT 0,
    hourly_rate REAL DEFAULT 0,
    hours_count REAL DEFAULT 0,
    hourly_amount REAL DEFAULT 0,
    commission_rate REAL DEFAULT 0,
    commission_amount REAL DEFAULT 0,

    allowances REAL DEFAULT 0,
    bonus REAL DEFAULT 0,

    absence_deduction REAL DEFAULT 0,
    late_deduction REAL DEFAULT 0,
    advances_deduction REAL DEFAULT 0,
    other_deductions REAL DEFAULT 0,

    manual_adjustment REAL DEFAULT 0,
    adjustment_note TEXT,

    net_salary REAL NOT NULL,

    attendance_days INTEGER DEFAULT 0,
    absence_days INTEGER DEFAULT 0,
    late_count INTEGER DEFAULT 0,
    late_minutes INTEGER DEFAULT 0,
    working_days INTEGER DEFAULT 0,

    status TEXT DEFAULT 'draft',
    paid_at DATETIME,
    paid_method TEXT,

    created_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, month, year)
  );
`);
console.log('✅ payroll_records');

// ============================================
// جدول السلف
// ============================================
db.exec(`
  CREATE TABLE advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT,
    request_date TEXT NOT NULL,
    deduction_month INTEGER NOT NULL,
    deduction_year INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    requested_by INTEGER,
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
console.log('✅ advances');

console.log('📊 كل الجداول جاهزة');
db.close();