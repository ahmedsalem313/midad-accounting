// ============================================
// مداد المحاسبي - البيانات الثابتة للمدارس
// ============================================

// ============================================
// أنواع المدارس
// ============================================
export const SCHOOL_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
}

// ============================================
// الصفوف
// ============================================
export const PRIMARY_GRADES = [
  'الأول الابتدائي',
  'الثاني الابتدائي',
  'الثالث الابتدائي',
  'الرابع الابتدائي',
  'الخامس الابتدائي',
  'السادس الابتدائي',
]

export const SECONDARY_GRADES = [
  'الأول المتوسط',
  'الثاني المتوسط',
  'الثالث المتوسط',
  'الرابع العلمي',
  'الرابع الأدبي',
  'الخامس العلمي',
  'الخامس الأدبي',
  'السادس العلمي',
  'السادس الأدبي',
]

export const ALL_GRADES = [...PRIMARY_GRADES, ...SECONDARY_GRADES]

// ============================================
// الشعوب
// ============================================
export const SECTIONS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي',
]

// ============================================
// المسمّى حسب نوع المدرسة
// ============================================
export function getTeacherTitle(schoolType) {
  return schoolType === SCHOOL_TYPES.SECONDARY ? 'مدرس' : 'معلم'
}

export function getTeachersTitle(schoolType) {
  return schoolType === SCHOOL_TYPES.SECONDARY ? 'المدرسون' : 'المعلمون'
}

export function getGradesByType(schoolType) {
  return schoolType === SCHOOL_TYPES.SECONDARY ? SECONDARY_GRADES : PRIMARY_GRADES
}

export function getCurrentSchoolType() {
  return localStorage.getItem('midad_school_type') || SCHOOL_TYPES.PRIMARY
}

export function setCurrentSchoolType(type) {
  localStorage.setItem('midad_school_type', type)
}

// ============================================
// المواد الأساسية
// ============================================
const SUBJECTS_COMMON = {
  islamic:    { code: 'islamic',    name: 'التربية الإسلامية',   icon: '🕌' },
  arabic:     { code: 'arabic',     name: 'اللغة العربية',       icon: '📖' },
  english:    { code: 'english',    name: 'اللغة الإنجليزية',    icon: '🔤' },
  french:     { code: 'french',     name: 'اللغة الفرنسية',      icon: '🇫🇷' },
  math:       { code: 'math',       name: 'الرياضيات',           icon: '🔢' },
  science:    { code: 'science',    name: 'العلوم',              icon: '🔬' },
  chemistry:  { code: 'chemistry',  name: 'الكيمياء',            icon: '⚗️' },
  physics:    { code: 'physics',    name: 'الفيزياء',            icon: '⚛️' },
  biology:    { code: 'biology',    name: 'الأحياء',             icon: '🧬' },
  social:     { code: 'social',     name: 'الاجتماعيات',         icon: '🌍' },
  computer:   { code: 'computer',   name: 'الحاسوب',             icon: '💻' },
  art:        { code: 'art',        name: 'التربية الفنية',      icon: '🎨' },
  pe:         { code: 'pe',         name: 'التربية الرياضية',    icon: '⚽' },
  sociology:  { code: 'sociology',  name: 'علم الاجتماع',        icon: '👥' },
  philosophy: { code: 'philosophy', name: 'الفلسفة وعلم النفس',  icon: '🧠' },
  economics:  { code: 'economics',  name: 'الاقتصاد',            icon: '💹' },
}

// ============================================
// المواد المركبة الإلزامية
// ============================================
export const FORCED_COMPOSITES = {
  arabic: {
    'primary_1_3': {
      name: 'اللغة العربية',
      icon: '📖',
      items: [
        { name: 'القراءة', max_score: 50 },
        { name: 'الإملاء', max_score: 50 },
      ],
    },
    'primary_4_6': {
      name: 'اللغة العربية',
      icon: '📖',
      items: [
        { name: 'القراءة', max_score: 50 },
        { name: 'القواعد', max_score: 50 },
      ],
    },
    'secondary': {
      name: 'اللغة العربية',
      icon: '📖',
      items: [
        { name: 'القواعد',       max_score: 30 },
        { name: 'الأدب والنصوص', max_score: 30 },
        { name: 'الإملاء',       max_score: 20 },
        { name: 'الإنشاء',       max_score: 20 },
      ],
    },
  },
  social: {
    name: 'الاجتماعيات',
    icon: '🌍',
    items: [
      { name: 'التاريخ',   max_score: 40 },
      { name: 'الجغرافيا', max_score: 40 },
      { name: 'الوطنية',   max_score: 20 },
    ],
  },
}

// ============================================
// هل المادة مركبة إلزامياً؟
// ============================================
export function getForcedComposite(grade, subjectCode) {
  // اللغة العربية
  if (subjectCode === 'arabic') {
    if (['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي'].includes(grade)) {
      return FORCED_COMPOSITES.arabic['primary_1_3']
    }
    if (['الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'].includes(grade)) {
      return FORCED_COMPOSITES.arabic['primary_4_6']
    }
    return FORCED_COMPOSITES.arabic['secondary']
  }

  // الاجتماعيات
  if (subjectCode === 'social') {
    return FORCED_COMPOSITES.social
  }

  return null
}

// ============================================
// المواد لكل صف
// ============================================
export const GRADE_SUBJECTS = {
  // 🎒 ابتدائي
  'الأول الابتدائي': {
    max_score: 10,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'art', 'pe'],
  },
  'الثاني الابتدائي': {
    max_score: 10,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'art', 'pe'],
  },
  'الثالث الابتدائي': {
    max_score: 10,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'art', 'pe'],
  },
  'الرابع الابتدائي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'social', 'art', 'pe'],
  },
  'الخامس الابتدائي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'social', 'art', 'pe'],
  },
  'السادس الابتدائي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'social', 'art', 'pe'],
  },

  // 📚 متوسط
  'الأول المتوسط': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'social', 'computer', 'french'],
  },
  'الثاني المتوسط': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'science', 'social', 'computer', 'french'],
  },
  'الثالث المتوسط': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'chemistry', 'physics', 'biology', 'social', 'computer', 'french'],
  },

  // 🔬 إعدادي علمي
  'الرابع العلمي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'chemistry', 'physics', 'biology', 'computer'],
  },
  'الخامس العلمي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'chemistry', 'physics', 'biology', 'computer'],
  },
  'السادس العلمي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'chemistry', 'physics', 'biology', 'computer'],
  },

  // 📜 إعدادي أدبي
  'الرابع الأدبي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'social', 'sociology', 'computer'],
  },
  'الخامس الأدبي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'social', 'philosophy', 'computer'],
  },
  'السادس الأدبي': {
    max_score: 100,
    subjects: ['islamic', 'arabic', 'english', 'math', 'social', 'economics', 'computer'],
  },
}

// ============================================
// دوال مساعدة
// ============================================
export function getGradeInfo(grade) {
  return GRADE_SUBJECTS[grade] || { max_score: 100, subjects: [] }
}

export function getSubjectsForGrade(grade) {
  const info = getGradeInfo(grade)
  return info.subjects.map((code) => SUBJECTS_COMMON[code]).filter(Boolean)
}

export function getMaxScore(grade) {
  return getGradeInfo(grade).max_score
}

export function getSubjectByCode(code) {
  return SUBJECTS_COMMON[code]
}

export const ALL_SUBJECTS = Object.values(SUBJECTS_COMMON)

// ============================================
// أنواع الامتحانات والفصول
// ============================================
export const EXAM_TYPES = [
  { value: 'monthly_1', label: 'الشهري الأول',  short: 'ش1' },
  { value: 'monthly_2', label: 'الشهري الثاني', short: 'ش2' },
  { value: 'midterm',   label: 'نصف السنة',     short: 'نص' },
  { value: 'final',     label: 'النهائي',       short: 'نه' },
]

export const SEMESTERS = [
  { value: 'first',  label: 'الفصل الأول' },
  { value: 'second', label: 'الفصل الثاني' },
]

// ============================================
// قالب مقترح (يظهر فقط إذا اختار المدرس "مقسمة" لمادة غير إلزامية)
// ============================================
export function getSuggestedTemplate(grade, subjectCode) {
  return getForcedComposite(grade, subjectCode)
}