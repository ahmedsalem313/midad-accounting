import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit, Trash2, X, Settings, DollarSign,
  AlertCircle, Users, Save, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getTeacherTitle, getCurrentSchoolType } from '../utils/schoolData'

const SALARY_TYPES = [
  { value: 'fixed',      label: 'مقطوع (ثابت)',       color: '#6366F1', icon: '💰' },
  { value: 'per_lesson', label: 'بالحصة',             color: '#10B981', icon: '📚' },
  { value: 'mixed',      label: 'مركّب',              color: '#8B5CF6', icon: '🔀' },
]

export default function SalaryConfig() {
  const { hasPermission } = useAuth()
  const schoolType = getCurrentSchoolType()
  const teacherTitle = getTeacherTitle(schoolType)

  const [configs, setConfigs] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [formData, setFormData] = useState(getEmptyForm())

  function getEmptyForm() {
    return {
      teacher_id: '',
      salary_type: 'fixed',
      base_salary: 0,
      lesson_price: 0,
      hourly_rate: 0,
      commission_rate: 0,
      housing_allowance: 0,
      transport_allowance: 0,
      other_allowance: 0,
      absence_deduction_per_day: 0,
      late_deduction_per_minute: 0,
      effective_from: new Date().toISOString().split('T')[0],
      notes: '',
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [configsRes, usersRes] = await Promise.all([
        api.get('/salary-config'),
        api.get('/users'),
      ])
      setConfigs(configsRes.data.data)
      const teacherUsers = usersRes.data.data.filter(
        (u) => u.role === 'teacher' || u.role === 'accountant'
      )
      setTeachers(teacherUsers)
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const filtered = configs.filter((c) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return c.teacher_name?.toLowerCase().includes(q)
  })

  const openAdd = (teacher = null) => {
    setEditingConfig(null)
    setFormData({
      ...getEmptyForm(),
      teacher_id: teacher?.id || '',
    })
    setShowModal(true)
  }

  const openEdit = (config) => {
    setEditingConfig(config)
    setFormData({
      teacher_id: config.teacher_id,
      salary_type: config.salary_type || 'fixed',
      base_salary: config.base_salary || 0,
      lesson_price: config.lesson_price || 0,
      hourly_rate: config.hourly_rate || 0,
      commission_rate: config.commission_rate || 0,
      housing_allowance: config.housing_allowance || 0,
      transport_allowance: config.transport_allowance || 0,
      other_allowance: config.other_allowance || 0,
      absence_deduction_per_day: config.absence_deduction_per_day || 0,
      late_deduction_per_minute: config.late_deduction_per_minute || 0,
      effective_from: config.effective_from || new Date().toISOString().split('T')[0],
      notes: config.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.teacher_id || !formData.salary_type) {
      toast.error('يرجى إدخال البيانات المطلوبة')
      return
    }

    try {
      await api.post('/salary-config', formData)
      toast.success('تم الحفظ بنجاح')
      setShowModal(false)
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleDelete = async (config) => {
    if (!confirm(`حذف إعدادات راتب ${config.teacher_name}؟`)) return
    try {
      await api.delete(`/salary-config/${config.id}`)
      toast.success('تم الحذف')
      fetchAll()
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const fmt = (n) => (n || 0).toLocaleString('ar-IQ')
  const getTypeInfo = (type) => SALARY_TYPES.find((t) => t.value === type) || SALARY_TYPES[0]

  // المعلمون بدون إعداد
  const unconfiguredTeachers = teachers.filter(
    (t) => !configs.some((c) => c.teacher_id === t.id)
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-primary-500" size={26} />
            إعداد رواتب {teacherTitle}ين
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {configs.length} من {teachers.length} مُهيّأ
          </p>
        </div>

        {hasPermission('payroll.calculate') && (
          <button onClick={() => openAdd()} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إعداد راتب
          </button>
        )}
      </div>

      {/* تنبيه: معلمون بدون إعداد */}
      {unconfiguredTeachers.length > 0 && (
        <div className="glass-card p-4 border-2"
             style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-bold text-amber-700 dark:text-amber-400">
                {unconfiguredTeachers.length} {teacherTitle} بدون إعداد راتب
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {unconfiguredTeachers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openAdd(t)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-amber-500 hover:text-white"
                    style={{ borderColor: 'rgba(245,158,11,0.5)' }}
                  >
                    + {t.full_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3"
                  style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="🔍 بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-modern ps-10"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="glass-card p-10 text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <AlertCircle size={48} className="mx-auto mb-3 text-slate-400" />
          <p style={{ color: 'var(--text-secondary)' }}>
            لا يوجد إعدادات رواتب
          </p>
          {hasPermission('payroll.calculate') && (
            <button onClick={() => openAdd()} className="btn-primary mt-4">
              ابدأ الآن
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((config) => {
            const typeInfo = getTypeInfo(config.salary_type)
            return (
              <div key={config.id} className="glass-card p-5 hover:scale-[1.02] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold"
                         style={{ background: `linear-gradient(135deg, ${typeInfo.color}, ${typeInfo.color}cc)` }}>
                      {config.teacher_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{config.teacher_name}</p>
                      <span className="badge text-xs"
                            style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                    </div>
                  </div>
                  {hasPermission('payroll.calculate') && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(config)}
                              className="btn-ghost !p-1.5 text-blue-500"
                              title="تعديل">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(config)}
                              className="btn-ghost !p-1.5 text-red-500"
                              title="حذف">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-sm">
                  {/* راتب ثابت */}
                  {(config.salary_type === 'fixed' || config.salary_type === 'mixed') &&
                    config.base_salary > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>💰 راتب ثابت:</span>
                      <span className="font-bold">{fmt(config.base_salary)}</span>
                    </div>
                  )}

                  {/* بالحصة */}
                  {(config.salary_type === 'per_lesson' || config.salary_type === 'mixed') &&
                    config.lesson_price > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>📚 سعر الحصة:</span>
                      <span className="font-bold text-emerald-600">{fmt(config.lesson_price)}</span>
                    </div>
                  )}

                  {/* بالساعة */}
                  {config.salary_type === 'mixed' && config.hourly_rate > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>⏰ سعر الساعة:</span>
                      <span className="font-bold text-blue-500">{fmt(config.hourly_rate)}</span>
                    </div>
                  )}

                  {/* نسبة إيراد */}
                  {config.salary_type === 'mixed' && config.commission_rate > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>📊 نسبة الإيراد:</span>
                      <span className="font-bold text-purple-500">{config.commission_rate}%</span>
                    </div>
                  )}

                  {/* بدلات */}
                  {(config.housing_allowance > 0 || config.transport_allowance > 0 || config.other_allowance > 0) && (
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>🏠 بدلات:</span>
                        <span className="font-semibold">
                          {fmt(config.housing_allowance + config.transport_allowance + config.other_allowance)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* خصومات */}
                  {(config.absence_deduction_per_day > 0 || config.late_deduction_per_minute > 0) && (
                    <div className="pt-1 text-xs flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>خصم غياب/يوم:</span>
                      <span className="text-red-500 font-semibold">{fmt(config.absence_deduction_per_day)}</span>
                    </div>
                  )}
                </div>

                {config.notes && (
                  <div className="mt-3 p-2 rounded-lg text-xs"
                       style={{ background: 'rgba(99,102,241,0.08)' }}>
                    📝 {config.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="text-primary-500" size={22} />
                {editingConfig ? 'تعديل إعداد راتب' : 'إعداد راتب جديد'}
              </h3>
              <button onClick={() => setShowModal(false)}
                      className="btn-ghost !p-2 text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* اختيار المعلم */}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  {teacherTitle} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="input-modern"
                  required
                  disabled={!!editingConfig}
                >
                  <option value="">اختر...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              {/* نوع الراتب */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  نوع الراتب <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SALARY_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, salary_type: t.value })}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: formData.salary_type === t.value ? t.color : 'var(--border-color)',
                        background: formData.salary_type === t.value ? `${t.color}15` : 'var(--bg-card)',
                      }}
                    >
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <div className="text-xs font-bold"
                           style={{ color: formData.salary_type === t.value ? t.color : 'var(--text-primary)' }}>
                        {t.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* الحقول حسب النوع */}
              <div className="p-4 rounded-xl space-y-3"
                   style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>

                {/* ثابت */}
                {(formData.salary_type === 'fixed' || formData.salary_type === 'mixed') && (
                  <div>
                    <label className="text-sm font-medium block mb-1.5">💰 الراتب الثابت الشهري (د.ع)</label>
                    <input
                      type="number"
                      value={formData.base_salary}
                      onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
                      className="input-modern"
                      min="0"
                    />
                  </div>
                )}

                {/* بالحصة */}
                {(formData.salary_type === 'per_lesson' || formData.salary_type === 'mixed') && (
                  <div>
                    <label className="text-sm font-medium block mb-1.5">📚 سعر الحصة الواحدة (د.ع)</label>
                    <input
                      type="number"
                      value={formData.lesson_price}
                      onChange={(e) => setFormData({ ...formData, lesson_price: parseFloat(e.target.value) || 0 })}
                      className="input-modern"
                      min="0"
                    />
                  </div>
                )}

                {/* بالساعة / نسبة */}
                {formData.salary_type === 'mixed' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">⏰ سعر الساعة (د.ع)</label>
                        <input
                          type="number"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                          className="input-modern"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">📊 نسبة الإيراد (%)</label>
                        <input
                          type="number"
                          value={formData.commission_rate}
                          onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                          className="input-modern"
                          min="0"
                          max="100"
                          step="0.5"
                        />
                      </div>
                    </div>
                    <div className="text-xs p-2 rounded-lg"
                         style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                      💡 النسبة تُحسب من إجمالي الأقساط المحصلة في الشهر
                    </div>
                  </>
                )}
              </div>

              {/* البدلات */}
              <div>
                <label className="text-sm font-bold block mb-3">🏠 البدلات الشهرية (اختياري)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs block mb-1">بدل سكن</label>
                    <input
                      type="number"
                      value={formData.housing_allowance}
                      onChange={(e) => setFormData({ ...formData, housing_allowance: parseFloat(e.target.value) || 0 })}
                      className="input-modern !py-2 !text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">بدل نقل</label>
                    <input
                      type="number"
                      value={formData.transport_allowance}
                      onChange={(e) => setFormData({ ...formData, transport_allowance: parseFloat(e.target.value) || 0 })}
                      className="input-modern !py-2 !text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">أخرى</label>
                    <input
                      type="number"
                      value={formData.other_allowance}
                      onChange={(e) => setFormData({ ...formData, other_allowance: parseFloat(e.target.value) || 0 })}
                      className="input-modern !py-2 !text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* الخصومات */}
              <div>
                <label className="text-sm font-bold block mb-3">💸 إعدادات الخصم</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs block mb-1">خصم اليوم الواحد (غائب)</label>
                    <input
                      type="number"
                      value={formData.absence_deduction_per_day}
                      onChange={(e) => setFormData({ ...formData, absence_deduction_per_day: parseFloat(e.target.value) || 0 })}
                      className="input-modern !py-2 !text-sm"
                      min="0"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {formData.salary_type === 'per_lesson'
                        ? '(لا يُطبق على بالحصة)'
                        : `افتراضي: ${formData.base_salary > 0 ? Math.round(formData.base_salary / 30).toLocaleString('ar-IQ') : 0} د.ع`}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs block mb-1">خصم الدقيقة تأخير</label>
                    <input
                      type="number"
                      value={formData.late_deduction_per_minute}
                      onChange={(e) => setFormData({ ...formData, late_deduction_per_minute: parseFloat(e.target.value) || 0 })}
                      className="input-modern !py-2 !text-sm"
                      min="0"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      (قرار المدير)
                    </p>
                  </div>
                </div>
              </div>

              {/* تاريخ + ملاحظات */}
              <div>
                <label className="text-sm font-medium block mb-1.5">تاريخ السريان</label>
                <input
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  className="input-modern"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-modern"
                  rows="2"
                  placeholder="مثال: اتفاق خاص مع المدرس..."
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  حفظ الإعدادات
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}