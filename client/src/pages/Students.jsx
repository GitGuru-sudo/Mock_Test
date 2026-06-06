import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from '../hooks/useStudents'
import { studentsAPI } from '../api/students'
import { useAuth } from '../hooks/useAuth'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { formatDate } from '../utils/formatDate'

export default function Students() {
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [viewStudent, setViewStudent] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const { user } = useAuth()

  const limit = 10

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setTimeout(() => setDebouncedSearch(e.target.value), 300)
  }

  const { data, isLoading } = useStudents({
    page,
    limit,
    search: debouncedSearch || undefined,
    branch: branchFilter || undefined,
    placementStatus: statusFilter || undefined,
  })

  const createMutation = useCreateStudent()
  const updateMutation = useUpdateStudent()
  const deleteMutation = useDeleteStudent()

  const students = data?.data || data?.students || []
  const totalPages = data?.pagination?.totalPages || data?.totalPages || 1
  const total = data?.pagination?.total || data?.total || 0

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', branch: 'CSE', year: '3', cgpa: '', resumeUrl: '' })

  const resetForm = () => setFormData({ name: '', email: '', phone: '', branch: 'CSE', year: '3', cgpa: '', resumeUrl: '' })

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({ ...formData, cgpa: parseFloat(formData.cgpa), year: parseInt(formData.year) })
      toast.success('Student added successfully')
      setAddOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student')
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      await updateMutation.mutateAsync({ id: editStudent._id, data: { ...formData, cgpa: parseFloat(formData.cgpa), year: parseInt(formData.year) } })
      toast.success('Student updated successfully')
      setEditOpen(false)
      setEditStudent(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteId)
      toast.success('Student deleted successfully')
      setDeleteId(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student')
    }
  }

  const openEdit = (student) => {
    setEditStudent(student)
    setFormData({ name: student.name, email: student.email, phone: student.phone || '', branch: student.branch, year: String(student.year), cgpa: String(student.cgpa), resumeUrl: student.resumeUrl || '' })
    setEditOpen(true)
  }

  const openView = async (id) => {
    try {
      const [studentRes, timelineRes] = await Promise.all([
        studentsAPI.getById(id),
        studentsAPI.getTimeline(id),
      ])
      const student = studentRes.data.data?.student || studentRes.data?.student || studentRes.data
      const timeline = timelineRes.data.data?.timeline || timelineRes.data?.timeline || timelineRes.data?.data || []
      setViewStudent({ ...student, timeline })
    } catch {
      toast.error('Failed to load student details')
    }
  }

  const placementStatusLabel = (s) => {
    if (s.placementStatus === 'placed' && s.placedCompany) {
      return `Selected by ${s.placedCompany}`
    }
    return s.placementStatus
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by name or ID..."
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-64 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
          <option value="">All Branches</option>
          {['CSE','ECE','ME','CE','EE','IT'].map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
          <option value="">All Status</option>
          <option value="not_placed">Not Placed</option>
          <option value="in_process">In Process</option>
          <option value="placed">Placed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={() => setAddOpen(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors ml-auto">
          + Add Student
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : students.length === 0 ? (
          <EmptyState message="No students found" description="Try adjusting your search or filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Student ID</th>
                  <th className="text-left px-6 py-3 font-medium">Name</th>
                  <th className="text-left px-6 py-3 font-medium">Branch</th>
                  <th className="text-left px-6 py-3 font-medium">CGPA</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                {students.map((s, i) => (
                  <motion.tr
                    key={s._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{s.studentId}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{s.name}</td>
                    <td className="px-6 py-4 text-gray-600">{s.branch}</td>
                    <td className="px-6 py-4 text-gray-600">{s.cgpa}</td>
                    <td className="px-6 py-4"><StatusBadge status={s.placementStatus} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openView(s._id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">View</button>
                      <button onClick={() => openEdit(s)} className="text-amber-600 hover:text-amber-800 text-xs font-medium mr-3">Edit</button>
                      {user?.role === 'admin' && <button onClick={() => setDeleteId(s._id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>}
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500">Showing {students.length} of {total} students</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Student</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} type="email" placeholder="Email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Phone" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                {['CSE','ECE','ME','CE','EE','IT'].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
              <input value={formData.cgpa} onChange={(e) => setFormData({...formData, cgpa: e.target.value})} type="number" step="0.01" min="0" max="10" placeholder="CGPA (0-10)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input value={formData.resumeUrl} onChange={(e) => setFormData({...formData, resumeUrl: e.target.value})} placeholder="Resume URL (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setAddOpen(false); resetForm() }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Edit Student</h3>
            <form onSubmit={handleEdit} className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} type="email" placeholder="Email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Phone" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                {['CSE','ECE','ME','CE','EE','IT'].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
              <input value={formData.cgpa} onChange={(e) => setFormData({...formData, cgpa: e.target.value})} type="number" step="0.01" min="0" max="10" placeholder="CGPA" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input value={formData.resumeUrl} onChange={(e) => setFormData({...formData, resumeUrl: e.target.value})} placeholder="Resume URL" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setEditOpen(false); setEditStudent(null) }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">Update Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewStudent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setViewStudent(null)}
        >
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Student Details</h3>
                <button onClick={() => setViewStudent(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <div className="space-y-3">
                <div><span className="text-sm text-gray-500">Student ID:</span><p className="font-mono">{viewStudent.studentId}</p></div>
                <div><span className="text-sm text-gray-500">Name:</span><p className="font-medium">{viewStudent.name}</p></div>
                <div><span className="text-sm text-gray-500">Email:</span><p>{viewStudent.email}</p></div>
                <div><span className="text-sm text-gray-500">Phone:</span><p>{viewStudent.phone || '—'}</p></div>
                <div><span className="text-sm text-gray-500">Branch:</span><p>{viewStudent.branch}</p></div>
                <div><span className="text-sm text-gray-500">Year:</span><p>{viewStudent.year}</p></div>
                <div><span className="text-sm text-gray-500">CGPA:</span><p>{viewStudent.cgpa}</p></div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <div className="mt-1">
                    {viewStudent.placementStatus === 'placed' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Selected</span>
                    ) : (
                      <StatusBadge status={viewStudent.placementStatus} />
                    )}
                  </div>
                </div>
                {viewStudent.resumeUrl && <div><span className="text-sm text-gray-500">Resume:</span><p><a href={viewStudent.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline text-sm">View Resume</a></p></div>}
                <div><span className="text-sm text-gray-500">Created:</span><p>{formatDate(viewStudent.createdAt)}</p></div>
              </div>
              {viewStudent.timeline && viewStudent.timeline.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-base font-semibold mb-3">Company Timeline</h4>
                  <div className="space-y-4">
                    {viewStudent.timeline.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <div className="border-l-2 border-indigo-300 pl-4">
                          <p className="font-medium text-gray-800">{item.company?.name || 'Company'}</p>
                          {item.rounds && item.rounds.map((r, j) => (
                            <div key={j} className="flex items-center gap-2 mt-1 text-sm">
                              <span className="text-gray-500">{r.session?.roundName || `Round ${r.roundNumber || (j + 1)}`}</span>
                              {r.result?.outcome === 'offer' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Selected by {item.company?.name || 'company'}
                                </span>
                              ) : (
                                <StatusBadge status={r.result?.outcome || r.attendance?.status || 'upcoming'} />
                              )}
                              {r.result?.remarks && <span className="text-gray-400 text-xs">{r.result.remarks}</span>}
                            </div>
                          ))}
                        </div>
                        {item.rounds && item.rounds.some((r) => r.result?.outcome === 'offer') && (
                          <div className="mt-1 ml-4 text-sm font-medium text-green-700">
                            Selected by {item.company?.name || 'company'}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {user?.role === 'admin' && <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Student" description="Are you sure you want to delete this student? This action cannot be undone." onConfirm={handleDelete} confirmLabel="Delete" />}
    </div>
  )
}
