const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// ============================================
// جدول الأحداث الأكاديمية
// ============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS academic_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'event',
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_holiday INTEGER DEFAULT 0,
    applies_to TEXT DEFAULT 'all',
    grade TEXT,
    color TEXT DEFAULT '#6366F1',
    visible_to_parents INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);
console.log('✅ academic_events');

// فهارس
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_start ON academic_events(start_date);
  CREATE INDEX IF NOT EXISTS idx_events_type ON academic_events(type);
  CREATE INDEX IF NOT EXISTS idx_events_holiday ON academic_events(is_holiday);
  CREATE INDEX IF NOT EXISTS idx_events_parents ON academic_events(visible_to_parents);
`);
console.log('✅ الفهارس');

// صلاحيات
const newPerms = [
  ['calendar.view',   'عرض التقويم',    'View Calendar',   'calendar'],
  ['calendar.create', 'إضافة حدث',       'Add Event',       'calendar'],
  ['calendar.edit',   'تعديل حدث',       'Edit Event',      'calendar'],
  ['calendar.delete', 'حذف حدث',         'Delete Event',    'calendar'],
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO permissions (code, name_ar, name_en, category)
  VALUES (?, ?, ?, ?)
`);
newPerms.forEach(p => insert.run(...p));
console.log('✅ الصلاحيات');

// منح للمدير
const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
const grantPerm = db.prepare(`
  INSERT OR IGNORE INTO user_permissions (user_id, permission_code, granted_by)
  VALUES (?, ?, NULL)
`);

const tx = db.transaction(() => {
  for (const u of admins) {
    for (const p of newPerms) {
      grantPerm.run(u.id, p[0]);
    }
  }
});
tx();
console.log('✅ منحت الصلاحيات للمديرين');

// إضافة أحداث افتراضية
const defaultEvents = [
  {
    title: 'بداية العام الدراسي',
    type: 'school',
    start_date: '2026-09-01',
    color: '#10B981',
    is_holiday: 0,
    description: 'بداية الفصل الأول',
  },
  {
    title: 'عيد الجلاء',
    type: 'holiday',
    start_date: '2026-10-15',
    color: '#EF4444',
    is_holiday: 1,
    description: 'عطلة رسمية',
  },
];

const insertEvent = db.prepare(`
  INSERT OR IGNORE INTO academic_events (
    title, type, start_date, color, is_holiday, description, visible_to_parents
  ) VALUES (?, ?, ?, ?, ?, ?, 1)
`);

for (const e of defaultEvents) {
  insertEvent.run(e.title, e.type, e.start_date, e.color, e.is_holiday, e.description);
}
console.log('✅ أحداث افتراضية');

console.log('');
console.log('🎉 جاهز!');
db.close();