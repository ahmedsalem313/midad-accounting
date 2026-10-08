// server/database/migrations/partners.js
export function createPartnersTables(db) {
  db.exec(`
    -- 1) الشركاء
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      role TEXT DEFAULT 'viewer',
      share_percentage REAL NOT NULL DEFAULT 0,
      joined_at TEXT,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);
    CREATE INDEX IF NOT EXISTS idx_partners_user ON partners(user_id);

    -- 2) رأس المال والإيداعات
    CREATE TABLE IF NOT EXISTS partner_capital (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'deposit',
      amount REAL NOT NULL,
      transaction_date TEXT NOT NULL,
      method TEXT DEFAULT 'cash',
      notes TEXT,
      recorded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_capital_partner ON partner_capital(partner_id);
    CREATE INDEX IF NOT EXISTS idx_capital_date ON partner_capital(transaction_date);

    -- 3) توزيعات الأرباح
    CREATE TABLE IF NOT EXISTS partner_distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      share_percentage REAL NOT NULL,
      gross_profit REAL NOT NULL,
      partner_share REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      paid_at DATETIME,
      paid_method TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      computed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
      FOREIGN KEY (computed_by) REFERENCES users(id),
      UNIQUE(partner_id, month, year)
    );

    CREATE INDEX IF NOT EXISTS idx_dist_partner ON partner_distributions(partner_id);
    CREATE INDEX IF NOT EXISTS idx_dist_period ON partner_distributions(year, month);
    CREATE INDEX IF NOT EXISTS idx_dist_status ON partner_distributions(status);
  `)
}