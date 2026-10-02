const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// ============================================
// 1) حقول إضافية في students
// ============================================
const cols = db.prepare('PRAGMA table_info(students)').all();

const addCol = (name, type) => {
  if (!cols.some(c => c.name === name)) {
    db.exec(`ALTER TABLE students ADD COLUMN ${name} ${type}`);
    console.log(`✅ students.${name}`);
  } else {
    console.log(`ℹ️ students.${name} موجود`);
  }
};

addCol('absence_total', 'INTEGER DEFAULT 0');
addCol('absence_streak', 'INTEGER DEFAULT 0');
addCol('absence_status', "TEXT DEFAULT 'active'");  // active | warning | warned | suspended | expelled
addCol('absence_level', 'INTEGER DEFAULT 0');       // 0=none, 1=warn1, 2=warn2, 3=pledge, 4=expelled
addCol('last_absence_date', 'TEXT');

// ============================================
// 2) جدول سجل الإنذارات
// ============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS absence_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    level TEXT NOT NULL,
    reason TEXT NOT NULL,
    absence_total INTEGER,
    absence_streak INTEGER,
    action_taken TEXT,
    notes TEXT,
    issued_by INTEGER,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cancelled INTEGER DEFAULT 0,
    cancelled_by INTEGER,
    cancelled_at DATETIME,
    cancel_reason TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id),
    FOREIGN KEY (cancelled_by) REFERENCES users(id)
  );
`);
console.log('✅ absence_warnings');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_warnings_student 
  ON absence_warnings(student_id);
`);
console.log('✅ الفهارس');

// ============================================
// 3) إعدادات الحدود
// ============================================
const settings = [
  // ابتدائي
  ['abs_primary_streak_1', '3'],
  ['abs_primary_streak_2', '7'],
  ['abs_primary_total_pledge', '30'],
  ['abs_primary_total_written', '45'],
  ['abs_primary_total_expel', '51'],
  
  // ثانوي
  ['abs_secondary_streak_1', '7'],
  ['abs_secondary_streak_2', '14'],
  ['abs_secondary_streak_3', '21'],
  ['abs_secondary_total_expel', '26'],
];

const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
settings.forEach(([k, v]) => insert.run(k, v));
console.log('✅ الإعدادات');

console.log('🎉 كل الجداول والحقول جاهزة!');
db.close();