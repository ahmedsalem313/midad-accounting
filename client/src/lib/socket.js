// client/src/lib/socket.js
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket) socket.disconnect();
  // في وضع التطوير: الاتصال مباشرة بالباك اند على 3001
  // في وضع الإنتاج: نفس الأصل (نفس المنفذ)
  const isDev = window.location.port === '5173';
  const url = isDev ? 'http://localhost:3001' : window.location.origin;
  
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}