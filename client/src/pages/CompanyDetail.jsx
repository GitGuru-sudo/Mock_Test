import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { companiesAPI } from '../api/companies'
import { useSessions } from '../hooks/useSessions'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { formatDateTime } from '../utils/formatDate'

export default function CompanyDetail() {
  const { id } = useParams()

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companiesAPI.getById(id).then((r) => r.data.data?.company || r.data.company || r.data.data || r.data),
  })

  const { data: sessionsData } = useSessions({ company: id })
  const sessions = sessionsData?.sessions || sessionsData?.data || []

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading...</div>
  if (!company) return <EmptyState message="Company not found" />

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{company.name}</h2>
            <p className="text-gray-500 mt-1">{company.industry || '—'}</p>
          </div>
          <StatusBadge status={company.recruitmentStatus} />
        </div>
        <p className="text-gray-600 mb-4">{company.description || 'No description provided.'}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">CTC</span><p className="font-semibold text-gray-800">{company.ctc ? `${company.ctc} LPA` : '—'}</p></div>
          <div><span className="text-gray-500">Location</span><p className="font-semibold text-gray-800">{company.location || '—'}</p></div>
          <div><span className="text-gray-500">Website</span><p className="font-semibold text-gray-800">{company.website ? <a href={company.website} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Visit</a> : '—'}</p></div>
          <div><span className="text-gray-500">Total Rounds</span><p className="font-semibold text-gray-800">{company.rounds?.length || 0}</p></div>
        </div>
      </div>

      {/* Rounds */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Interview Rounds</h3>
        </div>
        {company.rounds?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Round #</th>
                  <th className="text-left px-6 py-3 font-medium">Name</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {company.rounds.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.roundNumber}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{r.roundName}</td>
                    <td className="px-6 py-4 text-gray-600 capitalize">{r.roundType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No rounds defined" />}
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Sessions</h3>
        </div>
        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Round</th>
                  <th className="text-left px-6 py-3 font-medium">Date/Time</th>
                  <th className="text-left px-6 py-3 font-medium">Venue</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{s.roundName}</td>
                    <td className="px-6 py-4 text-gray-600">{s.scheduledDate ? formatDateTime(s.scheduledDate) : '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{s.venue || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No sessions for this company" />}
      </div>
    </div>
  )
}
