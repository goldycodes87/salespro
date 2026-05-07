'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { LampContainer } from '@/components/ui/lamp'

interface DashboardHeroProps {
  greetingPrefix: string
  dateStr: string
  motivationalLine: string
  headshotUrl?: string | null
  repName?: string
}

export default function DashboardHero({
  greetingPrefix,
  dateStr,
  motivationalLine,
  headshotUrl,
  repName,
}: DashboardHeroProps) {
  const firstName = (repName ?? 'Eric').split(' ')[0]
  const initials = (repName ?? 'E')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative mb-6">
      <LampContainer className="min-h-[320px]">
        {/* Big watermark icon */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <Image
            src="/salespro-icon.png"
            width={300}
            height={300}
            alt=""
            className="select-none"
            style={{ opacity: 0.04, userSelect: 'none' }}
          />
        </div>

        {/* Headshot — tap goes to settings */}
        <Link href="/settings" className="absolute top-4 right-4 z-20">
          {headshotUrl ? (
            <div
              className="w-12 h-12 rounded-full overflow-hidden"
              style={{ boxShadow: '0 0 0 2px rgba(29,78,216,0.4)' }}
            >
              <Image
                src={headshotUrl}
                alt={repName ?? 'Rep'}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #1D4ED8, #0F766E)',
                color: '#fff',
                boxShadow: '0 0 0 2px rgba(29,78,216,0.4)',
              }}
            >
              {initials}
            </div>
          )}
        </Link>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0.5, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="relative z-10 text-center px-6 pb-6"
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
