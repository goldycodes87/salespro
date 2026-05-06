'use client'

import { motion } from 'framer-motion'

const stats = [
  { label: "Today's Proposals", value: '0', accent: '#3B82F6', glow: 'rgba(29,78,216,0.25)' },
  { label: 'This Week',         value: '0', accent: '#14B8A6', glow: 'rgba(15,118,110,0.25)' },
  { label: 'Pipeline Value',    value: '$0', accent: '#06B6D4', glow: 'rgba(6,182,212,0.25)', mono: true },
  { label: 'Signed',            value: '0', accent: '#10B981', glow: 'rgba(16,185,129,0.25)' },
]

export default function StatCards() {
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
            transition: 'border-color 0.2s',
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
