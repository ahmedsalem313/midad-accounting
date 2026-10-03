import { useEffect, useState, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../lib/socket';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef(null);

  const load = async () => {
    const [list, count] = await Promise.all([
      api.get('/notifications'),
      api.get('/notifications/unread-count'),
    ]);
    setItems(list.data);
    setUnread(count.data.count);
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (!s) return;
    const onNew = (n) => {
      setItems((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
    };
    s.on('notification', onNew);
    return () => s.off('notification', onNew);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await api.patch('/notifications/read-all');
    setItems(items.map((i) => ({ ...i, is_read: 1 })));
    setUnread(0);
  };

  const markOne = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setItems(items.map((i) => (i.id === id ? { ...i, is_read: 1 } : i)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const remove = async (id) => {
    await api.delete(`/notifications/${id}`);
    setItems(items.filter((i) => i.id !== id));
  };

  const colorByType = (t) => ({
    info: 'border-blue-400',
    success: 'border-green-400',
    warning: 'border-amber-400',
    error: 'border-red-400',
  }[t] || 'border-gray-300');

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost !p-2.5 relative"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-800 shadow-xl rounded-lg border z-50 max-h-96 overflow-auto"
             style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between p-3 border-b"
               style={{ borderColor: 'var(--border-color)' }}>
            <span className="font-bold">الإشعارات</span>
            <button onClick={markAll} className="text-xs text-blue-600 hover:underline">
              تعليم الكل كمقروء
            </button>
          </div>

          {items.length === 0 && (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              لا توجد إشعارات
            </div>
          )}

          {items.map((n) => (
            <div
              key={n.id}
              className={`p-3 border-b last:border-0 border-r-4 ${colorByType(n.type)} ${
                n.is_read ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{n.title}</div>
                  {n.body && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{n.body}</div>}
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(n.created_at).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.is_read && (
                    <button
                      onClick={() => markOne(n.id)}
                      className="text-green-600 hover:text-green-800"
                      title="تعليم كمقروء"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    className="text-red-500 hover:text-red-700"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}