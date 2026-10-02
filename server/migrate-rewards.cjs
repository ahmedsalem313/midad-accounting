const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// ============================================
// جدول المكافآت
// ============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS teacher_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    title TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    reward_month INTEGER NOT NULL,
    reward_year INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    granted_by INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid INTEGER DEFAULT 0,
    paid_at DATETIME,
    notes TEXT,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id)
  );
`);
console.log('✅ teacher_rewards');

// فهارس
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_rewards_teacher ON teacher_rewards(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_rewards_period ON teacher_rewards(reward_year, reward_month);
  CREATE INDEX IF NOT EXISTS idx_rewards_category ON teacher_rewards(category);
  CREATE INDEX IF NOT EXISTS idx_rewards_paid ON teacher_rewards(paid);
`);
console.log('✅ الفهارس');

// ============================================
// قائمة المعايير (settings)
// ============================================
const rewardCategories = [
  { value: 'attendance',   label_ar: 'الالتزام بالدوام',        icon: '🎯' },
  { value: 'appearance',   label_ar: 'القيافة والأناقة',         icon: '👔' },
  { value: 'ideal_teacher',label_ar: 'المعلم المثالي',          icon: '⭐' },
  { value: 'best_class',   label_ar: 'أفضل صف منضبط',           icon: '📚' },
  { value: 'best_results', label_ar: 'أفضل صف من حيث النتائج',  icon: '🏆' },
  { value: 'custom',       label_ar: 'مكافأة مخصصة',             icon: '🎁' },
];

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);
insertSetting.run('reward_categories', JSON.stringify(rewardCategories));
console.log('✅ المعايير الافتراضية');

// ============================================
// صلاحيات
// ============================================
const newPerms = [
  ['rewards.view',   'عرض المكافآت',   'View Rewards',   'rewards'],
  ['rewards.create', 'إضافة مكافأة',    'Add Reward',     'rewards'],
  ['rewards.edit',   'تعديل مكافأة',    'Edit Reward',    'rewards'],
  ['rewards.delete', 'حذف مكافأة',      'Delete Reward',  'rewards'],
  ['rewards.pay',    'صرف مكافأة',      'Pay Reward',     'rewards'],
];

const insertPerm = db.prepare(`
  INSERT OR IGNORE INTO permissions (code, name_ar, name_en, category)
  VALUES (?, ?, ?, ?)
`);
newPerms.forEach(p => insertPerm.run(...p));
console.log('✅ الصلاحيات');

// منح الصلاحيات للمدير والمحاسب
const users = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'accountant')").all();
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