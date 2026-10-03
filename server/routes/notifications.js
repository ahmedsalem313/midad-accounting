// server/routes/notifications.js
import express from 'express';
import { getDB } from '../database/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { id, role } = req.user;
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE (user_id = ? OR (user_id IS NULL AND role = ?) OR (user_id IS NULL AND role IS NULL))
    ORDER BY created_at DESC
    LIMIT 50
  `).all(id, role);
  res.json(rows);
});

router.get('/unread-count', authMiddleware, (req, res) => {
  const db = getDB();
  const { id, role } = req.user;
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE is_read = 0
      AND (user_id = ? OR (user_id IS NULL AND role = ?) OR (user_id IS NULL AND role IS NULL))
  `).get(id, role);
  res.json({ count: row.count });
});

router.patch('/read-all', authMiddleware, (req, res) => {
  const db = getDB();
  const { id, role } = req.user;
  db.prepare(`
    UPDATE notifications SET is_read = 1
    WHERE (user_id = ? OR (user_id IS NULL AND role = ?) OR (user_id IS NULL AND role IS NULL))
  `).run(id, role);
  res.json({ ok: true });
});

router.patch('/:id/read', authMiddleware, (req, res) => {
  const db = getDB();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;