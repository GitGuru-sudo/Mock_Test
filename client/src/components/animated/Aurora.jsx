import { motion } from 'framer-motion'

export default function Aurora({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900">
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse at 80% 50%, rgba(168,85,247,0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.4) 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
