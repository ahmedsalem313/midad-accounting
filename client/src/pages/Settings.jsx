import { useState, useEffect } from 'react'
import { Save, School, Settings as SettingsIcon, Calendar, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import {
  SCHOOL_TYPES,
  setCurrentSchoolType,
} from '../utils/schoolData'
import {
  SCHOOL_GENDERS,
  setCurrentSchoolGender,
} from '../utils/schoolDataExtensions'

const ALL_DAYS = [
  { value: 0, label: 'السبت' },
  { value: 1, label: 'الأحد' },
  { value: 2, label: 'الاثنين' },
  { value: 3, label: 'الثلاثاء' },
  { value: 4, label: 'الأربعاء' },
  { value: 5, label: 'الخميس' },
  { value: 6, label: 'الجمعة' },
]

const DAY_PRESETS = [
  { name: 'السبت → الخميس',  days: [0, 1, 2, 3, 4, 5] },
  { name: 'الأحد → الخميس',  days: [1, 2, 3, 4, 5] },
  { name: 'الاثنين → الخميس', days: [2, 3, 4, 5] },
]

export default function Settings() {
  const [settings, setSettings] = useState({
    school_name: 'مدرسة مداد النموذجية',
    school_type: localStorage.getItem('midad_school_type') || SCHOOL_TYPES.PRIMARY,
    school_gender: localStorage.getItem('midad_school_gender') || SCHOOL_GENDERS.MIXED,
    working_days: JSON.parse(localStorage.getItem('midad_working_days') || '[0,1,2,3,4,5]'),
    block_grades_enabled: false,
    whatsapp_auto_notify_payment: true,
    parent_portal_url: '',
    block_grades_min_debt: 0,
    block_grades_print: true,
    block_grades_whatsapp: true,
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings')
        const data = res.data.data || {}

        if (data.school_type) localStorage.setItem('midad_school_type', data.school_type)
        if (data.school_gender) localStorage.setItem('midad_school_gender', data.school_gender)

        setSettings((prev) => ({
          ...prev,
          school_name: data.school_name || prev.school_name,
          school_type: data.school_type || prev.school_type,
          school_gender: data.school_gender || prev.school_gender,
          block_grades_enabled: data.block_grades_enabled === 'true',
          whatsapp_auto_notify_payment: data.whatsapp_auto_notify_payment !== 'false',
          parent_portal_url: data.parent_portal_url || '',
          block_grades_min_debt: parseFloat(data.block_grades_min_debt) || 0,
          block_grades_print: data.block_grades_print !== 'false',
          block_grades_whatsapp: data.block_grades_whatsapp !== 'false',
        }))
      } catch (e) {
        // تجاهل
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const toggleDay = (dayValue) => {
    setSettings((prev) => {
      const has = prev.working_days.includes(dayValue)
      const newDays = has
        ? prev.working_days.filter((d) => d !== dayValue)
        : [...prev.working_days, dayValue].sort((a, b) => a - b)
      return { ...prev, working_days: newDays }
    })
  }

  const applyPreset = (days) => {
    setSettings({ ...settings, working_days: days })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      setCurrentSchoolType(settings.school_type)
      setCurrentSchoolGender(settings.school_gender)
      localStorage.setItem('midad_school_name', settings.school_name)
      localStorage.setItem('midad_working_days', JSON.stringify(settings.working_days))

      await api.put('/settings', {
        school_name: settings.school_name,
        whatsapp_auto_notify_payment: settings.whatsapp_auto_notify_payment ? 'true' : 'false',
        parent_portal_url: settings.parent_portal_url || '',
        school_type: settings.school_type,
        school_gender: settings.school_gender,
        working_days: JSON.stringify(settings.working_days),
        block_grades_enabled: settings.block_grades_enabled ? 'true' : 'false',
        block_grades_min_debt: String(settings.block_grades_min_debt),
        block_grades_print: settings.block_grades_print ? 'true' : 'false',
        block_grades_whatsapp: settings.block_grades_whatsapp ? 'true' : 'false',
      })

      toast.success('تم الحفظ بنجاح')
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      toast.error('حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="text-primary-500" size={26} />
          الإعدادات
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          إعدادات عامة للنظام
        </p>
      </div>

      {/* معلومات المدرسة */}
      <div className="glass-card p-6 space-y-5">
        <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-3"
            style={{ borderColor: 'var(--border-color)' }}>
          <School size={20} className="text-primary-500" />
          معلومات المدرسة
        </h3>

        {/* اسم المدرسة */}
        <div>
          <label className="text-sm font-medium block mb-1.5">اسم المدرسة</label>
          <input
            type="text"
            value={settings.school_name}
            onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
            className="input-modern"
          />
        </div>

        {/* نوع المدرسة */}
        <div>
          <label className="text-sm font-medium block mb-2">نوع المدرسة</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, school_type: SCHOOL_TYPES.PRIMARY })}
              className="p-4 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: settings.school_type === SCHOOL_TYPES.PRIMARY ? '#6366F1' : 'var(--border-color)',
                background: settings.school_type === SCHOOL_TYPES.PRIMARY ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)'
              }}
            >
              <div className="text-2xl mb-2">🎒</div>
              <div className="font-bold">ابتدائي فقط</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                6 صفوف
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, school_type: SCHOOL_TYPES.SECONDARY })}
              className="p-4 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: settings.school_type === SCHOOL_TYPES.SECONDARY ? '#6366F1' : 'var(--border-color)',
                background: settings.school_type === SCHOOL_TYPES.SECONDARY ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)'
              }}
            >
              <div className="text-2xl mb-2">📚</div>
              <div className="font-bold">إعدادي فقط</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                3 متوسط + 6 إعدادي
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, school_type: 'mixed' })}
              className="p-4 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: settings.school_type === 'mixed' ? '#6366F1' : 'var(--border-color)',
                background: settings.school_type === 'mixed' ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)'
              }}
            >
              <div className="text-2xl mb-2">🏫</div>
              <div className="font-bold">الاثنان</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                15 صف
              </div>
            </button>
          </div>
        </div>

        {/* جنس المدرسة */}
        <div>
          <label className="text-sm font-medium block mb-2">جنس المدرسة</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, school_gender: SCHOOL_GENDERS.BOYS })}
              className="p-4 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: settings.school_gender === SCHOOL_GENDERS.BOYS ? '#3B82F6' : 'var(--border-color)',
                background: settings.school_gender === SCHOOL_GENDERS.BOYS ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)'
              }}
            >
              <div className="text-2xl mb-2">👦</div>
              <div className="font-bold">بنين</div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, school_gender: SCHOOL_GENDERS.GIRLS })}
              className="p-4 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: settings.school_gender === SCHOOL_GENDERS.GIRLS ? '#EC4899' : 'var(--border-color)',
                background: settings.school_gender === SCHOOL_GENDERS.GIRLS ? 'rgba(236,72,153,0.1)' : 'var(--bg-card)'
              }}
            >
              <div className="text-2xl mb-2">👧</div>
              <div className="font-bold">بنات</div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, school_gender: SCHOOL_GENDERS.MIXED })}
              className="p-4 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: settings.school_gender === SCHOOL_GENDERS.MIXED ? '#8B5CF6' : 'var(--border-color)',
                background: settings.school_gender === SCHOOL_GENDERS.MIXED ? 'rgba(139,92,246,0.1)' : 'var(--bg-card)'
              }}
            >
              <div className="text-2xl mb-2">👫</div>
              <div className="font-bold">مختلط</div>
            </button>
          </div>
        </div>
      </div>
            {/* رابط بوابة ولي الأمر */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-3"
            style={{ borderColor: 'var(--border-color)' }}>
          🔗 رابط بوابة ولي الأمر
        </h3>

        <div className="text-xs p-3 rounded-lg"
             style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--text-secondary)' }}>
          💡 يُضاف هذا الرابط تلقائيًا في نهاية رسائل الواتساب لأولياء الأمور
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">رابط البوابة</label>
          <input
            type="url"
            value={settings.parent_portal_url || ''}
            onChange={(e) => setSettings({ ...settings, parent_portal_url: e.target.value })}
            className="input-modern"
            dir="ltr"
            placeholder="https://example.com/parent-login"
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            استخدم الرابط الحالي من Cloudflare Tunnel، أو رابطًا ثابتًا (إن وُجد).
          </p>
        </div>

        {settings.parent_portal_url && (
          <div className="p-3 rounded-xl text-xs"
               style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>
            ✅ سيظهر الرابط في كل رسالة واتساب لأولياء الأمور
          </div>
        )}
      </div>
      {/* إشعارات الواتساب */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-3"
            style={{ borderColor: 'var(--border-color)' }}>
          📱 إشعارات الواتساب
        </h3>

        <div className="text-xs p-3 rounded-lg"
             style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--text-secondary)' }}>
          💡 يرسل إشعارًا لولي الأمر عند تسجيل دفعة جديدة
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all"
               style={{
                 borderColor: settings.whatsapp_auto_notify_payment ? '#10B981' : 'var(--border-color)',
                 background: settings.whatsapp_auto_notify_payment ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
               }}>
          <input
            type="checkbox"
            checked={settings.whatsapp_auto_notify_payment}
            onChange={(e) => setSettings({ ...settings, whatsapp_auto_notify_payment: e.target.checked })}
            className="w-5 h-5 rounded accent-emerald-500"
          />
          <div className="flex-1">
            <p className="font-bold">إشعار ولي الأمر عند تسجيل دفعة</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              يُرسل رسالة تفاصيل الدفعة + المتبقي تلقائيًا عبر الواتساب
            </p>
          </div>
        </label>
      </div>

      {/* أيام الدوام */}
      <div className="glass-card p-6 space-y-5">
        <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-3"
            style={{ borderColor: 'var(--border-color)' }}>
          <Calendar size={20} className="text-primary-500" />
          أيام الدوام الأسبوعي
        </h3>

        <div className="text-xs p-3 rounded-lg mb-3"
             style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--text-secondary)' }}>
          💡 اختر الأيام التي تعمل فيها المدرسة. سيتم عرضها فقط في جدول الحصص.
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">اقتراحات سريعة:</label>
          <div className="flex flex-wrap gap-2">
            {DAY_PRESETS.map((preset) => {
              const isActive = JSON.stringify(preset.days) === JSON.stringify(settings.working_days)
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset.days)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all border-2"
                  style={{
                    borderColor: isActive ? '#6366F1' : 'var(--border-color)',
                    background: isActive ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
                    color: isActive ? '#6366F1' : 'var(--text-primary)',
                  }}
                >
                  {isActive && '✓ '}{preset.name}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">أو اختر يدوياً:</label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const isSelected = settings.working_days.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all border-2"
                  style={{
                    borderColor: isSelected ? '#10B981' : 'var(--border-color)',
                    background: isSelected ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
                    color: isSelected ? '#10B981' : 'var(--text-secondary)',
                  }}
                >
                  {isSelected ? '✓' : '○'} {day.label}
                </button>
              )
            })}
          </div>
        </div>

        {settings.working_days.length === 0 && (
          <div className="p-3 rounded-lg text-sm text-red-600"
               style={{ background: 'rgba(239,68,68,0.1)' }}>
            ⚠️ يجب اختيار يوم واحد على الأقل
          </div>
        )}

        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          📅 الأيام المختارة: <strong>{settings.working_days.length}</strong> يوم
        </div>
      </div>

      {/* سياسة حجب النتائج */}
      <div className="glass-card p-6 space-y-5">
        <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-3"
            style={{ borderColor: 'var(--border-color)' }}>
          <Shield size={20} className="text-primary-500" />
          سياسة حجب النتائج
        </h3>

        <div className="text-xs p-3 rounded-lg"
             style={{ background: 'rgba(245,158,11,0.1)', color: '#92400e' }}>
          💡 عند تفعيل الحجب، لن يستطيع النظام طباعة أو إرسال كشف درجات لطالب عليه متأخرات
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all"
               style={{
                 borderColor: settings.block_grades_enabled ? '#6366F1' : 'var(--border-color)',
                 background: settings.block_grades_enabled ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)',
               }}>
          <input
            type="checkbox"
            checked={settings.block_grades_enabled}
            onChange={(e) => setSettings({ ...settings, block_grades_enabled: e.target.checked })}
            className="w-5 h-5 rounded accent-primary-500"
          />
          <div className="flex-1">
            <p className="font-bold">تفعيل حجب النتائج</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              منع طباعة/إرسال كشوف الدرجات لطلاب عليهم متأخرات
            </p>
          </div>
        </label>

        {settings.block_grades_enabled && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1.5">
                الحد الأدنى للمتأخرات (د.ع)
              </label>
              <input
                type="number"
                value={settings.block_grades_min_debt}
                onChange={(e) => setSettings({ ...settings, block_grades_min_debt: parseFloat(e.target.value) || 0 })}
                className="input-modern"
                min="0"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                0 = حجب عند أي دين. 50000 = حجب إذا تجاوز الدين 50000
              </p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">نطاق الحجب:</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer"
                       style={{
                         borderColor: settings.block_grades_print ? '#10B981' : 'var(--border-color)',
                         background: settings.block_grades_print ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
                       }}>
                  <input
                    type="checkbox"
                    checked={settings.block_grades_print}
                    onChange={(e) => setSettings({ ...settings, block_grades_print: e.target.checked })}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span className="text-sm font-medium">🖨️ الطباعة</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer"
                       style={{
                         borderColor: settings.block_grades_whatsapp ? '#8B5CF6' : 'var(--border-color)',
                         background: settings.block_grades_whatsapp ? 'rgba(139,92,246,0.08)' : 'var(--bg-card)',
                       }}>
                  <input
                    type="checkbox"
                    checked={settings.block_grades_whatsapp}
                    onChange={(e) => setSettings({ ...settings, block_grades_whatsapp: e.target.checked })}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <span className="text-sm font-medium">💬 واتساب</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* زر الحفظ */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || settings.working_days.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}