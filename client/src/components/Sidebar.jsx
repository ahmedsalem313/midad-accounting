import { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Wallet, Receipt, GraduationCap,
  Calendar, CheckSquare, Banknote, HandCoins,
  MessageCircle, BarChart3, UserCog, Shield, Settings as SettingsIcon,
  Award, AlertTriangle, BookOpen, Trophy, MessageSquare, Phone, Gift, QrCode,
  ChevronDown, Search, X, TrendingUp, Bell,  Briefcase,

  Palette
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
// ============================================
// هيكل القائمة — مُجمّع
// ============================================
const MENU_GROUPS = [
  {
    id: 'main',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    color: '#6366F1',
    collapsible: false,
    items: [
      { path: '/', label: 'لوحة المعلومات', icon: LayoutDashboard, perm: null },
    ],
  },
  {
    id: 'students',
    label: 'إدارة الطلاب',
    icon: Users,
    color: '#8B5CF6',
    collapsible: true,
    items: [
      { path: '/students',    label: 'قائمة الطلاب',    icon: Users,        perm: 'students.view' },
      { path: '/my-students', label: 'طلابي',           icon: GraduationCap,perm: 'students.view' },
      { path: '/top-students',label: 'الأوائل',         icon: Trophy,       perm: 'students.view' },
      { path: '/students/promotion', label: 'ترحيل الطلاب', icon: GraduationCap, perm: 'students.edit' },
    ],
  },
  {
    id: 'academic',
    label: 'الأكاديمي',
    icon: BookOpen,
    color: '#3B82F6',
    collapsible: true,
    items: [
      { path: '/grades',          label: 'الدرجات',              icon: GraduationCap, perm: 'grades.view' },
      { path: '/timetable',       label: 'جدول الحصص',           icon: Calendar,      perm: 'timetable.view' },
      { path: '/timetable-settings', label: 'إعدادات الجدول',    icon: SettingsIcon,  perm: 'timetable.edit' },
      { path: '/timetable-subjects', label: 'المواد الدراسية', icon: BookOpen, perm: 'timetable.edit' },
      { path: '/calendar',        label: 'التقويم الأكاديمي',    icon: Calendar,      perm: 'calendar.view' },
      { path: '/assignments',     label: 'الواجبات',             icon: BookOpen,      perm: 'assignments.view' },
      { path: '/late-assignments',label: 'المتأخرون بالواجبات',  icon: AlertTriangle, perm: 'assignments.view' },
    ],
  },
  {
    id: 'attendance',
    label: 'الحضور والسلوك',
    icon: CheckSquare,
    color: '#10B981',
    collapsible: true,
    items: [
      { path: '/attendance',          label: 'حضور المعلمين',  icon: CheckSquare,   perm: 'attendance.view' },
      { path: '/student-attendance', label: 'حضور الطلاب',    icon: CheckSquare,   perm: 'attendance.view' },
      { path: '/absence-warnings',   label: 'إنذارات الغياب', icon: AlertTriangle, perm: 'attendance.view' },
      { path: '/behavior',           label: 'تقييم السلوك',   icon: Award,         perm: 'grades.view' },
    ],
  },
  {
    id: 'finance',
    label: 'الإدارة المالية',
    icon: Wallet,
    color: '#F59E0B',
    collapsible: true,
    items: [
      { path: '/payments',      label: 'الأقساط',            icon: Wallet,     perm: 'payments.view' },
      { path: '/expenses',      label: 'المصاريف',           icon: Receipt,    perm: 'expenses.view' },
      { path: '/payroll',       label: 'الرواتب',            icon: Banknote,   perm: 'payroll.view' },
      { path: '/salary-config', label: 'إعدادات الرواتب',    icon: SettingsIcon, perm: 'payroll.calculate' },
      { path: '/rewards',       label: 'المكافآت',           icon: Gift,       perm: 'rewards.view' },
      { path: '/partners',      label: 'الشركاء',            icon: Briefcase,  perm: 'partners.view' },
      { path: '/partner-profits', label: 'الأرباح والتوزيع', icon: TrendingUp, perm: 'partners.view' },
      { path: '/advances',      label: 'السلف',              icon: HandCoins,  perm: 'advances.view' },
    ],
  },
  {
    id: 'communication',
    label: 'التواصل',
    icon: MessageCircle,
    color: '#EC4899',
    collapsible: true,
    items: [
      { path: '/whatsapp',        label: 'واتساب',       icon: MessageCircle, perm: 'whatsapp.fees' },
      { path: '/communications',  label: 'سجل التواصل',  icon: Phone,         perm: 'communications.view' },
      { path: '/notes',           label: 'الملاحظات',    icon: MessageSquare, perm: 'notes.view' },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: BarChart3,
    color: '#0EA5E9',
    collapsible: true,
    items: [
      { path: '/reports', label: 'التقارير المالية', icon: BarChart3, perm: 'reports.financial' },
    ],
  },
  {
    id: 'system',
    label: 'النظام',
    icon: SettingsIcon,
    color: '#64748B',
    collapsible: true,
    items: [
      { path: '/users',       label: 'المستخدمون',  icon: UserCog,      perm: 'users.view' },
      { path: '/permissions', label: 'الصلاحيات',   icon: Shield,       perm: 'users.permissions' },
      { path: '/qr-codes',    label: 'رموز QR',     icon: QrCode,       perm: 'settings.view' },
      { path: '/settings',    label: 'الإعدادات',   icon: SettingsIcon, perm: 'settings.view' },
      { path: '/branding',    label: 'الهوية البصرية', icon: Palette,  perm: 'settings.view' },
    ],
  },
]

// ============================================
// المكوّن الرئيسي
// ============================================
export default function Sidebar({ open, lang = 'ar' }) {
  const { hasPermission, user } = useAuth()
  const location = useLocation()

  const [openGroups, setOpenGroups] = useState([])
  const [search, setSearch] = useState('')
const [stats, setStats] = useState({
  warnings: 0,
  outstanding: 0,
  lateAssignments: 0,
})
  // فتح المجموعة النشطة تلقائياً
  useEffect(() => {
    const currentPath = location.pathname
    const activeGroup = MENU_GROUPS.find(g =>
      g.items?.some(item => item.path === currentPath)
    )
    if (activeGroup && !openGroups.includes(activeGroup.id)) {
      setOpenGroups(prev => [...prev, activeGroup.id])
    }
  }, [location.pathname])
// جلب الإحصائيات
useEffect(() => {
  fetchStats()

  // تحديث كل 60 ثانية
  const interval = setInterval(fetchStats, 60000)
  return () => clearInterval(interval)
}, [])

const fetchStats = async () => {
  try {
    const res = await api.get('/reports/sidebar-stats')
    setStats(res.data.data)
  } catch (e) {
    console.error('فشل جلب الإحصائيات:', e)
  }
}
  const toggleGroup = (groupId) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  // فلترة حسب الصلاحيات + البحث
  const filteredGroups = useMemo(() => {
    return MENU_GROUPS
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          // فلترة الصلاحيات
          if (item.perm && !hasPermission(item.perm)) return false
          // فلترة البحث
          if (search.trim()) {
            const q = search.trim().toLowerCase()
            return item.label.toLowerCase().includes(q)
          }
          return true
        }),
      }))
      .filter(group => group.items.length > 0)
  }, [search, hasPermission])

  // عند البحث — فتح كل المجموعات
  useEffect(() => {
    if (search.trim()) {
      setOpenGroups(filteredGroups.map(g => g.id))
    }
  }, [search])

  const isGroupActive = (group) => {
    return group.items.some(item => item.path === location.pathname)
  }

  return (
    <aside
      className={`glass-card m-3 rounded-2xl transition-all duration-300 flex flex-col sticky top-3
                  ${open ? 'w-72' : 'w-20'}`}
      style={{ height: 'calc(100vh - 24px)' }}
    >
      {/* ============================================
          رأس القائمة
      ============================================ */}
      <div className="p-4 flex items-center gap-3 border-b flex-shrink-0"
           style={{ borderColor: 'var(--border-color)' }}>
        <img
  src="/logo.png"
  alt="مداد"
  className="w-11 h-11 rounded-xl object-contain flex-shrink-0"
/>
        {open && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="font-bold text-base leading-tight">
              {lang === 'ar' ? 'مداد المحاسبي' : 'Midad'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {user?.role === 'admin' ? (lang === 'ar' ? 'مدير' : 'Admin') :
               user?.role === 'accountant' ? (lang === 'ar' ? 'محاسب' : 'Accountant') :
               user?.role === 'teacher' ? (lang === 'ar' ? 'معلم' : 'Teacher') :
               (lang === 'ar' ? 'مستخدم' : 'User')}
            </p>
          </div>
        )}
      </div>

      {/* ============================================
          حقل البحث
      ============================================ */}
      {open && (
        <div className="p-3 flex-shrink-0 animate-fade-in">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3"
                    style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث سريع...' : 'Quick search...'}
              className="input-modern !py-2 !text-sm ps-9 pe-8"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 -translate-y-1/2 end-2 text-red-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================
          القائمة الرئيسية
      ============================================ */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {filteredGroups.map((group) => {
          const GroupIcon = group.icon
          const isOpen = openGroups.includes(group.id)
          const isActive = isGroupActive(group)

          // العناصر غير القابلة للطي (الرئيسية)
          if (!group.collapsible) {
            return group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive: navActive }) =>
                    `nav-item ${navActive ? 'active' : ''} ${!open ? 'justify-center' : ''}`
                  }
                  title={item.label}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {open && <span className="font-medium text-sm">{item.label}</span>}
                </NavLink>
              )
            })
          }

          // المجموعات القابلة للطي
          return (
            <div key={group.id} className="animate-fade-in">
              {/* رأس المجموعة */}
<button
  onClick={() => toggleGroup(group.id)}
  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border-2`}
  style={{
    background: isActive 
      ? `linear-gradient(135deg, ${group.color}20, ${group.color}10)` 
      : `${group.color}08`,
    borderColor: isActive ? group.color : `${group.color}30`,
    color: group.color,
  }}
  title={group.label}
>
                <GroupIcon size={20} className="flex-shrink-0"
                           style={{ color: isActive ? group.color : undefined }} />
                {open && (
                  <>
                    <span className="font-bold text-sm flex-1 text-start"
                          style={{ color: isActive ? group.color : 'var(--text-primary)' }}>
                      {group.label}
                    </span>
                    <ChevronDown
                      size={16}
                      className="transition-transform duration-200 flex-shrink-0"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: 'var(--text-secondary)',
                      }}
                    />
                  </>
                )}
              </button>

              {/* عناصر المجموعة */}
              {open && isOpen && (
                <div
                  className="mt-1 ps-4 space-y-0.5 border-s-2 ms-3"
                  style={{ borderColor: `${group.color}40` }}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
  key={item.path}
  to={item.path}
  className={({ isActive: navActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      navActive ? 'font-bold shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
    }`
  }
  style={({ isActive: navActive }) => ({
    background: navActive 
      ? `linear-gradient(135deg, ${group.color}, ${group.color}cc)` 
      : 'transparent',
    color: navActive ? 'white' : 'var(--text-secondary)',
    boxShadow: navActive ? `0 4px 12px ${group.color}40` : undefined,
  })}
>
  <Icon size={16} className="flex-shrink-0" />
  <span className="flex-1">{item.label}</span>

  {/* Badge حسب العنصر */}
  {item.path === '/absence-warnings' && stats.warnings > 0 && (
    <span className="badge-warning text-xs !py-0.5">
      {stats.warnings}
    </span>
  )}
  {item.path === '/late-assignments' && stats.lateAssignments > 0 && (
    <span className="badge-info text-xs !py-0.5">
      {stats.lateAssignments}
    </span>
  )}
</NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ============================================
    ملخص سريع (أسفل القائمة) — قابل للنقر
============================================ */}
{open && (
  <div className="p-3 border-t flex-shrink-0"
       style={{ borderColor: 'var(--border-color)' }}>
    <div className="p-3 rounded-xl space-y-2"
         style={{ background: 'rgba(99,102,241,0.06)' }}>
      <p className="text-xs font-bold flex items-center gap-2"
         style={{ color: 'var(--text-secondary)' }}>
        <TrendingUp size={14} />
        {lang === 'ar' ? 'ملخص سريع' : 'Quick Summary'}
      </p>

      {/* 🔔 إنذارات الغياب */}
      {stats.warnings > 0 && (
        <NavLink
          to="/absence-warnings"
          className="flex items-center justify-between text-xs p-2 rounded-lg transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(245,158,11,0.12)',
            color: '#92400E',
          }}
          title={lang === 'ar' ? 'عرض إنذارات الغياب' : 'View absence warnings'}
        >
          <span className="flex items-center gap-1">
            🔔 {lang === 'ar' ? 'إنذارات' : 'Warnings'}
          </span>
          <span className="badge-warning font-bold">{stats.warnings}</span>
        </NavLink>
      )}

      {/* 💰 متأخرات */}
      {stats.outstanding > 0 && (
        <NavLink
          to="/reports"
          className="flex items-center justify-between text-xs p-2 rounded-lg transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(239,68,68,0.12)',
            color: '#991B1B',
          }}
          title={lang === 'ar' ? 'عرض الطلاب المتأخرين' : 'View outstanding students'}
        >
          <span className="flex items-center gap-1">
            💰 {lang === 'ar' ? 'متأخرات' : 'Outstanding'}
          </span>
          <span className="badge-danger font-bold">{stats.outstanding}</span>
        </NavLink>
      )}

      {/* 📚 واجبات متأخرة (للمعلم فقط) */}
      {stats.lateAssignments > 0 && user?.role === 'teacher' && (
        <NavLink
          to="/late-assignments"
          className="flex items-center justify-between text-xs p-2 rounded-lg transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(99,102,241,0.12)',
            color: '#4338CA',
          }}
          title={lang === 'ar' ? 'عرض الواجبات المتأخرة' : 'View late assignments'}
        >
          <span className="flex items-center gap-1">
            📚 {lang === 'ar' ? 'واجبات' : 'Assignments'}
          </span>
          <span className="badge-info font-bold">{stats.lateAssignments}</span>
        </NavLink>
      )}

      {/* إذا لم يوجد شيء */}
      {stats.warnings === 0 && stats.outstanding === 0 && stats.lateAssignments === 0 && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>
          ✅ {lang === 'ar' ? 'كل شيء على ما يرام' : 'All good'}
        </p>
      )}
    </div>
  </div>
)}
    </aside>
  )
}