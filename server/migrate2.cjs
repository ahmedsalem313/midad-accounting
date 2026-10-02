const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

const cols = db.prepare('PRAGMA table_info(teacher_attendance)').all();
const hasExcuse = cols.some(c => c.name === 'excuse_status');
const hasDeduction = cols.some(c => c.name === 'deduction_amount');

if (!hasExcuse) {
  db.exec("ALTER TABLE teacher_attendance ADD COLUMN excuse_status TEXT DEFAULT 'pending'");
  console.log('✅ تم إضافة حقل excuse_status');
} else {
  console.log('ℹ️ حقل excuse_status موجود مسبقاً');
}

if (!hasDeduction) {
  db.exec('ALTER TABLE teacher_attendance ADD COLUMN deduction_amount REAL DEFAULT 0');
  console.log('✅ تم إضافة حقل deduction_amount');
} else {
  console.log('ℹ️ حقل deduction_amount موجود مسبقاً');
}

console.log('📊 إجمالي السجلات:', db.prepare('SELECT COUNT(*) as c FROM teacher_attendance').get().c);
db.close();