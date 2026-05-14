'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'
import ClozrLogo from '@/components/ui/clozr-logo'
import { Spotlight } from '@/components/ui/spotlight'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0A0F1E' }}
    >
      <AnimatedGradientBackground />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#1D4ED8" />

      <div className="relative z-10 flex flex-col items-center text-center px-6" style={{ maxWidth: 560 }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ marginBottom: 40 }}
        >
          <ClozrLogo variant="full" height={288} />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          Built for closers.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.5)',
            maxWidth: 400,
            textAlign: 'center',
            lineHeight: 1.6,
            marginBottom: 48,
          }}
        >
          The AI-powered sales command center that helps you close more deals.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <button
            onClick={() => router.push('/signup')}
            style={{
              height: 56,
              width: 200,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 17,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(29,78,216,0.4)',
            }}
          >
            Get Started →
          </button>

          <button
            onClick={() => router.push('/login')}
            style={{
              height: 56,
              width: 200,
              borderRadius: 16,
              background: 'transparent',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 17,
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.4 }}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 20 }}
        >
          Free to try. No credit card required.
        </motion.p>
      </div>
    </div>
  )
}
