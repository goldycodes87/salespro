'use client'

import { motion } from 'framer-motion'

interface Stat {
  label: string
  value: string
  accent: string
  glow: string
  mono?: boolean
}

export default function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 + i * 0.1 }}
          whileHover={{
            boxShadow: `0 0 0 1px ${stat.glow}, 0 4px 24px ${stat.glow}`,
            y: -2,
          }}
          className="rounded-2xl p-4 cursor-default"
          style={{
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>
            {stat.label}
          </p>
          <p
            className="text-2xl font-bold"
            style={{
              color: stat.accent,
              fontFamily: stat.mono ? "'JetBrains Mono', monospace" : 'inherit',
            }}
          >
            {stat.value}
          </p>
        </motion.div>
      ))}
    </div>
  )
}
