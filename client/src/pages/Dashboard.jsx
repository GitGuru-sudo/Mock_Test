import { useDashboardStats } from '../hooks/useDashboardStats'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { Skeleton } from '../components/ui/skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import AnimatedNumber from '../components/animated/AnimatedNumber'
import FadeContent from '../components/animated/FadeContent'
import ScrollProgress from '../components/animated/ScrollProgress'
import { formatDate, formatDateTime } from '../utils/formatDate'

const PIE_COLORS = { placed: '#22c55e', in_process: '#f59e0b', not_placed: '#9ca3af', rejected: '#ef4444' }

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'Total Students', value: stats?.totalStudents ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Placed', value: stats?.placedStudents ?? 0, color: 'bg-green-50 text-green-700' },
    { label: 'In Process', value: stats?.inProcessStudents ?? 0, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Rejected', value: stats?.rejectedStudents ?? 0, color: 'bg-red-50 text-red-700' },
  ]

  const barData = stats?.placementByBranch?.map((b) => ({ branch: b._id, Total: b.total, Placed: b.placed })) || []
  const pieData = [
    { name: 'Placed', value: stats?.placedStudents ?? 0 },
    { name: 'In Process', value: stats?.inProcessStudents ?? 0 },
    { name: 'Not Placed', value: stats?.notPlacedStudents ?? 0 },
    { name: 'Rejected', value: stats?.rejectedStudents ?? 0 },
  ].filter((d) => d.value > 0)

  const todaySessions = stats?.todaySessions || []

  return (
    <div className="space-y-6">
      <ScrollProgress />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <FadeContent key={card.label} delay={i * 0.1}>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`text-3xl font-bold mt-2 ${card.color.split(' ')[1]}`}>
                <AnimatedNumber value={card.value} />
              </p>
            </div>
          </FadeContent>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeContent>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Placement by Branch</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branch" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Placed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No placement data" />}
          </div>
        </FadeContent>

        <FadeContent>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Placement Status</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase().replace(' ', '_')] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No status data" />}
          </div>
        </FadeContent>
      </div>

      {/* Today's Sessions */}
      <FadeContent>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Today's Sessions</h3>
          </div>
          {todaySessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Company</th>
                    <th className="text-left px-6 py-3 font-medium">Round</th>
                    <th className="text-left px-6 py-3 font-medium">Venue</th>
                    <th className="text-left px-6 py-3 font-medium">Time</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todaySessions.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{s.company?.name || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{s.roundName || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{s.venue || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{s.scheduledDate ? formatDateTime(s.scheduledDate) : '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState message="No sessions today" description="Sessions scheduled for today will appear here" />}
        </div>
      </FadeContent>
    </div>
  )
}
