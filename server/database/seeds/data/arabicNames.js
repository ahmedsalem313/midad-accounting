// server/database/seeds/data/arabicNames.js

// ============================================
// أسماء أولاد
// ============================================
export const MALE_FIRST_NAMES = [
  'أحمد', 'محمد', 'علي', 'حسن', 'حسين', 'مصطفى', 'محمود', 'يوسف',
  'عمر', 'خالد', 'إبراهيم', 'عبدالله', 'عبدالرحمن', 'كريم', 'سامي',
  'زيد', 'حمزة', 'بلال', 'أنس', 'معاذ', 'أسامة', 'أيمن', 'رامي',
  'سيف', 'فارس', 'نبيل', 'وليد', 'طارق', 'حيدر', 'منتظر', 'مرتضى',
  'صادق', 'جواد', 'كاظم', 'موسى', 'مهدي', 'رعد', 'نعيم', 'سجاد',
  'محسن', 'عباس', 'قاسم', 'جاسم', 'هشام', 'وسام', 'بشار', 'علاء',
  'قصي', 'مازن', 'غيث', 'ليث', 'آدم', 'مروان', 'يزن', 'بهاء',
  'عادل', 'فادي', 'زياد', 'رائد', 'سليم', 'عصام', 'هاني', 'راضي',
]

// ============================================
// أسماء بنات
// ============================================
export const FEMALE_FIRST_NAMES = [
  'فاطمة', 'زينب', 'مريم', 'عائشة', 'خديجة', 'سارة', 'نور', 'هدى',
  'رجاء', 'إيمان', 'أمل', 'وفاء', 'سمية', 'رقية', 'حوراء', 'آلاء',
  'دعاء', 'تقى', 'إسراء', 'روان', 'ريم', 'ليلى', 'سلمى', 'ملاك',
  'جنى', 'رنا', 'شهد', 'هبة', 'ياسمين', 'زهراء', 'بتول', 'حور',
  'رند', 'لمار', 'دانة', 'جود', 'لينا', 'ميرا', 'رهف', 'تالا',
  'غزل', 'شيماء', 'نجلاء', 'سماح', 'سحر', 'نسرين', 'سمر', 'رشا',
  'أسماء', 'نهى', 'سهام', 'عبير', 'هند', 'مروة', 'بشرى', 'صفاء',
  'نادية', 'سميرة', 'فريدة', 'لبنى', 'سعاد', 'نجاة', 'ثريا', 'وداد',
]

// ============================================
// أسماء العائلات (اللقب)
// ============================================
export const FAMILY_NAMES = [
  'المحمداوي', 'الجبوري', 'العبيدي', 'الزيدي', 'الدليمي', 'السعدي',
  'الحسيني', 'التميمي', 'الربيعي', 'الشمري', 'الخفاجي', 'العزاوي',
  'الجنابي', 'الكناني', 'العامري', 'البدراني', 'المالكي', 'الزبيدي',
  'الأنباري', 'الراوي', 'البغدادي', 'الموصلي', 'البصري', 'الكربلائي',
  'النجفي', 'الحلي', 'الديالى', 'التكريتي', 'السامرائي', 'الكعبي',
  'الغزي', 'السويدي', 'الفراتي', 'الموسوي', 'الحسناوي', 'البياتي',
  'الطائي', 'الحديثي', 'الجشعمي', 'الجبلاوي', 'الشويلي', 'الفهداوي',
  'المياحي', 'الجابري', 'اللايذ', 'الغانم', 'الحمداني', 'الجحيشي',
]

// ============================================
// أسماء أولياء الأمور (ذكور — الآباء)
// ============================================
export const FATHERS_PREFIX = ['أبو', 'والد']

// ============================================
// مسميات المعلمين/المعلمات
// ============================================
export const TEACHER_TITLES_MALE = ['الأستاذ', 'المعلم']
export const TEACHER_TITLES_FEMALE = ['الأستاذة', 'المعلمة']

// ============================================
// أسماء محاسبين افتراضية
// ============================================
export const ACCOUNTANT_NAMES = [
  { first: 'سامر', family: 'العبيدي', gender: 'male' },
  { first: 'ريم', family: 'الجبوري', gender: 'female' },
]

// ============================================
// أسماء المدير ونائبه
// ============================================
export const ADMIN_NAMES = [
  { first: 'عبدالكريم', family: 'المحمداوي', gender: 'male', role: 'admin' },
  { first: 'سعاد', family: 'الحسيني', gender: 'female', role: 'admin' },
]

// ============================================
// دوال مساعدة
// ============================================
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickUnique(pool, count) {
  const shuffled = [...pool].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

/**
 * توليد اسم طالب كامل
 * @param {string} gender - 'male' أو 'female'
 * @param {string} fatherName - اسم الأب (يُستخدم كلقب عائلي غالبًا)
 */
export function generateStudentName(gender, fatherName = null) {
  const first = gender === 'female' ? pickRandom(FEMALE_FIRST_NAMES) : pickRandom(MALE_FIRST_NAMES)
  const father = fatherName || pickRandom(MALE_FIRST_NAMES)
  const family = pickRandom(FAMILY_NAMES)
  return {
    full_name: `${first} ${father} ${family}`,
    first_name: first,
    father_name: father,
    family_name: family,
  }
}

/**
 * توليد اسم معلم كامل
 */
export function generateTeacherName(gender) {
  const first = gender === 'female' ? pickRandom(FEMALE_FIRST_NAMES) : pickRandom(MALE_FIRST_NAMES)
  const father = pickRandom(MALE_FIRST_NAMES)
  const family = pickRandom(FAMILY_NAMES)
  return {
    full_name: `${first} ${father} ${family}`,
    first_name: first,
    father_name: father,
    family_name: family,
  }
}

/**
 * توليد رقم هاتف عراقي افتراضي
 */
export function generateIraqiPhone() {
  const prefixes = ['0770', '0771', '0772', '0780', '0781', '0790', '0750', '0751']
  const prefix = pickRandom(prefixes)
  const rest = Math.floor(1000000 + Math.random() * 9000000)
  return `${prefix}${rest}`
}

/**
 * توليد رقم طالب
 */
export function generateStudentNumber(index) {
  return String(10000 + index).padStart(5, '0')
}

export { pickRandom, pickUnique }