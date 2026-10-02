const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

const cols = db.prepare('PRAGMA table_info(grades)').all();
const hasComponents = cols.some(c => c.name === 'components');
const hasIsComposite = cols.some(c => c.name === 'is_composite');

if (!hasComponents) {
  db.exec('ALTER TABLE grades ADD COLUMN components TEXT');
  console.log('✅ تم إضافة حقل components');
} else {
  console.log('ℹ️ حقل components موجود مسبقاً');
}

if (!hasIsComposite) {
  db.exec('ALTER TABLE grades ADD COLUMN is_composite INTEGER DEFAULT 0');
  console.log('✅ تم إضافة حقل is_composite');
} else {
  console.log('ℹ️ حقل is_composite موجود مسبقاً');
}

console.log('📊 عدد الدرجات الحالية:', db.prepare('SELECT COUNT(*) as c FROM grades').get().c);
db.close();