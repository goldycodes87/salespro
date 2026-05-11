'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function LampContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-visible w-full rounded-3xl',
        className,
      )}
      style={{ background: '#0A0F1E' }}
    >
      {/* Light cone layer */}
      <div className="relative flex w-full flex-1 items-center justify-center" style={{ transform: 'scaleY(1.25)', isolation: 'isolate' }}>
        {/* Left conic beam */}
        <motion.div
          initial={{ opacity: 0.5, width: '8rem' }}
          whileInView={{ opacity: 1, width: '18rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 'auto',
            right: '50%',
            height: '14rem',
            overflow: 'visible',
            backgroundImage: 'conic-gradient(from 70deg at center top, #1D4ED8, transparent, transparent)',
          }}
        >
          <div style={{ position: 'absolute', width: '100%', left: 0, background: '#0A0F1E', height: '10rem', bottom: 0, maskImage: 'linear-gradient(to top, white, transparent)' }} />
          <div style={{ position: 'absolute', width: '10rem', height: '100%', left: 0, background: '#0A0F1E', bottom: 0, maskImage: 'linear-gradient(to right, white, transparent)' }} />
        </motion.div>

        {/* Right conic beam */}
        <motion.div
          initial={{ opacity: 0.5, width: '8rem' }}
          whileInView={{ opacity: 1, width: '18rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 'auto',
            left: '50%',
            height: '14rem',
            overflow: 'visible',
            backgroundImage: 'conic-gradient(from 290deg at center top, transparent, transparent, #06B6D4)',
          }}
        >
          <div style={{ position: 'absolute', width: '10rem', height: '100%', right: 0, background: '#0A0F1E', bottom: 0, maskImage: 'linear-gradient(to left, white, transparent)' }} />
          <div style={{ position: 'absolute', width: '100%', right: 0, background: '#0A0F1E', height: '10rem', bottom: 0, maskImage: 'linear-gradient(to top, white, transparent)' }} />
        </motion.div>

        {/* Blur overlay */}
        <div style={{ position: 'absolute', top: '50%', height: '12rem', width: '100%', transform: 'translateY(3rem) scaleX(1.5)', background: '#0A0F1E', filter: 'blur(32px)' }} />

        {/* Center glow blob */}
        <div style={{ position: 'absolute', top: '50%', height: '9rem', width: '18rem', transform: 'translateY(-50%)', borderRadius: '50%', background: 'rgba(29,78,216,0.35)', filter: 'blur(40px)' }} />

        {/* Moving glow */}
        <motion.div
          initial={{ width: '4rem' }}
          whileInView={{ width: '10rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{ position: 'absolute', height: '9rem', transform: 'translateY(-5rem)', borderRadius: '50%', background: 'rgba(6,182,212,0.5)', filter: 'blur(24px)' }}
        />

        {/* Horizontal line */}
        <motion.div
          initial={{ width: '6rem' }}
          whileInView={{ width: '18rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{ position: 'absolute', height: '2px', transform: 'translateY(-6rem)', background: 'rgba(6,182,212,0.8)', boxShadow: '0 0 12px rgba(6,182,212,0.6)' }}
        />

        {/* Bottom mask */}
        <div style={{ position: 'absolute', height: '11rem', width: '100%', transform: 'translateY(-10rem)', background: '#0A0F1E' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full" style={{ transform: 'translateY(-5rem)' }}>
        {children}
      </div>
    </div>
  )
}
