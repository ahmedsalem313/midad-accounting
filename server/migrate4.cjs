const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// جدول حضور وغياب الطلاب
db.exec(`
  CREATE TABLE IF NOT EXISTS student_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    session TEXT NOT NULL DEFAULT 'morning',
    status TEXT NOT NULL DEFAULT 'present',
    check_in_time TEXT,
    late_minutes INTEGER DEFAULT 0,
    notes TEXT,
    recorded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    UNIQUE(student_id, date, session)
  );
`);
console.log('✅ student_attendance');

// فهارس
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_attendance_student ON student_attendance(student_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON student_attendance(date);
`);
console.log('✅ الفهارس');

// إضافة حقول لجدول students
const cols = db.prepare('PRAGMA table_info(students)').all();
const hasStudentCode = cols.some(c => c.name === 'student_code');
const hasNationalId = cols.some(c => c.name === 'national_id');
const hasAbsenceLimit = cols.some(c => c.name === 'absence_limit');

if (!hasStudentCode) {
  db.exec('ALTER TABLE students ADD COLUMN student_code TEXT');
  console.log('✅ student_code');
} else {
  console.log('ℹ️ student_code موجود');
}

if (!hasNationalId) {
  db.exec('ALTER TABLE students ADD COLUMN national_id TEXT');
  console.log('✅ national_id');
} else {
  console.log('ℹ️ national_id موجود');
}

if (!hasAbsenceLimit) {
  db.exec('ALTER TABLE students ADD COLUMN absence_limit INTEGER DEFAULT 20');
  console.log('✅ absence_limit (افتراضي 20 يوم)');
} else {
  console.log('ℹ️ absence_limit موجود');
}

// إضافة إعدادات افتراضية للحضور
const defaults = [
  ['absence_limit_default', '20'],
  ['absence_warning_threshold', '15'],
  ['attendance_sessions', '["morning","afternoon"]'],
  ['school_start_time_morning', '08:00'],
  ['school_start_time_afternoon', '13:00'],
];

const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaults.forEach(([k, v]) => insert.run(k, v));
console.log('✅ إعدادات الحضور');

console.log('🎉 كل الجداول جاهزة!');
db.close();