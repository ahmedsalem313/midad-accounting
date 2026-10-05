// ============================================
// ملحقات schoolData - نوع المدرسة والجنس
// ============================================
import {
  SCHOOL_TYPES as BASE_SCHOOL_TYPES,
  PRIMARY_GRADES,
  SECONDARY_GRADES,
  ALL_GRADES,
} from './schoolData'

// أنواع المدارس الموسّعة
export const SCHOOL_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  MIXED: 'mixed',
}

// جنس المدرسة
export const SCHOOL_GENDERS = {
  BOYS: 'boys',
  GIRLS: 'girls',
  MIXED: 'mixed',
}

// الصفوف حسب النوع
export function getGradesByTypeExtended(schoolType) {
  if (schoolType === SCHOOL_TYPES.MIXED) return ALL_GRADES
  if (schoolType === SCHOOL_TYPES.SECONDARY) return SECONDARY_GRADES
  return PRIMARY_GRADES
}

// الجنس
export function getCurrentSchoolGender() {
  return localStorage.getItem('midad_school_gender') || SCHOOL_GENDERS.MIXED
}

export function setCurrentSchoolGender(gender) {
  localStorage.setItem('midad_school_gender', gender)
}

export function getSchoolTypeLabel(type) {
  return {
    [SCHOOL_TYPES.PRIMARY]:   'ابتدائي',
    [SCHOOL_TYPES.SECONDARY]: 'إعدادي/ثانوي',
    [SCHOOL_TYPES.MIXED]:     'ابتدائي + إعدادي',
  }[type] || 'ابتدائي'
}

export function getSchoolGenderLabel(gender) {
  return {
    [SCHOOL_GENDERS.BOYS]:  'بنين',
    [SCHOOL_GENDERS.GIRLS]: 'بنات',
    [SCHOOL_GENDERS.MIXED]: 'مختلط',
  }[gender] || 'مختلط'
}
