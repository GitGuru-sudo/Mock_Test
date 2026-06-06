import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Ripple({ children, className = '' }) {
  const [ripples, setRipples] = useState([])

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
  }

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={handleClick}>
      {children}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ width: 0, height: 0, x: r.x, y: r.y, opacity: 0.4 }}
            animate={{ width: 300, height: 300, x: r.x - 150, y: r.y - 150, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full bg-white/30 pointer-events-none"
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
