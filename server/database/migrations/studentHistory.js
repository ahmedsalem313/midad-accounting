// server/database/migrations/studentHistory.js
export function createStudentHistoryTable(db) {
  db.exec(`
    -- سجل الطالب الأكاديمي (كل سنة دراسية = صف)
    CREATE TABLE IF NOT EXISTS student_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      grade TEXT NOT NULL,
      section TEXT,
      status TEXT NOT NULL DEFAULT 'enrolled',
      enrolled_at TEXT,
      left_at TEXT,
      left_reason TEXT,
      returned_at TEXT,
      final_average REAL,
      result TEXT,
      attendance_summary TEXT,
      behavior_summary TEXT,
      fees_summary TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_student ON student_history(student_id);
    CREATE INDEX IF NOT EXISTS idx_history_year ON student_history(academic_year);
    CREATE INDEX IF NOT EXISTS idx_history_grade ON student_history(grade);

    -- جدول ترحيل الطلاب السنوي
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      from_grade TEXT NOT NULL,
      from_section TEXT,
      to_grade TEXT,
      to_section TEXT,
      academic_year TEXT NOT NULL,
      next_academic_year TEXT NOT NULL,
      final_average REAL,
      result TEXT NOT NULL,
      decided_by INTEGER,
      decided_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (decided_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_promo_student ON promotions(student_id);
    CREATE INDEX IF NOT EXISTS idx_promo_year ON promotions(academic_year);
  `);
}