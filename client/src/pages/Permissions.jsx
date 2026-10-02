import { useState, useEffect } from 'react'
import {
  Shield, Search, Users, UserCog, Plus, Edit, Trash2, X,
  Check, AlertCircle, Save, CheckCircle, Eye, UserPlus
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// ثوابت التصنيفات
// ============================================
const CATEGORY_INFO = {
  students:    { label: 'الطلاب',           icon: '👨‍🎓', color: '#6366F1' },
  payments:    { label: 'الأقساط',          icon: '💰', color: '#10B981' },
  expenses:    { label: 'المصاريف',         icon: '💸', color: '#EF4444' },
  grades:      { label: 'الدرجات',          icon: '📝', color: '#8B5CF6' },
  timetable:   { label: 'جدول الحصص',       icon: '📅', color: '#3B82F6' },
  attendance:  { label: 'الحضور',           icon: '✅', color: '#06B6D4' },
  payroll:     { label: 'الرواتب',          icon: '💵', color: '#F59E0B' },
  advances:    { label: 'السلف',            icon: '🤝', color: '#EC4899' },
  whatsapp:    { label: 'واتساب',           icon: '💬', color: '#22C55E' },
  reports:     { label: 'التقارير',         icon: '📊', color: '#0EA5E9' },
  users:       { label: 'المستخدمون',       icon: '👥', color: '#64748B' },
  settings:    { label: 'الإعدادات',        icon: '⚙️', color: '#84CC16' },
  backup:      { label: 'النسخ الاحتياطي',  icon: '💾', color: '#A855F7' },
}

const ROLE_LABELS = {
  admin: 'مدير',
  accountant: 'محاسب',
  teacher: 'معلم',
  viewer: 'مشاهد',
}

const ROLE_COLORS = {
  admin: '#EF4444',
  accountant: '#10B981',
  teacher: '#6366F1',
  viewer: '#64748B',
}

// ============================================
// المكوّن الرئيسي
// ============================================
export default function Permissions() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userPermissions, setUserPermissions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersRes, permsRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/permissions/list'),
      ])
      setUsers(usersRes.data.data)
      setAllPermissions(permsRes.data.data)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const openPermissionsModal = (user) => {
    setSelectedUser(user)
    setUserPermissions(user.permissions || [])
    setShowModal(true)
  }

  const togglePermission = (code) => {
    setUserPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const toggleCategory = (categoryPerms) => {
    const codes = categoryPerms.map((p) => p.code)
    const allSelected = codes.every((c) => userPermissions.includes(c))

    if (allSelected) {
      setUserPermissions((prev) => prev.filter((c) => !codes.includes(c)))
    } else {
      setUserPermissions((prev) => [...new Set([...prev, ...codes])])
    }
  }

  const handleSave = async () => {
    if (!selectedUser) return

    setSaving(true)
    try {
      await api.put(`/users/${selectedUser.id}/permissions`, {
        permissions: userPermissions,
      })
      toast.success('تم تحديث الصلاحيات')
      setShowModal(false)
      fetchData()
    } catch (e) {
      toast.error('فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  // تجميع الصلاحيات حسب التصنيف
  const permissionsByCategory = allPermissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  // فلترة المستخدمين
  const filteredUsers = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    )
  })

  // الإحصائيات
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    accountants: users.filter((u) => u.role === 'accountant').length,
    teachers: users.filter((u) => u.role === 'teacher').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-primary-500" size={26} />
            إدارة الصلاحيات
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            تعيين الصلاحيات لكل مستخدم بشكل منفصل
          </p>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>إجمالي المستخدمين</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              <Shield size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مديرون</p>
              <p className="text-xl font-bold">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
              <UserCog size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>محاسبون</p>
              <p className="text-xl font-bold">{stats.accountants}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <UserPlus size={20} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>معلمون</p>
              <p className="text-xl font-bold">{stats.teachers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث بالاسم أو اسم المستخدم..."
            className="input-modern ps-10"
          />
        </div>

        <select value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="input-modern !w-auto min-w-[160px]">
          <option value="">كل الأدوار</option>
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <option key={role} value={role}>{label}</option>
          ))}
        </select>

        <div className="text-xs px-3 py-2 rounded-lg font-semibold"
             style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.08)' }}>
          {filteredUsers.length} / {users.length}
        </div>
      </div>

      {/* الجدول */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
            <p style={{ color: 'var(--text-secondary)' }}>لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">الاسم</th>
                  <th className="p-3 text-start">اسم المستخدم</th>
                  <th className="p-3 text-start">الدور</th>
                  <th className="p-3 text-start">الصلاحيات</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => {
                  const roleColor = ROLE_COLORS[u.role] || '#64748B'
                  const isAdmin = u.role === 'admin'
                  const permsCount = u.permissions?.length || 0
                  const totalPerms = allPermissions.length

                  return (
                    <tr key={u.id} className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                               style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}>
                            {u.full_name?.charAt(0)}
                          </div>
                          <span className="font-semibold">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                        @{u.username}
                      </td>
                      <td className="p-3">
                        <span className="badge"
                              style={{ background: `${roleColor}20`, color: roleColor }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {isAdmin ? (
                          <span className="badge-success">
                            <Check size={12} />
                            كل الصلاحيات
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full overflow-hidden max-w-[100px]"
                                 style={{ background: 'var(--border-color)' }}>
                              <div className="h-full rounded-full"
                                   style={{
                                     width: `${totalPerms > 0 ? (permsCount / totalPerms) * 100 : 0}%`,
                                     background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                                   }} />
                            </div>
                            <span className="text-xs font-semibold whitespace-nowrap">
                              {permsCount} / {totalPerms}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {isAdmin ? (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              —
                            </span>
                          ) : (
                            <button
                              onClick={() => openPermissionsModal(u)}
                              className="btn-ghost !py-1.5 !px-3 !text-xs flex items-center gap-1"
                              style={{ color: '#8B5CF6' }}
                            >
                              <Shield size={14} />
                              تعديل
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة الصلاحيات */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* الرأس */}
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                     style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    صلاحيات: {selectedUser.full_name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {userPermissions.length} صلاحية مفعّلة من {allPermissions.length}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUserPermissions([])}
                  className="btn-ghost !py-2 !px-3 text-xs text-red-500 border-2"
                  style={{ borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  إلغاء الكل
                </button>
                <button
                  onClick={() => setUserPermissions(allPermissions.map(p => p.code))}
                  className="btn-ghost !py-2 !px-3 text-xs text-emerald-500 border-2"
                  style={{ borderColor: 'rgba(16,185,129,0.3)' }}
                >
                  <Check size={14} className="inline me-1" />
                  تحديد الكل
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-ghost !p-2 text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* المحتوى */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {Object.entries(permissionsByCategory).map(([category, perms]) => {
                const catInfo = CATEGORY_INFO[category] || {
                  label: category, icon: '📁', color: '#64748B',
                }
                const codes = perms.map((p) => p.code)
                const selectedCount = codes.filter((c) => userPermissions.includes(c)).length
                const allSelected = selectedCount === codes.length
                const someSelected = selectedCount > 0 && !allSelected

                return (
                  <div key={category} className="p-4 rounded-xl border"
                       style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold flex items-center gap-2"
                          style={{ color: catInfo.color }}>
                        <span className="text-xl">{catInfo.icon}</span>
                        {catInfo.label}
                        <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                          ({selectedCount} / {codes.length})
                        </span>
                      </h4>

                      <button
                        type="button"
                        onClick={() => toggleCategory(perms)}
                        className="text-xs px-3 py-1 rounded-lg border transition-all"
                        style={{
                          borderColor: allSelected ? catInfo.color : 'var(--border-color)',
                          background: allSelected ? `${catInfo.color}15` : 'transparent',
                          color: allSelected ? catInfo.color : 'var(--text-secondary)',
                        }}
                      >
                        {allSelected ? '✓ إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {perms.map((p) => {
                        const isChecked = userPermissions.includes(p.code)
                        return (
                          <label
                            key={p.code}
                            className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${isChecked ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            style={{
                              background: isChecked ? `${catInfo.color}12` : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(p.code)}
                              className="w-4 h-4 rounded accent-primary-500"
                            />
                            <span className="text-sm">{p.name_ar}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* الفوتر */}
            <div className="p-4 border-t flex gap-3 flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {saving ? 'جاري الحفظ...' : `حفظ ${userPermissions.length} صلاحية`}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}