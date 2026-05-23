'use client'

import { motion } from 'framer-motion'

export function Logo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <polygon points="50,8 82,72 66,72" fill="#9500FF" opacity="0.9" />
        <polygon points="50,8 34,72 18,72" fill="#9500FF" />
        <polygon points="18,72 82,72 62,55 38,55" fill="#BF5EFF" opacity="0.8" />
      </motion.svg>
      {showText && (
        <span className="text-base font-semibold text-foreground tracking-tight">
          AntoEcom <span className="text-muted-foreground font-normal">Agents</span>
        </span>
      )}
    </div>
  )
}
