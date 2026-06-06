export function AlertDialog({ open, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative z-50 bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        {children}
      </div>
    </div>
  )
}

export function AlertDialogHeader({ children }) {
  return <div className="mb-4">{children}</div>
}

export function AlertDialogTitle({ children }) {
  return <h2 className="text-lg font-semibold">{children}</h2>
}

export function AlertDialogDescription({ children }) {
  return <p className="text-sm text-gray-600 mt-1">{children}</p>
}

export function AlertDialogFooter({ children }) {
  return <div className="flex justify-end gap-2 mt-4">{children}</div>
}

export function AlertDialogAction({ children, ...props }) {
  return (
    <button
      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
      {...props}
    >
      {children}
    </button>
  )
}

export function AlertDialogCancel({ children, ...props }) {
  return (
    <button
      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
      {...props}
    >
      {children}
    </button>
  )
}
