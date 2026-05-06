'use client'

import { motion } from 'framer-motion'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'

interface DashboardHeroProps {
  greetingPrefix: string
  dateStr: string
  motivationalLine: string
}

export default function DashboardHero({ greetingPrefix, dateStr, motivationalLine }: DashboardHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl mb-6 px-6 pt-10 pb-8"
    >
      {/* Animated gradient backdrop */}
      <AnimatedGradientBackground
        gradientColors={['#0A0F1E', '#1D4ED8', '#0F766E', '#06B6D4', '#0A0F1E']}
        gradientStops={[20, 45, 65, 82, 100]}
        Breathing={true}
        animationSpeed={0.012}
        startingGap={110}
        breathingRange={5}
      />

      {/* Subtle dark overlay to keep text legible */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{ background: 'rgba(10,15,30,0.55)' }}
      />

      {/* Content */}
      <div className="relative z-10">
        <h1
          className="font-extrabold mb-2 leading-tight"
          style={{ fontSize: 'clamp(36px, 9vw, 48px)', color: '#F9FAFB' }}
        >
          {greetingPrefix},{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #60A5FA, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Eric
          </span>
        </h1>

        <p className="text-sm font-medium mb-3" style={{ color: 'rgba(209,213,219,0.8)' }}>
          {dateStr}
        </p>

        <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {motivationalLine}
        </p>
      </div>
    </motion.div>
  )
}
