'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'

interface DashboardHeroProps {
  greetingPrefix: string
  dateStr: string
  motivationalLine: string
  headshotUrl?: string | null
  repName?: string
}

export default function DashboardHero({ greetingPrefix, dateStr, motivationalLine, headshotUrl, repName }: DashboardHeroProps) {
  const firstName = (repName ?? 'Eric').split(' ')[0]
  const initials = (repName ?? 'E').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl mb-6 px-6 pt-10 pb-8"
    >
      <AnimatedGradientBackground
        gradientColors={['#0A0F1E', '#1D4ED8', '#0F766E', '#06B6D4', '#0A0F1E']}
        gradientStops={[20, 45, 65, 82, 100]}
        Breathing={true}
        animationSpeed={0.012}
        startingGap={110}
        breathingRange={5}
      />

      <div className="absolute inset-0 rounded-3xl" style={{ background: 'rgba(10,15,30,0.55)' }} />

      <div className="relative z-10">
        {/* Headshot — tap goes to settings */}
        <Link href="/settings" className="absolute top-0 right-0">
          {headshotUrl ? (
            <div className="w-12 h-12 rounded-full overflow-hidden" style={{ boxShadow: '0 0 0 2px rgba(29,78,216,0.4)' }}>
              <Image src={headshotUrl} alt={repName ?? 'Rep'} width={48} height={48} className="w-full h-full object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff', boxShadow: '0 0 0 2px rgba(29,78,216,0.4)' }}>
              {initials}
            </div>
          )}
        </Link>

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
            {firstName}
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
