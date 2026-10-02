const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// ============================================
// جدول الواجبات
// ============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    grade TEXT NOT NULL,
    section TEXT,
    subject TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    max_score REAL DEFAULT 100,
    academic_year TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
console.log('✅ assignments');

// ============================================
// جدول تسليم الواجبات
// ============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    score REAL,
    submitted_at DATETIME,
    notes TEXT,
    graded_by INTEGER,
    graded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id),
    UNIQUE(assignment_id, student_id)
  );
`);
console.log('✅ assignment_submissions');

// ============================================
// فهارس
// ============================================
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_assignments_grade 
    ON assignments(grade, section);
  CREATE INDEX IF NOT EXISTS idx_assignments_teacher 
    ON assignments(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_due 
    ON assignments(due_date);
  CREATE INDEX IF NOT EXISTS idx_submissions_assignment 
    ON assignment_submissions(assignment_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_student 
    ON assignment_submissions(student_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_status 
    ON assignment_submissions(status);
`);
console.log('✅ الفهارس');

// ============================================
// صلاحيات جديدة
// ============================================
const newPerms = [
  ['assignments.view',   'عرض الواجبات',      'View Assignments',   'assignments'],
  ['assignments.create', 'إنشاء واجب',         'Create Assignment',  'assignments'],
  ['assignments.edit',   'تعديل واجب',         'Edit Assignment',    'assignments'],
  ['assignments.delete', 'حذف واجب',           'Delete Assignment',  'assignments'],
  ['assignments.grade',  'تصحيح واجب',         'Grade Assignment',   'assignments'],
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO permissions (code, name_ar, name_en, category)
  VALUES (?, ?, ?, ?)
`);
newPerms.forEach(p => insert.run(...p));
console.log('✅ الصلاحيات');

console.log('');
console.log('🎉 كل الجداول جاهزة!');
db.close();