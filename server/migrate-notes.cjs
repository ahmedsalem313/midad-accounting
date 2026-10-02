const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// جدول ملاحظات الطلاب
db.exec(`
  CREATE TABLE IF NOT EXISTS student_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    title TEXT,
    content TEXT NOT NULL,
    is_public INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
console.log('✅ student_notes');

// فهارس
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id);
  CREATE INDEX IF NOT EXISTS idx_notes_teacher ON student_notes(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_notes_category ON student_notes(category);
  CREATE INDEX IF NOT EXISTS idx_notes_public ON student_notes(is_public);
`);
console.log('✅ الفهارس');

// صلاحيات
const newPerms = [
  ['notes.view',   'عرض الملاحظات',    'View Notes',    'notes'],
  ['notes.create', 'إضافة ملاحظة',     'Add Note',      'notes'],
  ['notes.edit',   'تعديل ملاحظة',     'Edit Note',     'notes'],
  ['notes.delete', 'حذف ملاحظة',       'Delete Note',   'notes'],
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO permissions (code, name_ar, name_en, category)
  VALUES (?, ?, ?, ?)
`);
newPerms.forEach(p => insert.run(...p));
console.log('✅ الصلاحيات');

// إعطاء الصلاحيات لكل المعلمين الحاليين
const teachers = db.prepare("SELECT id FROM users WHERE role IN ('teacher', 'admin')").all();
const grantPerm = db.prepare(`
  INSERT OR IGNORE INTO user_permissions (user_id, permission_code, granted_by)
  VALUES (?, ?, NULL)
`);

const tx = db.transaction(() => {
  for (const t of teachers) {
    for (const p of newPerms) {
      grantPerm.run(t.id, p[0]);
    }
  }
});
tx();
console.log('✅ منحت الصلاحيات لـ', teachers.length, 'مستخدم');

console.log('');
console.log('🎉 جاهز!');
db.close();