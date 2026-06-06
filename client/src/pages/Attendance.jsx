import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useSessions } from '../hooks/useSessions'
import { useBulkMarkAttendance, useAttendanceBySession } from '../hooks/useAttendance'
import { sessionsAPI } from '../api/sessions'
import { useQuery } from '@tanstack/react-query'
import { formatDateTime } from '../utils/formatDate'
import EmptyState from '../components/ui/EmptyState'

export default function Attendance() {
  const { data: sessionsData } = useSessions()
  const bulkMutation = useBulkMarkAttendance()

  const sessions = sessionsData?.sessions || sessionsData?.data || []

  const [selectedSessionId, setSelectedSessionId] = useState('')

  const { data: eligibleData, isLoading: eligibleLoading } = useQuery({
    queryKey: ['eligible-students', selectedSessionId],
    queryFn: () => sessionsAPI.getEligibleStudents(selectedSessionId).then((r) => r.data.data),
    enabled: !!selectedSessionId,
  })

  const eligibleRows = eligibleData?.students || []
  const eligibleStudents = eligibleRows.filter((r) => r.eligible)
  const ineligibleStudents = eligibleRows.filter((r) => !r.eligible)

  const [attendanceMap, setAttendanceMap] = useState({})

  const { data: existingAttendance } = useAttendanceBySession(selectedSessionId)

  useEffect(() => {
    if (eligibleRows.length > 0) {
      const map = {}
      eligibleRows.forEach((r) => {
        if (r.attendance) map[r.student._id] = r.attendance.status
      })
      setAttendanceMap(map)
    } else {
      setAttendanceMap({})
    }
  }, [eligibleRows])

  const markAll = (status) => {
    const map = { ...attendanceMap }
    eligibleStudents.forEach((s) => { map[s.student._id] = status })
    setAttendanceMap(map)
  }

  const handleSubmit = async () => {
    if (!selectedSessionId) { toast.error('Select a session'); return }
    const records = Object.entries(attendanceMap)
      .filter(([, status]) => status)
      .map(([studentId, status]) => ({ studentId, status }))
    if (records.length === 0) { toast.error('No attendance records'); return }
    try {
      await bulkMutation.mutateAsync({ sessionId: selectedSessionId, records })
      toast.success(`Attendance saved for ${records.length} students`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Session</label>
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Choose a session...</option>
          {sessions.map((s) => (
            <option key={s._id} value={s._id}>
              {s.company?.name || '—'} – {s.roundName || '—'} ({s.scheduledDate ? formatDateTime(s.scheduledDate) : '—'})
            </option>
          ))}
        </select>
      </div>

      {selectedSessionId && (
        <>
          {eligibleLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : eligibleRows.length === 0 ? (
            <EmptyState message="No students found" />
          ) : (
            <>
              <div className="flex gap-2">
                <button onClick={() => markAll('present')} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  Mark All Present
                </button>
                <button onClick={() => markAll('absent')} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                  Mark All Absent
                </button>
                <span className="text-sm text-gray-500 self-center ml-2">{eligibleStudents.length} eligible of {eligibleRows.length}</span>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left px-6 py-3 font-medium">Student ID</th>
                        <th className="text-left px-6 py-3 font-medium">Name</th>
                        <th className="text-left px-6 py-3 font-medium">Branch</th>
                        <th className="text-center px-6 py-3 font-medium">Present</th>
                        <th className="text-center px-6 py-3 font-medium">Absent</th>
                        <th className="text-left px-6 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {eligibleRows.map((row) => (
                        <tr key={row.student._id} className={`hover:bg-gray-50 ${!row.eligible ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">{row.student.studentId}</td>
                          <td className="px-6 py-4 font-medium text-gray-800">{row.student.name}</td>
                          <td className="px-6 py-4 text-gray-600">{row.student.branch}</td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="radio"
                              name={`attendance-${row.student._id}`}
                              checked={attendanceMap[row.student._id] === 'present'}
                              onChange={() => setAttendanceMap((prev) => ({ ...prev, [row.student._id]: 'present' }))}
                              className="w-4 h-4 text-green-600"
                              disabled={!row.eligible}
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="radio"
                              name={`attendance-${row.student._id}`}
                              checked={attendanceMap[row.student._id] === 'absent'}
                              onChange={() => setAttendanceMap((prev) => ({ ...prev, [row.student._id]: 'absent' }))}
                              className="w-4 h-4 text-red-600"
                              disabled={!row.eligible}
                            />
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {!row.eligible ? (
                              <span className="text-gray-400">{row.reason}</span>
                            ) : row.attendance ? (
                              <span className="text-gray-500">Marked</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Save Attendance
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
