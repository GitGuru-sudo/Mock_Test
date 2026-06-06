import { getStatusColor, getStatusLabel } from '../../utils/statusColor'

export default function StatusBadge({ status }) {
  const colorClass = getStatusColor(status)
  const label      = getStatusLabel(status)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  )
}
