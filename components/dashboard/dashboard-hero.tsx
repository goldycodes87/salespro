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

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0.5, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="relative z-10 text-center px-6 pb-6"
          style={{ paddingTop: 'max(60px, calc(env(safe-area-inset-top) + 40px))' }}
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

          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
            {motivationalLine}
          </p>

          {/* Rep avatar row */}
          <Link href="/settings" className="inline-flex items-center gap-2.5 mx-auto">
            {headshotUrl ? (
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.2)' }}
              >
                <Image
                  src={headshotUrl}
                  alt={repName ?? 'Rep'}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #1D4ED8, #0F766E)',
                  color: '#fff',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.2)',
                }}
              >
                {initials}
              </div>
            )}
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {repName ?? 'Rep'}
            </span>
          </Link>
        </motion.div>
      </LampContainer>
    </div>
  )
}
