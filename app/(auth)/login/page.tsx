'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'
import { Spotlight } from '@/components/ui/spotlight'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0A0F1E' }}
    >
      <AnimatedGradientBackground />

      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#1D4ED8" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Glass card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
          }}
        >
          {/* Logo pill */}
          <div className="text-center mb-8">
            <div className="inline-flex justify-center mb-3">
              <div
                className="flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  padding: '12px 24px',
                  borderRadius: '12px',
                }}
              >
                <Image
                  src="/salespro-horizontal.png"
                  alt="SalesPro"
                  height={56}
                  width={280}
                  className="object-contain"
                  style={{ height: '56px', width: 'auto' }}
                />
              </div>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              Your sales command center.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-12 rounded-xl px-4 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#F9FAFB',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid rgba(29,78,216,0.6)'
                  e.target.style.background = 'rgba(29,78,216,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(255,255,255,0.10)'
                  e.target.style.background = 'rgba(255,255,255,0.06)'
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-12 rounded-xl px-4 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#F9FAFB',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid rgba(29,78,216,0.6)'
                  e.target.style.background = 'rgba(29,78,216,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(255,255,255,0.10)'
                  e.target.style.background = 'rgba(255,255,255,0.06)'
                }}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm px-3 py-2 rounded-lg"
                style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-semibold transition-all mt-2 relative overflow-hidden"
              style={{
                background: loading ? 'rgba(29,78,216,0.5)' : 'linear-gradient(135deg, #1D4ED8, #1E40AF)',
                color: '#F9FAFB',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(29,78,216,0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
