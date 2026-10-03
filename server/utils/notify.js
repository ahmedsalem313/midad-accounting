// server/utils/notify.js
import { getDB } from '../database/db.js';

let ioRef = null;

export function setIo(io) {
  ioRef = io;
}

export function notify({ userId = null, role = null, title, body = '', type = 'info', link = null }) {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO notifications (user_id, role, title, body, type, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, role, title, body, type, link);

  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);

  if (ioRef) {
    if (userId) {
      ioRef.to(`user:${userId}`).emit('notification', notification);
    } else if (role) {
      ioRef.to(`role:${role}`).emit('notification', notification);
    } else {
      ioRef.emit('notification', notification);
    }
  }
  return notification;
}