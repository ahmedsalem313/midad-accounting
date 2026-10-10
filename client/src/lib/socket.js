// client/src/lib/socket.js
// ============================================
// Socket.io معطّل مؤقتًا — نستخدم polling بدلًا منه
// السبب: تعارض WebSocket مع Cloudflare Tunnel + Vite proxy
// ============================================

let socket = null;

export function connectSocket(token) {
  console.log('ℹ️ Socket.io معطّل. الإشعارات تعمل عبر polling.')
  return null;
}

export function getSocket() {
  return null;
}

export function disconnectSocket() {
  socket = null;
}