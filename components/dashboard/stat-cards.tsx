'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface Stat {
  label: string
  value: string
  accent: string
  glow: string
  mono?: boolean
  href: string
  icon: 'file' | 'calendar' | 'trending' | 'check'
}

function StatIcon({ type, color }: { type: Stat['icon']; color: string }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (type === 'file') return (
    <svg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
  if (type === 'calendar') return (
    <svg {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
  if (type === 'trending') return (
    <svg {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
  return (
    <svg {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export default function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 + i * 0.1 }}
          whileHover={{
            scale: 1.02,
            boxShadow: '0 0 20px rgba(20, 184, 166, 0.15), 0 0 40px rgba(20, 184, 166, 0.05)',
            transition: { duration: 0.15 },
          }}
          whileTap={{ scale: 0.97 }}
          style={{ borderRadius: '16px' }}
        >
          <Link
            href={stat.href}
            className="block rounded-2xl p-5 h-full cursor-pointer"
            style={{
              background: 'rgba(15, 118, 110, 0.12)',
              border: '1px solid rgba(20, 184, 166, 0.25)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(45, 212, 191, 0.7)', letterSpacing: '0.06em' }}
              >
                {stat.label}
              </p>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${stat.glow}` }}
              >
                <StatIcon type={stat.icon} color="#2DD4BF" />
              </div>
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color: stat.accent,
                fontFamily: stat.mono ? "'JetBrains Mono', monospace" : 'inherit',
                lineHeight: 1,
              }}
            >
              {stat.value}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
