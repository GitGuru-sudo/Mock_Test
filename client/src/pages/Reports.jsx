import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reportsAPI } from '../api/reports'
import { useCompanies } from '../hooks/useCompanies'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { formatDate } from '../utils/formatDate'
import { exportCSV } from '../utils/exportCSV'

export default function Reports() {
  const { data: companiesData } = useCompanies()
  const companies = companiesData?.companies || companiesData?.data || companiesData || []
  const companiesList = Array.isArray(companies) ? companies : []

  const [filters, setFilters] = useState({ companyId: '', branch: '', placementStatus: '', fromDate: '', toDate: '' })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => reportsAPI.get(filters).then((r) => r.data.data || r.data),
    enabled: false,
  })

  const reports = Array.isArray(data) ? data : []

  const handleApply = () => refetch()

  const handleExport = () => {
    if (reports.length === 0) { toast.error('No data to export'); return }
    const rows = reports.map((r) => ({
      'Student Name': r.studentName || '—',
      'Student ID': r.studentId || '—',
      Branch: r.branch || '—',
      Company: r.companyName || '—',
      Round: r.roundName || `Round ${r.roundNumber || ''}`,
      Outcome: r.outcome || '—',
      Date: r.recordedAt ? formatDate(r.recordedAt) : '—',
    }))
    const headers = ['Student Name', 'Student ID', 'Branch', 'Company', 'Round', 'Outcome', 'Date']
    exportCSV('placement_report.csv', headers, rows)
    toast.success('Report exported')
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select value={filters.companyId} onChange={(e) => setFilters({...filters, companyId: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="">All Companies</option>
            {companiesList.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={filters.branch} onChange={(e) => setFilters({...filters, branch: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="">All Branches</option>
            {['CSE','ECE','ME','CE','EE','IT'].map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filters.placementStatus} onChange={(e) => setFilters({...filters, placementStatus: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="">All Status</option>
            <option value="placed">Placed</option>
            <option value="rejected">Rejected</option>
            <option value="in_process">In Process</option>
            <option value="not_placed">Not Placed</option>
          </select>
          <input value={filters.fromDate} onChange={(e) => setFilters({...filters, fromDate: e.target.value})} type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" placeholder="From" />
          <input value={filters.toDate} onChange={(e) => setFilters({...filters, toDate: e.target.value})} type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" placeholder="To" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleApply} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Apply Filters
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : reports.length === 0 ? (
          <EmptyState message="No results found" description="Apply filters to generate reports" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Student Name</th>
                  <th className="text-left px-6 py-3 font-medium">Student ID</th>
                  <th className="text-left px-6 py-3 font-medium">Branch</th>
                  <th className="text-left px-6 py-3 font-medium">Company</th>
                  <th className="text-left px-6 py-3 font-medium">Round</th>
                  <th className="text-left px-6 py-3 font-medium">Outcome</th>
                  <th className="text-left px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{r.studentName || '—'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.studentId || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{r.branch || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{r.companyName || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{r.roundName || `Round ${r.roundNumber || ''}`}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.outcome} /></td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{r.recordedAt ? formatDate(r.recordedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
