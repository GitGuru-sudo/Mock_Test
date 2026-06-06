import { Inbox } from 'lucide-react'

export default function EmptyState({ message = 'No data found', description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox size={48} className="text-gray-300 mb-4" />
      <p className="text-gray-500 font-medium text-lg">{message}</p>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
    </div>
  )
}
