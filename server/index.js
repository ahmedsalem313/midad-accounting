import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import os from 'os'
import { config } from './config.js'
import { initDatabase } from './database/db.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initWhatsApp } from './services/whatsapp.js'

// Routes
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import studentsRoutes from './routes/students.js'
import paymentsRoutes from './routes/payments.js'
import expensesRoutes from './routes/expenses.js'
import gradesRoutes from './routes/grades.js'
import timetableRoutes from './routes/timetable.js'
import attendanceRoutes from './routes/attendance.js'
import payrollRoutes from './routes/payroll.js'
import advancesRoutes from './routes/advances.js'
import studentAttendanceRoutes from './routes/studentAttendance.js'
import salaryConfigRoutes from './routes/salaryConfig.js'
import whatsappRoutes from './routes/whatsapp.js'
import reportsRoutes from './routes/reports.js'
import settingsRoutes from './routes/settings.js'
import parentRoutes from './routes/parent.js'
import behaviorRoutes from './routes/behavior.js'
import assignmentsRoutes from './routes/assignments.js'
import notesRoutes from './routes/notes.js'
import communicationsRoutes from './routes/communications.js'
import rewardsRoutes from './routes/rewards.js'
import calendarRoutes from './routes/calendar.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============ الإعداد الأساسي ============
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: config.cors.origin, credentials: true },
})

// ============ Middlewares ============
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors(config.cors))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// الملفات المرفوعة
app.use('/uploads', express.static(config.uploads.path))

// ============ التأكد من المجلدات ============
const dataDir = path.dirname(config.database.path)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(config.uploads.path)) fs.mkdirSync(config.uploads.path, { recursive: true })

// ============ قاعدة البيانات ============
initDatabase()

// ============ API Routes ============
// ============================================
// GET /api/network-info
// جلب IP الجهاز في الشبكة المحلية
// ============================================
app.get('/api/network-info', (req, res) => {
  const interfaces = os.networkInterfaces()
  const addresses = []

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // تجاهل IPv6 و loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address,
        })
      }
    }
  }

  res.json({
    success: true,
    data: {
      addresses,
      // أول عنوان (عادةً en0 على Mac)
      primary: addresses[0]?.address || 'localhost',
    },
  })
})
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'مداد المحاسبي', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/grades', gradesRoutes)
app.use('/api/timetable', timetableRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/payroll', payrollRoutes)
app.use('/api/salary-config', salaryConfigRoutes)
app.use('/api/advances', advancesRoutes)
app.use('/api/student-attendance', studentAttendanceRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/parent', parentRoutes)
app.use('/api/behavior', behaviorRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/communications', communicationsRoutes)
app.use('/api/rewards', rewardsRoutes)
app.use('/api/calendar', calendarRoutes)
// users routes covers advisor
// ============ Socket.IO ============
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id)
  socket.on('disconnect', () => console.log('❌ Client disconnected:', socket.id))
})

// ============ WhatsApp ============
initWhatsApp(io)

app.set('io', io)

// ============ معالجة الأخطاء ============
app.use(errorHandler)

// ============ تشغيل السيرفر ============
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log('')
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   🖋️  مداد المحاسبي - Server                     ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║   🌐 Local:    http://localhost:${config.port}              ║`)
  console.log(`║   🌍 Network:  http://<YOUR-IP>:${config.port}             ║`)
  console.log(`║   📦 Env:      ${config.nodeEnv}                       ║`)
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('')
})