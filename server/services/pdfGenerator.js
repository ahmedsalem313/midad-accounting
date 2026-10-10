// server/services/pdfGenerator.js
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getDB } from '../database/db.js'
import { renderGradeReportHTML } from './pdfTemplates/gradeReport.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// مجلد مؤقت للصور
const PUBLIC_DIR = path.join(__dirname, '..', 'uploads')

/**
 * تحويل صورة logo.png إلى data URL (لأن Puppeteer يحتاج مسارًا محليًا)
 */
function getLogoDataUrl() {
  try {
    const logoPath = path.join(__dirname, '..', '..', 'client', 'public', 'logo.png')
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath)
      const base64 = buffer.toString('base64')
      return `data:image/png;base64,${base64}`
    }
  } catch (e) {
    console.error('Logo load error:', e.message)
  }
  return null
}

/**
 * توليد PDF من HTML باستخدام Puppeteer
 */
async function htmlToPDF(html) {
  let browser = null
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.emulateMediaType('print')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    if (browser) await browser.close()
  }
}

// ============================================
// توليد كشف درجات PDF
// ============================================
export async function generateGradeReport(student, grades, options = {}) {
  try {
    const db = getDB()

    // جلب إعدادات الهوية البصرية
    const getSetting = (key, fallback) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
      return row?.value || fallback
    }

    const schoolName = options.schoolName || getSetting('school_name', 'مداد المحاسبي')
    const schoolMotto = getSetting('school_motto', '')
    const brandColor = getSetting('brand_primary_color', '#6366F1')
    const brandColor2 = getSetting('brand_secondary_color', '#8B5CF6')
    const logoUrl = getLogoDataUrl()

    // بناء HTML
    const html = renderGradeReportHTML({
      student,
      grades,
      schoolName,
      logoUrl,
      schoolMotto,
      brandColor,
      brandColor2,
    })

    // تحويل إلى PDF
    const pdfBuffer = await htmlToPDF(html)

    return pdfBuffer
  } catch (error) {
    console.error('❌ generateGradeReport error:', error)
    throw error
  }
}