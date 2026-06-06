import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Building2, CalendarDays,
  ClipboardCheck, FileText, BarChart3, LogOut, User,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Magnet from '../animated/Magnet'

const ADMIN_NAV = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/students',   label: 'Students',   icon: Users },
  { to: '/companies',  label: 'Companies',  icon: Building2 },
  { to: '/sessions',   label: 'Sessions',   icon: CalendarDays },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/results',    label: 'Results',    icon: FileText },
  { to: '/reports',    label: 'Reports',    icon: BarChart3 },
]

const STUDENT_NAV = [
  { to: '/student-dashboard', label: 'My Profile', icon: User },
  { to: '/student-results',   label: 'My Results', icon: FileText },
]

export default function Sidebar() {
  const { logout, user } = useAuth()
  const isStudent = user?.role === 'student'
  const navItems = isStudent ? STUDENT_NAV : ADMIN_NAV
  const roleColor = user?.role === 'admin' ? 'bg-purple-600' : user?.role === 'student' ? 'bg-green-600' : 'bg-blue-600'

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="w-64 h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0 z-30"
    >
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white leading-tight">Campus Tracker</h1>
        <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${roleColor} text-white`}>
          {user?.role || '—'}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Magnet key={to} strength={20}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          </Magnet>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-700 pt-3">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </motion.aside>
  )
}
