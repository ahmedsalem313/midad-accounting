const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// جدول تقييم السلوك
db.exec(`
  CREATE TABLE IF NOT EXISTS behavior_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    rating TEXT NOT NULL,
    note TEXT,
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    evaluator_id INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_id) REFERENCES users(id)
  );
`);
console.log('✅ behavior_evaluations');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_behavior_student 
  ON behavior_evaluations(student_id);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_behavior_date 
  ON behavior_evaluations(evaluated_at);
`);
console.log('✅ الفهارس');

console.log('🎉 جاهز!');
db.close();