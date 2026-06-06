export const STATUS_COLORS = {
  placed:     'bg-green-100 text-green-800 border-green-200',
  rejected:   'bg-red-100 text-red-800 border-red-200',
  in_process: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  not_placed: 'bg-gray-100 text-gray-700 border-gray-200',
  present:    'bg-green-100 text-green-800 border-green-200',
  absent:     'bg-red-100 text-red-800 border-red-200',
  pass:       'bg-green-100 text-green-800 border-green-200',
  fail:       'bg-red-100 text-red-800 border-red-200',
  offer:      'bg-blue-100 text-blue-800 border-blue-200',
  pending:    'bg-gray-100 text-gray-700 border-gray-200',
  scheduled:  'bg-blue-100 text-blue-800 border-blue-200',
  completed:  'bg-green-100 text-green-800 border-green-200',
  cancelled:  'bg-red-100 text-red-800 border-red-200',
  upcoming:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  ongoing:    'bg-blue-100 text-blue-800 border-blue-200',
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getStatusLabel(status) {
  const labels = {
    not_placed: 'Not Placed',
    in_process: 'In Process',
    placed:     'Placed',
    rejected:   'Rejected',
    present:    'Present',
    absent:     'Absent',
  }
  return labels[status] || status?.replace(/_/g, ' ') || '—'
}
