const D = require('better-sqlite3');
const db = new D('./database/data/midad.db');

// ============================================
// البيانات (يمكنك تعديلها بسهولة)
// ============================================
const GRADE = 'الثاني الابتدائي';
const SECTION = 'ب';
const TOTAL_FEES = 500000;
const PAID_AMOUNT = 250000;

const students = [
  { name: 'مهدي احمد زيد مهدي',              guardian: 'احمد زيد مهدي' },
  { name: 'علي محمد علي حسين',                guardian: 'محمد علي حسين' },
  { name: 'هادي حسن ناصر عيسى',               guardian: 'حسن ناصر عيسى' },
  { name: 'محمد نعمة علي راجي',               guardian: 'نعمة علي راجي' },
  { name: 'حسين علي احمد حسن',                guardian: 'علي احمد حسن' },
  { name: 'الحسن علي محمد كريم',              guardian: 'علي محمد كريم' },
  { name: 'عبدالله عبدالرحمن هاشم رزاق',      guardian: 'عبدالرحمن هاشم رزاق' },
  { name: 'نورالهدى محمد حسن عاتي',           guardian: 'محمد حسن عاتي' },
  { name: 'بنين كاظم علي عبدالله',            guardian: 'كاظم علي عبدالله' },
  { name: 'زهراء محمد عبدالله هاشم',          guardian: 'محمد عبدالله هاشم' },
  { name: 'حوراء احمد عبدالرحيم واوي',        guardian: 'احمد عبدالرحيم واوي' },
];

// ============================================
// بدء الإضافة
// ============================================
console.log('📥 بدء إضافة الطلاب...');
console.log('');

const insertStudent = db.prepare(`
  INSERT INTO students (
    full_name, grade, section,
    guardian_name, guardian_phone,
    total_fees, status,
    enrollment_date
  ) VALUES (?, ?, ?, ?, ?, ?, 'active', date('now'))
`);

const insertPayment = db.prepare(`
  INSERT INTO payments (
    student_id, amount, paid_amount,
    payment_date, method, receipt_number,
    notes, recorded_by
  ) VALUES (?, ?, ?, date('now'), 'cash', ?, 'دفعة أولى', NULL)
`);

// جلب آخر رقم إيصال
const lastReceipt = db.prepare('SELECT receipt_number FROM payments ORDER BY id DESC LIMIT 1').get();
let receiptNum = 1;
if (lastReceipt?.receipt_number) {
  receiptNum = parseInt(lastReceipt.receipt_number.replace('R-', '')) + 1;
}

const tx = db.transaction(() => {
  let added = 0;

  students.forEach((s, idx) => {
    const phone = '077000000' + String(idx + 1).padStart(2, '0');

    // إضافة الطالب
    const result = insertStudent.run(
      s.name,
      GRADE,
      SECTION,
      s.guardian,
      phone,
      TOTAL_FEES
    );

    const studentId = result.lastInsertRowid;

    // إضافة دفعة أولى
    const receipt = 'R-' + String(receiptNum).padStart(6, '0');
    receiptNum++;

    insertPayment.run(
      studentId,
      TOTAL_FEES,
      PAID_AMOUNT,
      receipt
    );

    console.log(`✅ ${idx + 1}. ${s.name}`);
    console.log(`   👤 ولي الأمر: ${s.guardian} | 📞 ${phone}`);
    console.log(`   💰 رسوم: ${TOTAL_FEES.toLocaleString('ar-IQ')} | مدفوع: ${PAID_AMOUNT.toLocaleString('ar-IQ')}`);
    console.log('');

    added++;
  });

  console.log(`🎉 تمت إضافة ${added} طالباً بنجاح!`);
});

tx();
db.close();