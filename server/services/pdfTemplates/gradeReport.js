// server/services/pdfTemplates/gradeReport.js

// ============================================
// قالب HTML لكشف الدرجات
// ============================================
export function renderGradeReportHTML({ student, grades, schoolName, logoUrl, schoolMotto, brandColor, brandColor2 }) {
  const primary = brandColor || '#6366F1'
  const secondary = brandColor2 || '#8B5CF6'

  // حساب المعدل
  const totalScore = grades.reduce((s, g) => s + g.score, 0)
  const totalMax = grades.reduce((s, g) => s + (g.max_score || 100), 0)
  const average = totalMax > 0 ? (totalScore / totalMax) * 100 : 0

  // تقدير
  let rating = 'ضعيف'
  let ratingColor = '#EF4444'
  if (average >= 90) { rating = 'ممتاز'; ratingColor = '#10B981' }
  else if (average >= 80) { rating = 'جيد جدًا'; ratingColor = '#3B82F6' }
  else if (average >= 70) { rating = 'جيد'; ratingColor = '#6366F1' }
  else if (average >= 60) { rating = 'متوسط'; ratingColor = '#F59E0B' }
  else if (average >= 50) { rating = 'مقبول'; ratingColor = '#F97316' }

  // تجميع الدرجات حسب المادة
  const bySubject = {}
  for (const g of grades) {
    if (!bySubject[g.subject_name]) {
      bySubject[g.subject_name] = []
    }
    bySubject[g.subject_name].push(g)
  }

  // أسطر الجدول
  const rows = grades.map((g, i) => {
    const pct = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0
    let pctColor = '#EF4444'
    if (pct >= 90) pctColor = '#10B981'
    else if (pct >= 75) pctColor = '#3B82F6'
    else if (pct >= 50) pctColor = '#F59E0B'

    return `
      <tr class="${i % 2 === 0 ? 'row-even' : ''}">
        <td class="subject">${g.subject_name || g.subject}</td>
        <td class="score">${g.score}</td>
        <td class="max-score">${g.max_score}</td>
        <td class="percentage" style="color: ${pctColor};">${pct.toFixed(1)}%</td>
      </tr>
    `
  }).join('')

  const today = new Date().toLocaleDateString('en-GB')
  const logoHTML = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" class="logo" />`
    : `<div class="logo-placeholder">🖋️</div>`

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>كشف درجات - ${student.full_name}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      background: white;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.6;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      margin: 0 auto;
      position: relative;
    }

    /* ============================================
       الترويسة
    ============================================ */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 15px;
      border-bottom: 3px double ${primary};
      margin-bottom: 20px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }

    .logo-placeholder {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${primary}, ${secondary});
      border-radius: 12px;
      color: white;
      font-size: 32px;
    }

    .school-info h1 {
      font-size: 20px;
      font-weight: 800;
      color: ${primary};
      margin-bottom: 4px;
    }

    .school-info .motto {
      font-size: 11px;
      color: #64748b;
    }

    .header-left {
      text-align: left;
      font-size: 11px;
      color: #64748b;
    }

    .header-left strong {
      color: #1e293b;
    }

    /* ============================================
       العنوان
    ============================================ */
    .title-box {
      text-align: center;
      background: linear-gradient(135deg, ${primary}10, ${secondary}10);
      border: 1px solid ${primary}30;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 20px;
    }

    .title-box h2 {
      font-size: 18px;
      font-weight: 800;
      color: ${primary};
    }

    .title-box p {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }

    /* ============================================
       بيانات الطالب
    ============================================ */
    .student-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 20px;
    }

    .student-info-title {
      font-size: 12px;
      font-weight: 800;
      color: ${primary};
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }

    .info-item .label {
      color: #64748b;
      font-weight: 600;
    }

    .info-item .value {
      color: #1e293b;
      font-weight: 700;
    }

    /* ============================================
       الجدول
    ============================================ */
    .grades-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .grades-table thead {
      background: linear-gradient(135deg, ${primary}, ${secondary});
    }

    .grades-table th {
      color: white;
      font-size: 12px;
      font-weight: 800;
      padding: 12px 10px;
      text-align: center;
    }

    .grades-table td {
      padding: 10px;
      text-align: center;
      font-size: 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .grades-table .subject {
      font-weight: 700;
      color: #1e293b;
      text-align: right;
      padding-right: 15px;
    }

    .grades-table .score,
    .grades-table .max-score {
      font-weight: 700;
      color: #334155;
    }

    .grades-table .percentage {
      font-weight: 800;
    }

    .grades-table .row-even {
      background: #f8fafc;
    }

    /* ============================================
       الملخص
    ============================================ */
    .summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      background: linear-gradient(135deg, ${primary}08, ${secondary}08);
      border: 1px solid ${primary}30;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 30px;
    }

    .summary-item {
      text-align: center;
    }

    .summary-item .label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .summary-item .total {
      font-size: 22px;
      font-weight: 800;
      color: ${primary};
    }

    .summary-item .total-max {
      font-size: 14px;
      color: #94a3b8;
      font-weight: 600;
    }

    .summary-item .average {
      font-size: 28px;
      font-weight: 800;
      color: ${ratingColor};
    }

    .summary-item .rating {
      font-size: 13px;
      color: ${ratingColor};
      font-weight: 700;
      margin-top: 4px;
    }

    /* ============================================
       التوقيعات
    ============================================ */
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px dashed #cbd5e1;
    }

    .signature-box {
      flex: 1;
      text-align: center;
    }

    .signature-box .signature-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 30px;
      font-weight: 600;
    }

    .signature-box .signature-line {
      border-bottom: 1px solid #94a3b8;
      height: 1px;
    }

    /* ============================================
       التذييل
    ============================================ */
    .footer {
      position: absolute;
      bottom: 15mm;
      left: 15mm;
      right: 15mm;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }

    .footer strong {
      color: ${primary};
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- الترويسة -->
    <div class="header">
      <div class="header-right">
        ${logoHTML}
        <div class="school-info">
          <h1>${schoolName}</h1>
          ${schoolMotto ? `<p class="motto">${schoolMotto}</p>` : '<p class="motto">نظام إدارة مدرسية متكامل</p>'}
        </div>
      </div>
      <div class="header-left">
        <div>التاريخ: <strong>${today}</strong></div>
      </div>
    </div>

    <!-- العنوان -->
    <div class="title-box">
      <h2>📊 كشف درجات الطالب</h2>
      <p>الفصل الدراسي الحالي</p>
    </div>

    <!-- بيانات الطالب -->
    <div class="student-info">
      <div class="student-info-title">👤 بيانات الطالب</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">الاسم:</span>
          <span class="value">${student.full_name}</span>
        </div>
        <div class="info-item">
          <span class="label">الصف:</span>
          <span class="value">${student.grade}${student.section ? ' - شعبة ' + student.section : ''}</span>
        </div>
        ${student.guardian_name ? `
        <div class="info-item">
          <span class="label">ولي الأمر:</span>
          <span class="value">${student.guardian_name}</span>
        </div>
        ` : ''}
        ${student.student_number ? `
        <div class="info-item">
          <span class="label">رقم الطالب:</span>
          <span class="value">${student.student_number}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- جدول الدرجات -->
    <table class="grades-table">
      <thead>
        <tr>
          <th>المادة</th>
          <th>الدرجة</th>
          <th>العظمى</th>
          <th>النسبة</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- الملخص -->
    <div class="summary">
      <div class="summary-item">
        <div class="label">المجموع الكلي</div>
        <div>
          <span class="total">${totalScore}</span>
          <span class="total-max"> / ${totalMax}</span>
        </div>
      </div>
      <div class="summary-item">
        <div class="label">المعدل العام</div>
        <div class="average">${average.toFixed(2)}%</div>
        <div class="rating">${rating}</div>
      </div>
    </div>

    <!-- التوقيعات -->
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-label">توقيع ولي الأمر</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div class="signature-label">ختم المدرسة</div>
        <div class="signature-line"></div>
      </div>
    </div>

    <!-- التذييل -->
    <div class="footer">
      هذا الكشف صادر إلكترونيًا من <strong>${schoolName}</strong> — نظام مداد المحاسبي
    </div>

  </div>
</body>
</html>
  `.trim()
}