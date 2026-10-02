import { Search, Bell, Moon, Sun, Menu, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Topbar({ darkMode, setDarkMode, toggleSidebar }) {
  const { user, logout } = useAuth()

  return (
    <header className="glass-card m-3 ms-0 rounded-2xl px-5 py-3 flex items-center gap-4 sticky top-3 z-20">
      <button onClick={toggleSidebar} className="btn-ghost !p-2.5">
        <Menu size={20} />
      </button>

      <div className="flex-1 max-w-md relative hidden md:block">
        <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-4"
                style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="بحث..."
          className="input-modern ps-12"
        />
      </div>

      <div className="ms-auto flex items-center gap-2">
        <button onClick={() => setDarkMode(!darkMode)} className="btn-ghost !p-2.5">
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="btn-ghost !p-2.5 relative">
          <Bell size={18} />
        </button>

        <button
          onClick={logout}
          className="btn-ghost !p-2.5 text-red-500 hover:text-red-700"
          title="تسجيل خروج"
        >
          <LogOut size={18} />
        </button>

        <div className="flex items-center gap-2 ps-3 border-s"
             style={{ borderColor: 'var(--border-color)' }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #10B981, #3B82F6)' }}
          >
            {user?.full_name?.charAt(0) || '؟'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold leading-tight">{user?.full_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {user?.username}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}