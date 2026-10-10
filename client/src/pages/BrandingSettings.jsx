import { useState, useEffect, useRef } from 'react'
import {
  Palette, Upload, Trash2, Save, Image as ImageIcon,
  FileImage, Stamp, PenTool, AlertCircle, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const PRESET_COLORS = [
  { primary: '#6366F1', secondary: '#8B5CF6', name: 'بنفسجي ملكي' },
  { primary: '#10B981', secondary: '#059669', name: 'أخضر زمردي' },
  { primary: '#3B82F6', secondary: '#1E40AF', name: 'أزرق ملكي' },
  { primary: '#EF4444', secondary: '#DC2626', name: 'أحمر ياقوتي' },
  { primary: '#F59E0B', secondary: '#D97706', name: 'ذهبي' },
  { primary: '#EC4899', secondary: '#BE185D', name: 'وردي' },
  { primary: '#14B8A6', secondary: '#0F766E', name: 'فيروزي' },
  { primary: '#1E293B', secondary: '#0F172A', name: 'أسود أنيق' },
]

const TEMPLATES = [
  {
    id: 'a4',
    name: 'A4 رسمي',
    desc: 'فواتير مطبوعة بحجم A4 — مثالي للطباعة الملونة',
    icon: '📄',
    size: '210 × 297 mm',
  },
  {
    id: 'a5',
    name: 'A5 مصغّر',
    desc: 'إيصالات بحجم A5 — مثالي للطباعة الاقتصادية',
    icon: '📃',
    size: '148 × 210 mm',
  },
  {
    id: 'thermal',
    name: 'حراري 80mm',
    desc: 'للطابعات الحرارية — مثالي للمحاسبة السريعة',
    icon: '🧾',
    size: '80 mm',
  },
]

export default function BrandingSettings() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({ logo: false, signature: false, stamp: false })

  const [data, setData] = useState({
    school_logo: '',
    school_signature: '',
    school_stamp: '',
    brand_primary_color: '#6366F1',
    brand_secondary_color: '#8B5CF6',
    invoice_template: 'a5',
    school_motto: '',
  })

  const logoInputRef = useRef(null)
  const signatureInputRef = useRef(null)
  const stampInputRef = useRef(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/branding')
      const d = res.data.data || {}
      setData((prev) => ({
        ...prev,
        ...d,
        brand_primary_color: d.brand_primary_color || prev.brand_primary_color,
        brand_secondary_color: d.brand_secondary_color || prev.brand_secondary_color,
        invoice_template: d.invoice_template || prev.invoice_template,
      }))
    } catch (e) {
      toast.error('فشل التحميل')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (type, file) => {
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت')
      return
    }

    setUploading((p) => ({ ...p, [type]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post(`/branding/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setData((prev) => ({ ...prev, [`school_${type}`]: res.data.data.url }))
      toast.success('تم الرفع')
    } catch (e) {
      toast.error(e.response?.data?.error || 'فشل الرفع')
    } finally {
      setUploading((p) => ({ ...p, [type]: false }))
    }
  }

  const handleDelete = async (type) => {
    if (!confirm(`حذف ${type === 'logo' ? 'الشعار' : type === 'signature' ? 'التوقيع' : 'الختم'}؟`)) return
    try {
      await api.delete(`/branding/${type}`)
      setData((prev) => ({ ...prev, [`school_${type}`]: '' }))
      toast.success('تم الحذف')
    } catch (e) {
      toast.error('فشل الحذف')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/branding', {
        brand_primary_color: data.brand_primary_color,
        brand_secondary_color: data.brand_secondary_color,
        invoice_template: data.invoice_template,
        school_motto: data.school_motto,
      })
      toast.success('تم الحفظ بنجاح')
    } catch (e) {
      toast.error('فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const applyPreset = (preset) => {
    setData((prev) => ({
      ...prev,
      brand_primary_color: preset.primary,
      brand_secondary_color: preset.secondary,
    }))
  }

  const renderUploadBox = ({ type, label, icon: Icon, value, inputRef }) => {
    const isUploading = uploading[type]
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={18} className="text-primary-500" />
          <h4 className="font-bold">{label}</h4>
        </div>

        {value ? (
          <div className="relative">
            <div className="p-4 rounded-xl border-2 flex items-center justify-center"
                 style={{ borderColor: 'var(--border-color)', background: '#f8fafc', minHeight: '140px' }}>
              <img
                src={value}
                alt={label}
                className="max-h-32 max-w-full object-contain"
              />
            </div>
            {hasPermission('settings.edit') && (
              <button
                onClick={() => handleDelete(type)}
                className="absolute top-2 end-2 btn-ghost !p-2 text-red-500 bg-white shadow-md rounded-full"
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={() => hasPermission('settings.edit') && inputRef.current?.click()}
            className="p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all hover:border-primary-500"
            style={{ borderColor: 'var(--border-color)', minHeight: '140px' }}
          >
            {isUploading ? (
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            ) : (
              <Upload size={32} className="mx-auto mb-2 text-slate-400" />
            )}
            <p className="text-sm font-medium mb-1">
              {isUploading ? 'جاري الرفع...' : `ارفع ${label}`}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              PNG, JPG, SVG — حتى 5 MB
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => handleUpload(type, e.target.files?.[0])}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="text-primary-500" size={26} />
            الهوية البصرية
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            الشعار، التوقيع، الختم، الألوان، وقوالب الفواتير
          </p>
        </div>

        {hasPermission('settings.edit') && (
          <button onClick={handleSave} disabled={saving}
                  className="btn-primary flex items-center gap-2">
            <Save size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        )}
      </div>

      {/* الشعارات */}
      <div>
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <ImageIcon size={20} className="text-primary-500" />
          الشعار والختم
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderUploadBox({
            type: 'logo',
            label: 'شعار المدرسة',
            icon: ImageIcon,
            value: data.school_logo,
            inputRef: logoInputRef,
          })}
          {renderUploadBox({
            type: 'signature',
            label: 'توقيع المدير',
            icon: PenTool,
            value: data.school_signature,
            inputRef: signatureInputRef,
          })}
          {renderUploadBox({
            type: 'stamp',
            label: 'ختم المدرسة',
            icon: Stamp,
            value: data.school_stamp,
            inputRef: stampInputRef,
          })}
        </div>
      </div>

      {/* الشعار النصي */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          📝 الشعار النصي (Motto)
        </h3>
        <input
          type="text"
          value={data.school_motto || ''}
          onChange={(e) => setData({ ...data, school_motto: e.target.value })}
          className="input-modern"
          placeholder="مثال: العلم نور والجهل ظلام"
          maxLength={100}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          يظهر أسفل شعار المدرسة في الفواتير والكشوف
        </p>
      </div>

      {/* الألوان */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          🎨 الألوان
        </h3>

        <div className="mb-5">
          <label className="text-sm font-medium block mb-2">اختر لونًا جاهزًا:</label>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {PRESET_COLORS.map((preset) => {
              const isActive =
                data.brand_primary_color === preset.primary &&
                data.brand_secondary_color === preset.secondary
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="relative p-3 rounded-xl transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    border: isActive ? '3px solid #1e293b' : '3px solid transparent',
                  }}
                  title={preset.name}
                >
                  {isActive && (
                    <Check size={18} className="text-white absolute inset-0 m-auto" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">اللون الرئيسي</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={data.brand_primary_color}
                onChange={(e) => setData({ ...data, brand_primary_color: e.target.value })}
                className="w-16 h-10 rounded-lg cursor-pointer border-2"
                style={{ borderColor: 'var(--border-color)' }}
              />
              <input
                type="text"
                value={data.brand_primary_color}
                onChange={(e) => setData({ ...data, brand_primary_color: e.target.value })}
                className="input-modern flex-1"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">اللون الثانوي</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={data.brand_secondary_color}
                onChange={(e) => setData({ ...data, brand_secondary_color: e.target.value })}
                className="w-16 h-10 rounded-lg cursor-pointer border-2"
                style={{ borderColor: 'var(--border-color)' }}
              />
              <input
                type="text"
                value={data.brand_secondary_color}
                onChange={(e) => setData({ ...data, brand_secondary_color: e.target.value })}
                className="input-modern flex-1"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* معاينة */}
        <div className="mt-5 p-4 rounded-xl"
             style={{
               background: `linear-gradient(135deg, ${data.brand_primary_color}20, ${data.brand_secondary_color}20)`,
               border: `2px solid ${data.brand_primary_color}40`,
             }}>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
            معاينة:
          </p>
          <button
            className="px-6 py-2 rounded-lg text-white font-medium"
            style={{
              background: `linear-gradient(135deg, ${data.brand_primary_color}, ${data.brand_secondary_color})`,
            }}
          >
            زر تجريبي
          </button>
        </div>
      </div>

      {/* قوالب الفاتورة */}
      <div className="glass-card p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          🧾 قالب الفاتورة الافتراضي
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => {
            const isActive = data.invoice_template === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setData({ ...data, invoice_template: t.id })}
                className="p-4 rounded-xl border-2 transition-all text-start"
                style={{
                  borderColor: isActive ? data.brand_primary_color : 'var(--border-color)',
                  background: isActive ? `${data.brand_primary_color}15` : 'var(--bg-card)',
                }}
              >
                <div className="text-3xl mb-2">{t.icon}</div>
                <div className="font-bold">{t.name}</div>
                <div className="text-xs mt-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t.desc}
                </div>
                <div className="text-xs font-mono" style={{ color: data.brand_primary_color }}>
                  {t.size}
                </div>
                {isActive && (
                  <div className="mt-2 text-xs font-bold" style={{ color: data.brand_primary_color }}>
                    ✓ القالب الحالي
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* تلميح */}
      <div className="p-3 rounded-xl flex items-start gap-2 text-xs"
           style={{ background: 'rgba(245,158,11,0.1)', color: '#92400e' }}>
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>ملاحظة:</strong> الشعار واللون سيظهران في الفواتير الجديدة فقط.
          الفواتير المطبوعة سابقًا لن تتأثر.
        </div>
      </div>
    </div>
  )
}