import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { setIo } from './utils/notify.js';
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import os from 'os'
import { config } from './config.js'
import { initDatabase } from './database/db.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initWhatsApp } from './services/whatsapp.js'
import notificationsRouter from './routes/notifications.js';
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import studentsRoutes from './routes/students.js'
import paymentsRoutes from './routes/payments.js'
import expensesRoutes from './routes/expenses.js'
import gradesRoutes from './routes/grades.js'
import timetableRoutes from './routes/timetable.js'
import timetableSettingsRoutes from './routes/timetableSettings.js'
import timetableSubjectsRoutes from './routes/timetableSubjects.js'
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
import studentHistoryRoutes from './routes/studentHistory.js'
const __filename = fileURLToPath(import.meta.url)
import promotionsRoutes from './routes/promotions.js'
const __dirname = path.dirname(__filename)
import seedRoutes from './routes/seed.js'
import brandingRoutes from './routes/branding.js'
import partnersRoutes from './routes/partners.js'
import feeRemindersRoutes from './routes/feeReminders.js'
import absenceRemindersRoutes from './routes/absenceReminders.js'
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
app.use('/api/promotions', promotionsRoutes)
app.use('/api/seed', seedRoutes)
app.use('/api/branding', brandingRoutes)
app.use('/api/partners', partnersRoutes)
app.use('/api/fee-reminders', feeRemindersRoutes)
app.use('/api/absence-reminders', absenceRemindersRoutes)
// الملفات المرفوعة
app.use('/uploads', express.static(config.uploads.path))

// ============ التأكد من المجلدات ============
const dataDir = path.dirname(config.database.path)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(config.uploads.path)) fs.mkdirSync(config.uploads.path, { recursive: true })

// ============ قاعدة البيانات ============
initDatabase()

// ============ API Routes ============
app.get('/api/network-info', (req, res) => {
  const interfaces = os.networkInterfaces()
  const addresses = []

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
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
app.use('/api/student-history', studentHistoryRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/grades', gradesRoutes)
app.use('/api/timetable', timetableRoutes)
app.use('/api/timetable-settings', timetableSettingsRoutes)
app.use('/api/timetable-subjects', timetableSubjectsRoutes)
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
app.use('/api/notifications', notificationsRouter);
app.use('/api/communications', communicationsRoutes)
app.use('/api/rewards', rewardsRoutes)
app.use('/api/calendar', calendarRoutes)
// ============ Socket.IO ============
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    socket.user = payload;
    next();
  } catch {
    socket.user = null;
    next();
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id)
  if (socket.user) {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role) socket.join(`role:${socket.user.role}`);
  }
  socket.on('disconnect', () => console.log('❌ Client disconnected:', socket.id))
})

setIo(io);

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