import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useCompanies, useCreateCompany } from '../hooks/useCompanies'
import { useAuth } from '../hooks/useAuth'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import TiltCard from '../components/animated/TiltCard'

export default function Companies() {
  const { data: companiesData, isLoading } = useCompanies()
  const createMutation = useCreateCompany()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', industry: '', website: '', ctc: '', location: '' })
  const [rounds, setRounds] = useState([{ roundName: '', roundType: 'aptitude' }])

  const companies = companiesData?.companies || companiesData?.data || companiesData || []

  const addRound = () => setRounds([...rounds, { roundName: '', roundType: 'aptitude' }])
  const removeRound = (i) => { if (rounds.length > 1) setRounds(rounds.filter((_, idx) => idx !== i)) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rounds.length === 0) { toast.error('Add at least one round'); return }
    try {
      await createMutation.mutateAsync({
        ...form,
        ctc: parseFloat(form.ctc) || 0,
        rounds: rounds.map((r, i) => ({ ...r, roundNumber: i + 1 })),
      })
      toast.success('Company created successfully')
      setOpen(false)
      setForm({ name: '', description: '', industry: '', website: '', ctc: '', location: '' })
      setRounds([{ roundName: '', roundType: 'aptitude' }])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create company')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{Array.isArray(companies) ? companies.length : 0} companies</p>
        <button onClick={() => setOpen(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          + Add Company
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Loading...</div>
      ) : !Array.isArray(companies) || companies.length === 0 ? (
        <EmptyState message="No companies yet" description="Add your first company to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company, i) => (
            <motion.div
              key={company._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <TiltCard className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{company.name}</h3>
                <StatusBadge status={company.recruitmentStatus} />
              </div>
              <p className="text-sm text-gray-500 mb-1">{company.industry || '—'}</p>
              <p className="text-lg font-bold text-indigo-600 mb-3">{company.ctc ? `${company.ctc} LPA` : '—'}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{company.rounds?.length || 0} rounds</span>
                <button onClick={() => navigate(`/companies/${company._id}`)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  View Details →
                </button>
              </div>
            </TiltCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Company Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Company</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Company Name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.industry} onChange={(e) => setForm({...form, industry: e.target.value})} placeholder="Industry" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} placeholder="Website" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.ctc} onChange={(e) => setForm({...form, ctc: e.target.value})} type="number" step="0.1" placeholder="CTC (LPA)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Location" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {/* Rounds Builder */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Rounds</span>
                  <button type="button" onClick={addRound} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Round</button>
                </div>
                {rounds.map((r, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={r.roundName} onChange={(e) => { const upd = [...rounds]; upd[i] = {...upd[i], roundName: e.target.value}; setRounds(upd) }} placeholder={`Round ${i + 1} name`} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm outline-none" />
                    <select value={r.roundType} onChange={(e) => { const upd = [...rounds]; upd[i] = {...upd[i], roundType: e.target.value}; setRounds(upd) }} className="px-2 py-1.5 border border-gray-300 rounded text-sm outline-none">
                      <option value="aptitude">Aptitude</option>
                      <option value="technical">Technical</option>
                      <option value="coding">Coding</option>
                      <option value="gd">GD</option>
                      <option value="hr">HR</option>
                    </select>
                    {rounds.length > 1 && <button type="button" onClick={() => removeRound(i)} className="text-red-500 hover:text-red-700 px-1">&times;</button>}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create Company</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
