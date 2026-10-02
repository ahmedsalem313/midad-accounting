import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, UserCog,
  Shield, Mail, Phone, Key, AlertCircle, CheckCircle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getTeacherTitle, getGradesByType, SECTIONS, getCurrentSchoolType } from '../utils/schoolData'

const ROLES = [
  { value: 'admin',      label: 'مدير',       color: '#EF4444' },
  { value: 'accountant', label: 'محاسب',      color: '#10B981' },
  { value: 'teacher',    label: 'معلم/مدرس',  color: '#6366F1' },
  { value: 'viewer',     label: 'مشاهد',      color: '#64748B' },
]

export default function Users() {
  const { hasPermission, user: currentUser } = useAuth()
  const schoolType = getCurrentSchoolType()
  const GRADES = getGradesByType(schoolType)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPermModal, setShowPermModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null)
  const [allPermissions, setAllPermissions] = useState([])
  const [userPermissions, setUserPermissions] = useState([])

  function getEmptyForm() {
    return {
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'teacher',
      base_salary: 0,
      is_active: true,
      is_advisor: false,
      advisor_grade: '',
      advisor_section: '',
    }
  }

  const [formData, setFormData] = useState(getEmptyForm())

  useEffect(() => {
    fetchUsers()
    fetchAllPermissions()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users')
      setUsers(res.data.data)
    } catch (e) {
      toast.error('فشل تحميل المستخدمين')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPermissions = async () => {
    try {
      const res = await api.get('/users/permissions/list')
      setAllPermissions(res.data.data)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredUsers = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    )
  })

  const openAddModal = () => {
    setEditingUser(null)
    setFormData(getEmptyForm())
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username || '',
      password: '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'teacher',
      base_salary: user.base_salary || 0,
      is_active: user.is_active === 1 || user.is_active === true,
      is_advisor: user.is_advisor === 1 || user.is_advisor === true,
      advisor_grade: user.advisor_grade || '',
      advisor_section: user.advisor_section || '',
    })
    setShowModal(true)
  }

  const openPermissionsModal = (user) => {
    setSelectedUserForPerms(user)
    setUserPermissions(user.permissions || [])
    setShowPermModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.username || !formData.full_name || !formData.role) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }
    if (!editingUser && !formData.password) {
      toast.error('كلمة المرور مطلوبة')
      return
    }

    try {
      if (editingUser) {
        const updates = { ...formData }
        if (!updates.password) delete updates.password

        await api.put(`/users/${editingUser.id}`, updates)

        // حفظ بيانات المرشد
        if (formData.role === 'teacher') {
          await api.put(`/users/${editingUser.id}/advisor`, {
            is_advisor: formData.is_advisor,
            grade: formData.advisor_grade,
            section: formData.advisor_section,
          })
        }

        toast.success('تم التحديث')
      } else {
        await api.post('/users', formData)
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      fetchUsers()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleSavePermissions = async () => {
    try {
      await api.put(`/users/${selectedUserForPerms.id}/permissions`, {
        permissions: userPermissions,
      })
      toast.success('تم تحديث الصلاحيات')
      setShowPermModal(false)
      fetchUsers()
    } catch (e) {
      toast.error('فشل التحديث')
    }
  }

  const handleDelete = async (user) => {
    if (user.id === currentUser.id) {
      toast.error('لا يمكنك حذف حسابك')
      return
    }
    if (!confirm(`هل أنت متأكد من حذف المستخدم: ${user.full_name}؟`)) return
    try {
      await api.delete(`/users/${user.id}`)
      toast.success('تم الحذف')
      fetchUsers()
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الحذف')
    }
  }

  const togglePermission = (code) => {
    setUserPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const toggleCategory = (category, perms) => {
    const categoryPerms = perms.map((p) => p.code)
    const allSelected = categoryPerms.every((c) => userPermissions.includes(c))

    if (allSelected) {
      setUserPermissions((prev) => prev.filter((c) => !categoryPerms.includes(c)))
    } else {
      setUserPermissions((prev) => [...new Set([...prev, ...categoryPerms])])
    }
  }

  const getRoleInfo = (role) => ROLES.find((r) => r.value === role) || ROLES[3]

  const permissionsByCategory = allPermissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const categoryNames = {
    students:    { icon: '👨‍🎓', name: 'الطلاب' },
    payments:    { icon: '💰', name: 'الأقساط' },
    expenses:    { icon: '💸', name: 'المصاريف' },
    grades:      { icon: '📝', name: 'الدرجات' },
    timetable:   { icon: '📅', name: 'جدول الحصص' },
    attendance:  { icon: '✅', name: 'الحضور' },
    payroll:     { icon: '💵', name: 'الرواتب' },
    advances:    { icon: '🤝', name: 'السلف' },
    whatsapp:    { icon: '💬', name: 'واتساب' },
    reports:     { icon: '📊', name: 'التقارير' },
    users:       { icon: '👥', name: 'المستخدمون' },
    settings:    { icon: '⚙️', name: 'الإعدادات' },
    backup:      { icon: '💾', name: 'النسخ الاحتياطي' },
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="text-primary-500" size={26} />
            إدارة المستخدمين
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            إجمالي: {users.length} مستخدم
          </p>
        </div>

        {hasPermission('users.create') && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة مستخدم
          </button>
        )}
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="بحث بالاسم، اسم المستخدم، الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern ps-10"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="input-modern !w-auto min-w-[180px]"
        >
          <option value="">كل الأدوار</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

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
                  <th className="p-3 text-start">الهاتف</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => {
                  const roleInfo = getRoleInfo(u.role)
                  return (
                    <tr key={u.id}
                        className="border-b hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td className="p-3 font-semibold">
                        {u.full_name}
                        {u.is_advisor === 1 && (
                          <span className="badge-info ms-2 text-xs">⭐ مرشد</span>
                        )}
                      </td>
                      <td className="p-3" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                        @{u.username}
                      </td>
                      <td className="p-3">
                        <span
                          className="badge"
                          style={{
                            background: `${roleInfo.color}20`,
                            color: roleInfo.color,
                          }}
                        >
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="p-3" dir="ltr">{u.phone || '-'}</td>
                      <td className="p-3">
                        {u.is_active ? (
                          <span className="badge-success flex items-center gap-1">
                            <CheckCircle size={12} />
                            نشط
                          </span>
                        ) : (
                          <span className="badge-danger flex items-center gap-1">
                            <XCircle size={12} />
                            موقوف
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {hasPermission('users.permissions') && u.role !== 'admin' && (
                            <button
                              onClick={() => openPermissionsModal(u)}
                              className="btn-ghost !p-2 text-purple-500 hover:text-purple-700"
                              title="الصلاحيات"
                            >
                              <Shield size={16} />
                            </button>
                          )}
                          {hasPermission('users.edit') && (
                            <button
                              onClick={() => openEditModal(u)}
                              className="btn-ghost !p-2 text-blue-500 hover:text-blue-700"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {hasPermission('users.delete') && u.id !== currentUser.id && u.role !== 'admin' && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="btn-ghost !p-2 text-red-500 hover:text-red-700"
                              title="حذف"
                            >
                              <Trash2 size={16} />
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

      {/* Modal: Add/Edit User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost !p-2 hover:bg-red-500/10 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    اسم المستخدم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-modern"
                    dir="ltr"
                    disabled={!!editingUser}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    كلمة المرور {!editingUser && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-modern"
                    dir="ltr"
                    placeholder={editingUser ? 'اتركها فارغة لعدم التغيير' : ''}
                    required={!editingUser}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-1.5">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-modern"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">الهاتف</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-modern"
                    dir="ltr"
                    placeholder="07XXXXXXXXX"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    الدور <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input-modern"
                    disabled={editingUser?.role === 'admin' && editingUser?.id === currentUser.id}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.value === 'teacher' ? getTeacherTitle(schoolType) : r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(formData.role === 'teacher' || formData.role === 'admin') && (
                  <div>
                    <label className="text-sm font-medium block mb-1.5">الراتب الأساسي (د.ع)</label>
                    <input
                      type="number"
                      value={formData.base_salary}
                      onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
                      className="input-modern"
                    />
                  </div>
                )}

                {formData.role === 'teacher' && (
                  <div className="md:col-span-2 p-3 rounded-xl border-2"
                       style={{
                         borderColor: formData.is_advisor ? '#6366F1' : 'var(--border-color)',
                         background: formData.is_advisor ? 'rgba(99,102,241,0.05)' : 'transparent',
                       }}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_advisor}
                        onChange={(e) => setFormData({ ...formData, is_advisor: e.target.checked })}
                        className="w-5 h-5 rounded accent-primary-500"
                      />
                      <div className="flex-1">
                        <p className="font-bold">⭐ تعيين كمرشد لصف</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          المرشد يرى درجات وسلوك وحضور طلاب صفه
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {formData.role === 'teacher' && formData.is_advisor && (
                  <>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">
                        صف الإرشاد <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.advisor_grade}
                        onChange={(e) => setFormData({ ...formData, advisor_grade: e.target.value })}
                        className="input-modern"
                      >
                        <option value="">اختر الصف...</option>
                        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1.5">الشعبة</label>
                      <select
                        value={formData.advisor_section}
                        onChange={(e) => setFormData({ ...formData, advisor_section: e.target.value })}
                        className="input-modern"
                      >
                        <option value="">كل الشعب</option>
                        {SECTIONS.map((s) => <option key={s} value={s}>شعبة {s}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {editingUser && (
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded"
                        disabled={editingUser?.id === currentUser.id}
                      />
                      <span className="text-sm font-medium">حساب نشط</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1">
                  {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Permissions Matrix */}
      {showPermModal && selectedUserForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="text-purple-500" size={22} />
                  صلاحيات: {selectedUserForPerms.full_name}
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {userPermissions.length} صلاحية مفعّلة
                </p>
              </div>
              <button
                onClick={() => setShowPermModal(false)}
                className="btn-ghost !p-2 hover:bg-red-500/10 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {Object.entries(permissionsByCategory).map(([cat, perms]) => {
                const catInfo = categoryNames[cat] || { icon: '📁', name: cat }
                const categoryPerms = perms.map((p) => p.code)
                const selectedCount = categoryPerms.filter((c) => userPermissions.includes(c)).length
                const allSelected = selectedCount === categoryPerms.length

                return (
                  <div key={cat} className="p-4 rounded-xl border"
                       style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold flex items-center gap-2">
                        <span>{catInfo.icon}</span>
                        {catInfo.name}
                        <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                          ({selectedCount}/{categoryPerms.length})
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat, perms)}
                        className="text-xs px-3 py-1 rounded-lg border transition-all hover:bg-primary-50"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {perms.map((p) => {
                        const isChecked = userPermissions.includes(p.code)
                        return (
                          <label
                            key={p.code}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                              isChecked ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
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

            <div className="p-4 border-t flex gap-3 flex-shrink-0"
                 style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={handleSavePermissions}
                className="btn-primary flex-1"
              >
                حفظ الصلاحيات
              </button>
              <button
                onClick={() => setShowPermModal(false)}
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