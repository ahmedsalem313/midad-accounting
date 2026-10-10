// server/database/seeds/data/subjects.js

// ============================================
// المواد لكل صف ابتدائي (مع عدد الحصص الأسبوعية)
// ============================================
export const PRIMARY_SUBJECTS_BY_GRADE = {
  'الأول الابتدائي': [
    { code: 'islamic', name: 'التربية الإسلامية', weekly: 4 },
    { code: 'arabic',  name: 'اللغة العربية',     weekly: 6 },
    { code: 'english', name: 'اللغة الإنجليزية',  weekly: 4 },
    { code: 'math',    name: 'الرياضيات',         weekly: 6 },
    { code: 'science', name: 'العلوم',            weekly: 3 },
    { code: 'social',  name: 'الاجتماعيات',       weekly: 2 },
    { code: 'art',     name: 'التربية الفنية',    weekly: 2 },
    { code: 'pe',      name: 'التربية الرياضية',  weekly: 2 },
  ],
  'الثاني الابتدائي': [
    { code: 'islamic', name: 'التربية الإسلامية', weekly: 4 },
    { code: 'arabic',  name: 'اللغة العربية',     weekly: 6 },
    { code: 'english', name: 'اللغة الإنجليزية',  weekly: 4 },
    { code: 'math',    name: 'الرياضيات',         weekly: 6 },
    { code: 'science', name: 'العلوم',            weekly: 3 },
    { code: 'social',  name: 'الاجتماعيات',       weekly: 2 },
    { code: 'art',     name: 'التربية الفنية',    weekly: 2 },
    { code: 'pe',      name: 'التربية الرياضية',  weekly: 2 },
  ],
  'الثالث الابتدائي': [
    { code: 'islamic', name: 'التربية الإسلامية', weekly: 4 },
    { code: 'arabic',  name: 'اللغة العربية',     weekly: 6 },
    { code: 'english', name: 'اللغة الإنجليزية',  weekly: 4 },
    { code: 'math',    name: 'الرياضيات',         weekly: 6 },
    { code: 'science', name: 'العلوم',            weekly: 3 },
    { code: 'social',  name: 'الاجتماعيات',       weekly: 2 },
    { code: 'computer',name: 'الحاسوب',           weekly: 2 },
    { code: 'art',     name: 'التربية الفنية',    weekly: 2 },
    { code: 'pe',      name: 'التربية الرياضية',  weekly: 2 },
  ],
  'الرابع الابتدائي': [
    { code: 'islamic', name: 'التربية الإسلامية', weekly: 4 },
    { code: 'arabic',  name: 'اللغة العربية',     weekly: 5 },
    { code: 'english', name: 'اللغة الإنجليزية',  weekly: 5 },
    { code: 'math',    name: 'الرياضيات',         weekly: 6 },
    { code: 'science', name: 'العلوم',            weekly: 4 },
    { code: 'social',  name: 'الاجتماعيات',       weekly: 3 },
    { code: 'computer',name: 'الحاسوب',           weekly: 2 },
    { code: 'art',     name: 'التربية الفنية',    weekly: 2 },
    { code: 'pe',      name: 'التربية الرياضية',  weekly: 2 },
  ],
  'الخامس الابتدائي': [
    { code: 'islamic', name: 'التربية الإسلامية', weekly: 4 },
    { code: 'arabic',  name: 'اللغة العربية',     weekly: 5 },
    { code: 'english', name: 'اللغة الإنجليزية',  weekly: 5 },
    { code: 'math',    name: 'الرياضيات',         weekly: 6 },
    { code: 'science', name: 'العلوم',            weekly: 4 },
    { code: 'social',  name: 'الاجتماعيات',       weekly: 3 },
    { code: 'computer',name: 'الحاسوب',           weekly: 2 },
    { code: 'art',     name: 'التربية الفنية',    weekly: 2 },
    { code: 'pe',      name: 'التربية الرياضية',  weekly: 2 },
  ],
  'السادس الابتدائي': [
    { code: 'islamic', name: 'التربية الإسلامية', weekly: 4 },
    { code: 'arabic',  name: 'اللغة العربية',     weekly: 5 },
    { code: 'english', name: 'اللغة الإنجليزية',  weekly: 5 },
    { code: 'math',    name: 'الرياضيات',         weekly: 6 },
    { code: 'science', name: 'العلوم',            weekly: 5 },
    { code: 'social',  name: 'الاجتماعيات',       weekly: 3 },
    { code: 'computer',name: 'الحاسوب',           weekly: 2 },
    { code: 'art',     name: 'التربية الفنية',    weekly: 2 },
    { code: 'pe',      name: 'التربية الرياضية',  weekly: 2 },
  ],
}

export const PRIMARY_GRADES_LIST = [
  'الأول الابتدائي',
  'الثاني الابتدائي',
  'الثالث الابتدائي',
  'الرابع الابتدائي',
  'الخامس الابتدائي',
  'السادس الابتدائي',
]

export const SECTIONS = ['أ', 'ب', 'ت']