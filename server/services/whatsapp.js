import pkg from 'whatsapp-web.js'
const { Client, LocalAuth, MessageMedia } = pkg
import qrcode from 'qrcode-terminal'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// مسار Chrome على Mac
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

let client = null
let ioInstance = null
let currentStatus = 'disconnected'   // disconnected | qr | connecting | ready
let currentQR = null
let currentInfo = null

// ============================================
// تهيئة عميل الواتساب
// ============================================
export function initWhatsApp(io) {
  ioInstance = io

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '..', 'database', 'whatsapp-session'),
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
      ],
    },
  })

  client.on('qr', (qr) => {
    currentStatus = 'qr'
    currentQR = qr
    console.log('📱 امسح رمز QR من هاتفك:')
    qrcode.generate(qr, { small: true })
    if (ioInstance) ioInstance.emit('whatsapp:qr', qr)
  })

  client.on('ready', () => {
    currentStatus = 'ready'
    currentQR = null
    currentInfo = client.info
    console.log('✅ WhatsApp جاهز!')
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
    currentStatus = 'disconnected'
    console.error('❌ فشل التوثيق:', msg)
    if (ioInstance) ioInstance.emit('whatsapp:auth_failure', msg)
  })

  client.on('disconnected', (reason) => {
    currentStatus = 'disconnected'
    currentInfo = null
    console.error('❌ انقطع الاتصال:', reason)
    if (ioInstance) ioInstance.emit('whatsapp:disconnected', reason)
  })

  client.initialize().catch((err) => {
    console.error('❌ فشل التهيئة:', err.message)
    currentStatus = 'error'
  })

  return client
}

// ============================================
// جلب الحالة
// ============================================
export function getStatus() {
  return {
    status: currentStatus,
    qr: currentQR,
    info: currentInfo ? {
      number: currentInfo?.wid?.user,
      name: currentInfo?.pushname,
    } : null,
  }
}

// ============================================
// تنظيف رقم الهاتف
// ============================================
function cleanPhoneNumber(phone) {
  let cleanPhone = phone.replace(/[^\d]/g, '')
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '964' + cleanPhone.substring(1)
  } else if (!cleanPhone.startsWith('964')) {
    cleanPhone = '964' + cleanPhone
  }
  return cleanPhone
}

// ============================================
// إرسال رسالة نصية
// ============================================
export async function sendMessage(phone, message) {
  if (!client || currentStatus !== 'ready') {
    throw new Error('WhatsApp غير متصل')
  }

  const cleanPhone = cleanPhoneNumber(phone)
  const chatId = `${cleanPhone}@c.us`

  try {
    const result = await client.sendMessage(chatId, message)
    return {
      success: true,
      messageId: result?.id?._serialized || result?.id?.id || 'sent-' + Date.now(),
    }
  } catch (error) {
  console.error('❌ ❌ ❌ خطأ في إرسال PDF ❌ ❌ ❌')
  console.error('Message:', error.message)
  console.error('Name:', error.name)
  console.error('Full error:', error)
  console.error('Stack:', error.stack)
  console.error('Stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
  console.error('❌ ❌ ❌ نهاية الخطأ ❌ ❌ ❌')
  throw new Error('فشل إرسال الملف: ' + (error.message || String(error)))
}
}

// ============================================
// إرسال ملف PDF عبر واتساب
// ============================================
export async function sendPDF(phone, pdfBuffer, filename, caption = '') {
  if (!client || currentStatus !== 'ready') {
    throw new Error('WhatsApp غير متصل')
  }

  const cleanPhone = cleanPhoneNumber(phone)
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
      base64Length: base64Data.length,
    })

    // إنشاء MessageMedia — بدون باراميتر رابع
    const media = new MessageMedia(
      'application/pdf',
      base64Data,
      safeFilename
    )

    console.log('📎 MessageMedia created:', {
      mimetype: media.mimetype,
      filename: media.filename,
      dataLength: media.data ? media.data.length : 0,
    })

    // إرسال بدون sendMediaAsDocument (افتراضي = document)
    const result = await client.sendMessage(chatId, media, {
      caption: caption || '',
    })

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
export function isReady() {
  return currentStatus === 'ready'
}