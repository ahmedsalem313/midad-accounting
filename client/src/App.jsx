import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { connectSocket } from './lib/socket'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import MyStudents from './pages/MyStudents'
import Payments from './pages/Payments'
import Expenses from './pages/Expenses'
import Grades from './pages/Grades'
import Timetable from './pages/Timetable'
import Calendar from './pages/Calendar'
import Attendance from './pages/Attendance'
import StudentAttendance from './pages/StudentAttendance'
import AbsenceWarnings from './pages/AbsenceWarnings'
import Behavior from './pages/Behavior'
import Payroll from './pages/Payroll'
import SalaryConfig from './pages/SalaryConfig'
import Advances from './pages/Advances'
import WhatsApp from './pages/WhatsApp'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Permissions from './pages/Permissions'
import Settings from './pages/Settings'
import ParentLogin from './pages/ParentLogin'
import ParentDashboard from './pages/ParentDashboard'
import Assignments from './pages/Assignments'
import StudentNotes from './pages/StudentNotes'
import LateAssignments from './pages/LateAssignments'
import TopStudents from './pages/TopStudents'
import Communications from './pages/Communications'
import Rewards from './pages/Rewards'
import QRCodes from './pages/QRCodes'
import StudentAbsenceManagement from './pages/StudentAbsenceManagement'
import TimetableSettings from './pages/TimetableSettings'
import TimetableSubjects from './pages/TimetableSubjects'
import StudentProfile from './pages/StudentProfile'
import Promotions from './pages/Promotions'
import BrandingSettings from './pages/BrandingSettings'
import Partners from './pages/Partners'
import PartnerProfits from './pages/PartnerProfits'
// ============================================
// Protected Route للأدمن والمستخدمين
// ============================================
function ProtectedRoute({ children, permission }) {
  const { user, hasPermission, loading } = useAuth()

  useEffect(() => {
    const token = localStorage.getItem('midad_token')
    if (token) connectSocket(token)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (permission && !hasPermission(permission)) {
    return (
      <div className="glass-card p-10 text-center m-6">
        <h2 className="text-2xl font-bold mb-2">🚫 لا تملك الصلاحية</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          تواصل مع المدير لمنحك صلاحية الوصول لهذه الصفحة
        </p>
      </div>
    )
  }

  return children
}

// ============================================
// المكوّن الرئيسي
// ============================================
export default function App() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const path = location.pathname

  // ============================================
  // 1) مسارات ولي الأمر — قبل أي شيء آخر
  // ============================================
  if (path === '/parent-login') {
    return <ParentLogin />
  }

  if (path.startsWith('/parent')) {
    return <ParentDashboard />
  }

  // ============================================
  // 2) مؤشر التحميل للإدارة
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // ============================================
  // 3) مسارات الإدارة
  // ============================================
  return (
    <Routes>
      {/* مسارات عامة */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* مسارات محمية */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* الطلاب */}
        <Route path="my-students" element={<ProtectedRoute permission="students.view"><MyStudents /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute permission="students.view"><Students /></ProtectedRoute>} />
        <Route path="students/promotion" element={<ProtectedRoute permission="students.edit"><Promotions /></ProtectedRoute>} />
        <Route path="students/:studentId" element={<ProtectedRoute permission="students.view"><StudentProfile /></ProtectedRoute>} />
        <Route path="students/:studentId/notes" element={<ProtectedRoute permission="notes.view"><StudentNotes /></ProtectedRoute>} />
        <Route path="students/:studentId/communications" element={<ProtectedRoute permission="communications.view"><Communications /></ProtectedRoute>} />
        <Route path="students/:studentId/absences" element={<ProtectedRoute permission="attendance.view"><StudentAbsenceManagement /></ProtectedRoute>} />
        <Route path="top-students" element={<ProtectedRoute permission="students.view"><TopStudents /></ProtectedRoute>} />
        {/* المالية */}
        <Route path="payments" element={<ProtectedRoute permission="payments.view"><Payments /></ProtectedRoute>} />
        <Route path="expenses" element={<ProtectedRoute permission="expenses.view"><Expenses /></ProtectedRoute>} />
        <Route path="payroll" element={<ProtectedRoute permission="payroll.view"><Payroll /></ProtectedRoute>} />
        <Route path="salary-config" element={<ProtectedRoute permission="payroll.calculate"><SalaryConfig /></ProtectedRoute>} />
        <Route path="advances" element={<ProtectedRoute permission="advances.view"><Advances /></ProtectedRoute>} />

        {/* الأكاديمي */}
        <Route path="grades" element={<ProtectedRoute permission="grades.view"><Grades /></ProtectedRoute>} />
        <Route path="assignments" element={<ProtectedRoute permission="assignments.view"><Assignments /></ProtectedRoute>} />
        <Route path="late-assignments" element={<ProtectedRoute permission="assignments.view"><LateAssignments /></ProtectedRoute>} />
        <Route path="behavior" element={<ProtectedRoute permission="grades.view"><Behavior /></ProtectedRoute>} />
        <Route path="notes" element={<ProtectedRoute permission="notes.view"><StudentNotes /></ProtectedRoute>} />
        <Route path="communications" element={<ProtectedRoute permission="communications.view"><Communications /></ProtectedRoute>} />
        <Route path="qr-codes" element={<ProtectedRoute permission="settings.view"><QRCodes /></ProtectedRoute>} />

        {/* الجدول والحضور */}
        <Route path="timetable" element={<ProtectedRoute permission="timetable.view"><Timetable /></ProtectedRoute>} />
        <Route path="timetable-settings" element={<ProtectedRoute permission="timetable.edit"><TimetableSettings /></ProtectedRoute>} />
        <Route path="timetable-subjects" element={<ProtectedRoute permission="timetable.edit"><TimetableSubjects /></ProtectedRoute>} />
        <Route path="calendar" element={<ProtectedRoute permission="calendar.view"><Calendar /></ProtectedRoute>} />
        <Route path="attendance" element={<ProtectedRoute permission="attendance.view"><Attendance /></ProtectedRoute>} />
        <Route path="student-attendance" element={<ProtectedRoute permission="attendance.view"><StudentAttendance /></ProtectedRoute>} />
        <Route path="absence-warnings" element={<ProtectedRoute permission="attendance.view"><AbsenceWarnings /></ProtectedRoute>} />

        {/* التواصل */}
        <Route path="whatsapp" element={<ProtectedRoute permission="whatsapp.fees"><WhatsApp /></ProtectedRoute>} />

        {/* التقارير والإدارة */}
        <Route path="reports" element={<ProtectedRoute permission="reports.financial"><Reports /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="users.view"><Users /></ProtectedRoute>} />
        <Route path="permissions" element={<ProtectedRoute permission="users.permissions"><Permissions /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute permission="settings.view"><Settings /></ProtectedRoute>} />
        <Route path="branding" element={<ProtectedRoute permission="settings.view"><BrandingSettings /></ProtectedRoute>} />
        <Route path="partners" element={<ProtectedRoute permission="partners.view"><Partners /></ProtectedRoute>} />
        <Route path="partner-profits" element={<ProtectedRoute permission="partners.view"><PartnerProfits /></ProtectedRoute>} />
        <Route path="rewards" element={<ProtectedRoute permission="rewards.view"><Rewards /></ProtectedRoute>} />
      </Route>

      {/* صفحة 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}