const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');
const cols = db.prepare('PRAGMA table_info(users)').all();

const addCol = (name, type) => {
  if (!cols.some(c => c.name === name)) {
    db.exec('ALTER TABLE users ADD COLUMN ' + name + ' ' + type);
    console.log('✅ أُضيف:', name);
  } else {
    console.log('ℹ️ موجود:', name);
  }
};

addCol('is_advisor', 'INTEGER DEFAULT 0');
addCol('advisor_grade', 'TEXT');
addCol('advisor_section', 'TEXT');

console.log('');
console.log('🎉 جاهز!');
db.close();