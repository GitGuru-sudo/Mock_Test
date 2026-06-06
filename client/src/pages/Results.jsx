import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useSessions } from '../hooks/useSessions'
import { resultsAPI } from '../api/results'
import { sessionsAPI } from '../api/sessions'
import { useQuery } from '@tanstack/react-query'
import { formatDateTime } from '../utils/formatDate'
import EmptyState from '../components/ui/EmptyState'

export default function Results() {
  const { data: sessionsData } = useSessions()
  const qc = useQueryClient()

  const sessions = sessionsData?.sessions || sessionsData?.data || []

  const [selectedSessionId, setSelectedSessionId] = useState('')

  const { data: eligibleData } = useQuery({
    queryKey: ['eligible-students', selectedSessionId],
    queryFn: () => sessionsAPI.getEligibleStudents(selectedSessionId).then((r) => r.data.data),
    enabled: !!selectedSessionId,
  })

  const eligibleRows = eligibleData?.students || []
  const presentRows = eligibleRows.filter((r) => r.attendance?.status === 'present')

  const [studentResults, setStudentResults] = useState({})
  const initialResults = useRef({})

  useEffect(() => {
    if (presentRows.length === 0) return
    const map = {}
    const initial = {}
    presentRows.forEach((r) => {
      const er = r.existingResult
      map[r.student._id] = { _resultId: er?._id || null, outcome: er?.outcome || 'pending', remarks: er?.remarks || '' }
      initial[r.student._id] = { _resultId: er?._id || null, outcome: er?.outcome || 'pending', remarks: er?.remarks || '' }
    })
    setStudentResults(map)
    initialResults.current = initial
  }, [presentRows])

  const updateResult = (studentId, field, value) => {
    setStudentResults((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { _resultId: null, outcome: 'pending', remarks: '' }), [field]: value },
    }))
  }

  const handleSubmit = async () => {
    if (!selectedSessionId) { toast.error('Select a session'); return }
    const initial = initialResults.current
    const entries = Object.entries(studentResults)

    let saved = 0, updated = 0, skipped = 0, failedArr = []

    for (const [studentId, data] of entries) {
      const prev = initial[studentId]
      const isSame = prev && prev.outcome === data.outcome && prev.remarks === data.remarks

      if (isSame && data._resultId) {
        skipped++
        continue
      }

      try {
        if (data._resultId) {
          await resultsAPI.update(data._resultId, { outcome: data.outcome, remarks: data.remarks })
          updated++
        } else {
          await resultsAPI.record({ sessionId: selectedSessionId, studentId, outcome: data.outcome, remarks: data.remarks })
          saved++
        }
      } catch (err) {
        const studentName = eligibleRows.find((r) => r.student._id === studentId)?.student?.name || studentId
        const msg = err.response?.data?.message || 'Unknown error'
        failedArr.push(`${studentName}: ${msg}`)
      }
    }

    qc.invalidateQueries({ queryKey: ['eligible-students', selectedSessionId] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })

    const parts = []
    if (saved > 0) parts.push(`${saved} saved`)
    if (updated > 0) parts.push(`${updated} updated`)
    if (skipped > 0) parts.push(`${skipped} skipped`)
    if (failedArr.length > 0) parts.push(`${failedArr.length} failed`)
    const summary = parts.join(', ') || 'Nothing to save'

    if (failedArr.length > 0) {
      toast.error(`${summary}\n${failedArr.join('\n')}`, { duration: 5000 })
    } else if (saved > 0 || updated > 0) {
      toast.success(`${summary}`)
    } else {
      toast('Nothing changed', { icon: 'ℹ️' })
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
          {presentRows.length === 0 ? (
            <EmptyState message="No present students found" description="Mark attendance first before recording results" />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium">Name</th>
                      <th className="text-left px-6 py-3 font-medium">Branch</th>
                      <th className="text-left px-6 py-3 font-medium">Outcome</th>
                      <th className="text-left px-6 py-3 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {presentRows.map((row) => (
                      <tr key={row.student._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{row.student.name}</td>
                        <td className="px-6 py-4 text-gray-600">{row.student.branch}</td>
                        <td className="px-6 py-4">
                          <select
                            value={studentResults[row.student._id]?.outcome || 'pending'}
                            onChange={(e) => updateResult(row.student._id, 'outcome', e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 rounded text-sm outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="pass">Pass</option>
                            <option value="fail">Fail</option>
                            <option value="offer">Offer</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            value={studentResults[row.student._id]?.remarks || ''}
                            onChange={(e) => updateResult(row.student._id, 'remarks', e.target.value)}
                            placeholder="Remarks"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {presentRows.length > 0 && (
            <button onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              Save Results
            </button>
          )}
        </>
      )}
    </div>
  )
}
