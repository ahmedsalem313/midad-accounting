-- ============================================
-- مداد المحاسبي - قاعدة البيانات
-- ============================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================
-- 1) المستخدمون والصلاحيات
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'teacher',
  base_salary REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  code TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INTEGER NOT NULL,
  permission_code TEXT NOT NULL,
  granted_by INTEGER,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- ============================================
-- 2) الطلاب
-- ============================================

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT,
  birth_date TEXT,
  gender TEXT,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_phone_alt TEXT,
  address TEXT,
  enrollment_date TEXT,
  total_fees REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- ============================================
-- 3) الأقساط والمدفوعات
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  due_date TEXT,
  payment_date TEXT,
  method TEXT DEFAULT 'cash',
  receipt_number TEXT UNIQUE,
  notes TEXT,
  recorded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================
-- 4) المصاريف
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  receipt_number TEXT,
  notes TEXT,
  recorded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ============================================
-- 5) الدرجات
-- ============================================

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  score REAL NOT NULL,
  max_score REAL DEFAULT 100,
  components TEXT,
  is_composite INTEGER DEFAULT 0,
  exam_date TEXT,
  semester TEXT,
  academic_year TEXT,
  notes TEXT,
  recorded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject);

-- ============================================
-- 6) جدول الحصص
-- ============================================

CREATE TABLE IF NOT EXISTS timetable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade TEXT NOT NULL,
  section TEXT,
  day_of_week INTEGER NOT NULL,
  period INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  room TEXT,
  academic_year TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(grade, section);

-- ============================================
-- 7) حضور المعلمين
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  check_in_time TEXT,
  check_out_time TEXT,
  late_minutes INTEGER DEFAULT 0,
  teacher_note TEXT,
  admin_note TEXT,
  recorded_by INTEGER,
  confirmed_by INTEGER,
  confirmed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id),
  UNIQUE(teacher_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON teacher_attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON teacher_attendance(teacher_id);

-- ============================================
-- 8) بيانات رواتب المعلمين (الثابتة)
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_salaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL UNIQUE,
  base_salary REAL NOT NULL DEFAULT 0,
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

-- ============================================
-- 9) كشوف الرواتب الشهرية
-- ============================================

CREATE TABLE IF NOT EXISTS payroll_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  base_salary REAL NOT NULL,
  allowances REAL DEFAULT 0,
  bonus REAL DEFAULT 0,
  absence_deduction REAL DEFAULT 0,
  late_deduction REAL DEFAULT 0,
  advances_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  net_salary REAL NOT NULL,
  attendance_days INTEGER DEFAULT 0,
  absence_days INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  manual_adjustment REAL DEFAULT 0,
  adjustment_note TEXT,
  paid_at DATETIME,
  paid_method TEXT,
  created_by INTEGER,
  approved_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  UNIQUE(teacher_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(year, month);

-- ============================================
-- 10) السلف
-- ============================================

CREATE TABLE IF NOT EXISTS advances (
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
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_advances_teacher ON advances(teacher_id);
CREATE INDEX IF NOT EXISTS idx_advances_status ON advances(status);

-- ============================================
-- 11) الرسائل (واتساب)
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_type TEXT NOT NULL,
  recipient_id INTEGER,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  template TEXT,
  status TEXT DEFAULT 'pending',
  error TEXT,
  sent_at DATETIME,
  sent_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sent_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- ============================================
-- 12) الإعدادات
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13) سجل النشاطات
-- ============================================

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at);