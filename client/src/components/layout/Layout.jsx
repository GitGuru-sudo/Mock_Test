import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { Outlet, useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/students':   'Students',
  '/companies':  'Companies',
  '/sessions':   'Interview Sessions',
  '/attendance': 'Attendance',
  '/results':    'Results',
  '/reports':    'Reports',
}

export default function Layout() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Campus Tracker'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col">
        <Navbar title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
