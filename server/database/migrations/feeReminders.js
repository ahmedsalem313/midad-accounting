// server/database/migrations/feeReminders.js
export function createFeeRemindersTables(db) {
  db.exec(`
    -- 1) تأجيلات إشعار الأقساط
    CREATE TABLE IF NOT EXISTS fee_reminder_exclusions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      excluded_until TEXT NOT NULL,
      reason TEXT,
      excluded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (excluded_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fee_excl_student ON fee_reminder_exclusions(student_id);
    CREATE INDEX IF NOT EXISTS idx_fee_excl_until ON fee_reminder_exclusions(excluded_until);

    -- 2) سجل جلسات التذكير
    CREATE TABLE IF NOT EXISTS fee_reminder_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      total_targets INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      notes TEXT,
      started_by INTEGER,
      FOREIGN KEY (started_by) REFERENCES users(id)
    );

    -- 3) سجل التذكيرات الفردية
    CREATE TABLE IF NOT EXISTS fee_reminder_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      student_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      remaining REAL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES fee_reminder_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fee_log_session ON fee_reminder_log(session_id);
    CREATE INDEX IF NOT EXISTS idx_fee_log_student ON fee_reminder_log(student_id);
    CREATE INDEX IF NOT EXISTS idx_fee_log_status ON fee_reminder_log(status);
  `)
}