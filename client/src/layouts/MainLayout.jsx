import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

export default function MainLayout() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('midad_theme') === 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('midad_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-6 animate-fade-in overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}