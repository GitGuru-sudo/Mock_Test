import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function RotatingText({ texts = [], interval = 2500, className = '' }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (texts.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % texts.length), interval)
    return () => clearInterval(timer)
  }, [texts.length, interval])

  return (
    <span className={`relative inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="inline-block"
        >
          {texts[index] || texts[0]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
