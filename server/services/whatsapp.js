import pkg from 'whatsapp-web.js'
const { Client, LocalAuth, MessageMedia } = pkg
import qrcode from 'qrcode-terminal'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// مسار Chrome على Mac
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// مسار الجلسة
const SESSION_PATH = path.join(__dirname, '..', 'database', 'whatsapp-session')
const SESSION_DIR = path.join(SESSION_PATH, 'session')

let client = null
let ioInstance = null
let currentStatus = 'disconnected'   // disconnected | qr | connecting | ready | error
let currentQR = null
let currentInfo = null

// ============================================
// تنظيف ملفات القفل القديمة قبل التشغيل
// ============================================
function cleanLockFiles() {
  const lockFiles = [
    'SingletonLock',
    'SingletonCookie',
    'SingletonSocket',
    'lockfile',
  ]
  for (const f of lockFiles) {
    const p = path.join(SESSION_DIR, f)
    try {
      if (fs.existsSync(p)) {
        fs.rmSync(p, { force: true })
        console.log(`🧹 حذف ملف قفل: ${f}`)
      }
    } catch (e) {
      // تجاهل
    }
  }
}

// ============================================
// تهيئة عميل الواتساب
// ============================================
export function initWhatsApp(io) {
  ioInstance = io

  // احذف ملفات القفل
  cleanLockFiles()

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: SESSION_PATH,
    }),
    puppeteer: {
      headless: true,
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-features=site-per-process',
      ],
    },
    // سرعة أعلى
    qrMaxRetries: 10,
    authTimeoutMs: 60000,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
  })

  client.on('qr', (qr) => {
    currentStatus = 'qr'
    currentQR = qr
    console.log('📱 امسح رمز QR من هاتفك:')
    try {
      qrcode.generate(qr, { small: true })
    } catch (e) {
      // تجاهل أخطاء عرض QR في الطرفية
    }
    if (ioInstance) ioInstance.emit('whatsapp:qr', qr)
  })

  client.on('ready', () => {
    currentStatus = 'ready'
    currentQR = null
    currentInfo = client.info
    console.log('✅ WhatsApp جاهز!')
    console.log('   الرقم:', client.info?.wid?.user)
    console.log('   الاسم:', client.info?.pushname)
    if (ioInstance) ioInstance.emit('whatsapp:ready', {
      number: client.info?.wid?.user,
      name: client.info?.pushname,
    })
  })

  client.on('authenticated', () => {
    currentStatus = 'connecting'
    console.log('🔐 تم التوثيق')
    if (ioInstance) ioInstance.emit('whatsapp:authenticated')
  })

  client.on('auth_failure', (msg) => {
    currentStatus = 'error'
    currentQR = null
    console.error('❌ فشل التوثيق:', msg)
    if (ioInstance) ioInstance.emit('whatsapp:auth_failure', msg)
  })

  client.on('disconnected', async (reason) => {
    currentStatus = 'disconnected'
    currentInfo = null
    currentQR = null
    console.error('❌ انقطع الاتصال:', reason)
    if (ioInstance) ioInstance.emit('whatsapp:disconnected', reason)

    // حاول إعادة التهيئة بعد 5 ثواني
    setTimeout(() => {
      if (currentStatus === 'disconnected') {
        console.log('🔄 محاولة إعادة الاتصال...')
        initWhatsApp(ioInstance)
      }
    }, 5000)
  })

  client.on('loading_screen', (percent, message) => {
    console.log(`⏳ ${message || 'جاري التحميل'}: ${percent}%`)
  })

  // ابدأ التهيئة
  console.log('🔄 بدء تهيئة WhatsApp...')
  client.initialize().catch((err) => {
    console.error('❌ فشل التهيئة:', err.message)
    currentStatus = 'error'
    if (ioInstance) ioInstance.emit('whatsapp:error', err.message)
  })

  return client
}

// ============================================
// تنظيف رقم الهاتف
// ============================================
function cleanPhoneNumber(phone) {
  if (!phone) return ''
  let clean = String(phone).replace(/[^\d]/g, '')
  // إن بدأ بـ 00 → احذفه
  if (clean.startsWith('00')) clean = clean.substring(2)
  // إن بدأ بـ 0 (عراقي محلي) → استبدله بـ 964
  if (clean.startsWith('0')) clean = '964' + clean.substring(1)
  return clean
}

// ============================================
// إرسال رسالة نصية
// ============================================
export async function sendMessage(phone, message) {
  if (!client || currentStatus !== 'ready') {
    throw new Error('WhatsApp غير متصل')
  }

  const cleanPhone = cleanPhoneNumber(phone)
  if (!cleanPhone) throw new Error('رقم الهاتف غير صالح')

  const chatId = `${cleanPhone}@c.us`

  try {
    const result = await client.sendMessage(chatId, message)
    return { success: true, messageId: result?.id?._serialized }
  } catch (error) {
    throw new Error('فشل إرسال الرسالة: ' + (error.message || String(error)))
  }
}

// ============================================
// إرسال ملف PDF
// ============================================
export async function sendPDF(phone, pdfBuffer, filename, caption = '') {
  if (!client || currentStatus !== 'ready') {
    throw new Error('WhatsApp غير متصل')
  }

  const cleanPhone = cleanPhoneNumber(phone)
  if (!cleanPhone) throw new Error('رقم الهاتف غير صالح')

  const chatId = `${cleanPhone}@c.us`

  try {
    const base64Data = pdfBuffer.toString('base64')

    const rawFilename = filename || 'report.pdf'
    const safeFilename = rawFilename
      .replace(/[\\/:*?"<>|]/g, '_')
      .substring(0, 100) || 'report.pdf'

    console.log('📤 إرسال PDF:', {
      chatId,
      filename: safeFilename,
      size: pdfBuffer.length,
    })

    const media = new MessageMedia(
      'application/pdf',
      base64Data,
      safeFilename
    )

    const result = await client.sendMessage(chatId, media, {
      caption: caption || '',
      sendMediaAsDocument: true,
    })

    // ✅ إصلاح خطأ whatsapp-web.js
    if (media && media.__x_id) {
      delete media.__x_id
    }

    console.log('✅ PDF تم إرساله بنجاح')

    return {
      success: true,
      messageId: result?.id?._serialized || 'sent-' + Date.now(),
    }
  } catch (error) {
    console.error('❌ خطأ في إرسال PDF:', error.message)
    throw new Error('فشل إرسال الملف: ' + (error.message || String(error)))
  }
}

// ============================================
// إعادة الاتصال يدويًا
// ============================================
export async function reconnect() {
  if (client) {
    try {
      await client.destroy()
    } catch (e) {}
    client = null
  }
  currentStatus = 'disconnected'
  currentQR = null
  currentInfo = null

  if (ioInstance) {
    initWhatsApp(ioInstance)
  }
  return { success: true }
}

// ============================================
// قطع الاتصال
// ============================================
export async function logout() {
  if (!client) return { success: false }
  try {
    await client.logout()
    await client.destroy()
    client = null
    currentStatus = 'disconnected'
    currentInfo = null
    currentQR = null
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ============================================
// حالة الاتصال
// ============================================
export function getStatus() {
  return {
    status: currentStatus,
    qr: currentQR,
    info: currentInfo ? {
      number: currentInfo.wid?.user,
      name: currentInfo.pushname,
    } : null,
  }
}

export function isReady() {
  return currentStatus === 'ready'
}