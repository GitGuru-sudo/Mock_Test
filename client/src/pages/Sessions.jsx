import { useState } from 'react'
import toast from 'react-hot-toast'
import { useSessions, useCreateSession, useUpdateSessionStatus } from '../hooks/useSessions'
import { useCompanies } from '../hooks/useCompanies'
import { formatDate, formatDateTime } from '../utils/formatDate'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { companiesAPI } from '../api/companies'

export default function Sessions() {
  const { data: sessionsData, isLoading } = useSessions()
  const { data: companiesData } = useCompanies()
  const createMutation = useCreateSession()
  const updateStatusMutation = useUpdateSessionStatus()

  const sessions = sessionsData?.sessions || sessionsData?.data || []
  const companies = companiesData?.companies || companiesData?.data || companiesData || []
  const companiesList = Array.isArray(companies) ? companies : []

  const [open, setOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [companyRounds, setCompanyRounds] = useState([])
  const [form, setForm] = useState({ company: '', roundNumber: '', roundName: '', roundType: '', scheduledDate: '', venue: '' })

  const loadCompanyRounds = async (companyId) => {
    if (!companyId) { setCompanyRounds([]); return }
    try {
      const res = await companiesAPI.getById(companyId)
      const c = res.data.data || res.data
      setCompanyRounds(c.rounds || [])
    } catch { setCompanyRounds([]) }
  }

  const handleCompanyChange = (e) => {
    const val = e.target.value
    setSelectedCompany(val)
    setForm({ ...form, company: val, roundNumber: '', roundName: '', roundType: '' })
    loadCompanyRounds(val)
  }

  const selectRound = (r) => {
    setForm({ ...form, roundNumber: r.roundNumber, roundName: r.roundName, roundType: r.roundType })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync(form)
      toast.success('Session created')
      setOpen(false)
      setForm({ company: '', roundNumber: '', roundName: '', roundType: '', scheduledDate: '', venue: '' })
      setSelectedCompany('')
      setCompanyRounds([])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session')
    }
  }

  const handleStatusUpdate = async () => {
    if (!statusOpen) return
    try {
      await updateStatusMutation.mutateAsync({ id: statusOpen._id, status: statusOpen.newStatus })
      toast.success('Status updated')
      setStatusOpen(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const grouped = {}
  sessions.forEach((s) => {
    const dateKey = s.scheduledDate ? formatDate(s.scheduledDate) : 'No Date'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(s)
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          + Create Session
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState message="No sessions found" description="Create your first session to get started" />
      ) : (
        Object.entries(grouped).map(([date, dateSessions]) => (
          <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 rounded-t-xl">
              <h3 className="text-sm font-semibold text-gray-700">{date}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {dateSessions.map((s) => (
                <div key={s._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{s.company?.name || '—'} — {s.roundName || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{s.roundType} &middot; {s.venue || 'No venue'} &middot; {s.scheduledDate ? formatDateTime(s.scheduledDate) : '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <button onClick={() => setStatusOpen({ _id: s._id, newStatus: s.status })} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create Session</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <select value={selectedCompany} onChange={handleCompanyChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" required>
                <option value="">Select Company</option>
                {companiesList.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              {companyRounds.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-2">Select Round:</p>
                  <div className="space-y-1">
                    {companyRounds.map((r) => (
                      <button key={r.roundNumber} type="button" onClick={() => selectRound(r)} className={`w-full text-left px-3 py-2 text-sm rounded border ${form.roundNumber === r.roundNumber ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                        {r.roundNumber}. {r.roundName} ({r.roundType})
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input value={form.scheduledDate} onChange={(e) => setForm({...form, scheduledDate: e.target.value})} type="datetime-local" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input value={form.venue} onChange={(e) => setForm({...form, venue: e.target.value})} placeholder="Venue" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setStatusOpen(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Update Status</h3>
            <select value={statusOpen.newStatus} onChange={(e) => setStatusOpen({...statusOpen, newStatus: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none mb-4">
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStatusOpen(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleStatusUpdate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
