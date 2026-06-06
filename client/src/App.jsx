import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students = lazy(() => import('./pages/Students'))
const Companies = lazy(() => import('./pages/Companies'))
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'))
const Sessions = lazy(() => import('./pages/Sessions'))
const Attendance = lazy(() => import('./pages/Attendance'))
const Results = lazy(() => import('./pages/Results'))
const Reports = lazy(() => import('./pages/Reports'))

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (user?.role === 'student') return <Navigate to="/student-dashboard" replace />
  return children
}

function StudentRoute({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'student') return <Navigate to="/dashboard" replace />
  return children
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

function SuspenseWrapper({ children }) {
  return <Suspense fallback={<div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>}>{children}</Suspense>
}

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminRoute><Navigate to="/dashboard" replace /></AdminRoute>} />
          <Route path="dashboard" element={<AdminRoute><PageTransition><SuspenseWrapper><Dashboard /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="students" element={<AdminRoute><PageTransition><SuspenseWrapper><Students /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="companies" element={<AdminRoute><PageTransition><SuspenseWrapper><Companies /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="companies/:id" element={<AdminRoute><PageTransition><SuspenseWrapper><CompanyDetail /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="sessions" element={<AdminRoute><PageTransition><SuspenseWrapper><Sessions /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="attendance" element={<AdminRoute><PageTransition><SuspenseWrapper><Attendance /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="results" element={<AdminRoute><PageTransition><SuspenseWrapper><Results /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="reports" element={<AdminRoute><PageTransition><SuspenseWrapper><Reports /></SuspenseWrapper></PageTransition></AdminRoute>} />
          <Route path="student-dashboard" element={<StudentRoute><PageTransition><StudentDashboard /></PageTransition></StudentRoute>} />
        </Route>
        <Route path="*" element={<AdminRoute><Navigate to="/dashboard" replace /></AdminRoute>} />
      </Routes>
    </AnimatePresence>
  )
}
