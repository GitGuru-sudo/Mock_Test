import { motion } from 'framer-motion'

export default function ShinyText({ text = '', className = '' }) {
  return (
    <motion.span
      className={`bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-[length:200%_auto] ${className}`}
      animate={{ backgroundPosition: ['0% center', '200% center'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    >
      {text}
    </motion.span>
  )
}
