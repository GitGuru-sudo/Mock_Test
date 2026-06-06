import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { formatDate } from '../utils/formatDate'
import api from '../api/axiosInstance'

export default function StudentDashboard() {
  const { user } = useAuth()

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['student-portal', 'me'],
    queryFn: () => api.get('/portal/me').then((r) => r.data.data),
  })

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['student-portal', 'timeline'],
    queryFn: () => api.get('/portal/me/timeline').then((r) => r.data.data),
  })

  const { data: attendanceData } = useQuery({
    queryKey: ['student-portal', 'attendance'],
    queryFn: () => api.get('/portal/me/attendance').then((r) => r.data.data),
  })

  if (profileLoading || timelineLoading) {
    return <div className="p-8 text-center text-gray-400">Loading your profile...</div>
  }

  const profile = profileData
  const timeline = timelineData || []
  const attendanceRecords = attendanceData || []
  const attendedCount = attendanceRecords.filter((r) => r.status === 'present').length

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Profile</h2>
        {profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Name</span><p className="font-medium text-gray-800">{profile.name}</p></div>
            <div><span className="text-gray-500">Email</span><p className="font-medium text-gray-800">{profile.email}</p></div>
            <div><span className="text-gray-500">Student ID</span><p className="font-mono text-gray-800">{profile.studentId}</p></div>
            <div><span className="text-gray-500">Branch</span><p className="font-medium text-gray-800">{profile.branch}</p></div>
            <div><span className="text-gray-500">Year</span><p className="font-medium text-gray-800">{profile.year}</p></div>
            <div><span className="text-gray-500">CGPA</span><p className="font-medium text-gray-800">{profile.cgpa}</p></div>
            <div><span className="text-gray-500">Status</span><div className="mt-0.5"><StatusBadge status={profile.placementStatus} /></div></div>
            <div><span className="text-gray-500">Sessions Attended</span><p className="font-medium text-gray-800">{attendedCount} / {attendanceRecords.length || 0}</p></div>
          </div>
        ) : <EmptyState message="Profile not found" />}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Interview Timeline</h3>
        </div>
        {timeline.length === 0 ? (
          <EmptyState message="No interview history yet" />
        ) : (
          <div className="divide-y divide-gray-100">
            {timeline.map((item, i) => (
              <div key={i} className="px-6 py-4">
                <h4 className="font-semibold text-gray-800">{item.company?.name || 'Company'}</h4>
                <p className="text-xs text-gray-400 mb-2">{item.company?.industry || ''}</p>
                <div className="space-y-1">
                  {item.rounds.map((r, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500 w-24">{r.session?.roundName || r.roundName || 'Round'}</span>
                      {r.result?.outcome === 'offer' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Selected by {item.company?.name}
                        </span>
                      ) : r.result?.outcome ? (
                        <StatusBadge status={r.result.outcome} />
                      ) : (
                        <StatusBadge status={r.attendance?.status || 'upcoming'} />
                      )}
                      {(r.result?.remarks || r.remarks) && <span className="text-gray-400 text-xs">{r.result?.remarks || r.remarks}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
