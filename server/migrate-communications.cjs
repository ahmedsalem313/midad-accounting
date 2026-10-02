const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// جدول سجل التواصل
db.exec(`
  CREATE TABLE IF NOT EXISTS communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    result TEXT,
    result_status TEXT DEFAULT 'pending',
    communication_date TEXT NOT NULL,
    follow_up_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
console.log('✅ communications');

// فهارس
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_comm_student ON communications(student_id);
  CREATE INDEX IF NOT EXISTS idx_comm_teacher ON communications(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_comm_type ON communications(type);
  CREATE INDEX IF NOT EXISTS idx_comm_date ON communications(communication_date);
  CREATE INDEX IF NOT EXISTS idx_comm_status ON communications(result_status);
`);
console.log('✅ الفهارس');

// صلاحيات
const newPerms = [
  ['communications.view',   'عرض سجل التواصل',    'View Communications',  'communications'],
  ['communications.create', 'إضافة سجل تواصل',    'Add Communication',    'communications'],
  ['communications.edit',   'تعديل سجل تواصل',    'Edit Communication',   'communications'],
  ['communications.delete', 'حذف سجل تواصل',      'Delete Communication', 'communications'],
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO permissions (code, name_ar, name_en, category)
  VALUES (?, ?, ?, ?)
`);
newPerms.forEach(p => insert.run(...p));
console.log('✅ الصلاحيات');

// منح الصلاحيات للمعلمين والمدير
const users = db.prepare("SELECT id FROM users WHERE role IN ('teacher', 'admin', 'accountant')").all();
const grantPerm = db.prepare(`
  INSERT OR IGNORE INTO user_permissions (user_id, permission_code, granted_by)
  VALUES (?, ?, NULL)
`);

const tx = db.transaction(() => {
  for (const u of users) {
    for (const p of newPerms) {
      grantPerm.run(u.id, p[0]);
    }
  }
});
tx();
console.log('✅ منحت الصلاحيات لـ', users.length, 'مستخدم');

console.log('');
console.log('🎉 جاهز!');
db.close();