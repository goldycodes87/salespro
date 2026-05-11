'use client'

import { motion } from 'framer-motion'
import { LampContainer } from '@/components/ui/lamp'

interface DashboardHeroProps {
  greetingPrefix: string
  dateStr: string
  motivationalLine: string
  repName?: string
}

export default function DashboardHero({
  greetingPrefix,
  dateStr,
  motivationalLine,
  repName,
}: DashboardHeroProps) {
  const firstName = (repName ?? 'Eric').split(' ')[0]

  return (
    <div className="relative mb-6">
      <LampContainer className="min-h-[320px]">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0.5, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="relative z-10 text-center px-6 pb-6"
          style={{ paddingTop: '80px' }}
        >
          <h1
            className="font-extrabold leading-tight mb-2"
            style={{ fontSize: 'clamp(40px, 6vw, 64px)', color: '#F9FAFB' }}
          >
            {greetingPrefix},{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #1D4ED8, #06B6D4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {firstName}
            </span>
          </h1>

          <p style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
            {dateStr}
          </p>

          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
            {motivationalLine}
          </p>
        </motion.div>
      </LampContainer>
    </div>
  )
}
