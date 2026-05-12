'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'
import ClozrLogo from '@/components/ui/clozr-logo'
import { Spotlight } from '@/components/ui/spotlight'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const inputStyle = {
    width: '100%',
    height: 52,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: '#F9FAFB',
    fontSize: 15,
    padding: '0 16px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://clozrhq.com/onboarding',
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#0A0F1E' }}
      >
        <AnimatedGradientBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center text-center px-6"
          style={{ maxWidth: 400 }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F9FAFB', marginBottom: 12 }}>
            Check your email
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 8, lineHeight: 1.6 }}>
            We sent a confirmation to
          </p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#06B6D4', marginBottom: 16 }}>
            {email}
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 32 }}>
            Click the link to activate your account and start onboarding.
          </p>
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.resend({ type: 'signup', email })
            }}
            style={{
              background: 'none', border: 'none', color: '#06B6D4',
              fontSize: 14, cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Resend email
          </button>
        </motion.div>
      </div>
    )
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
        <div className="flex flex-col items-center" style={{ marginBottom: 28 }}>
          <ClozrLogo variant="icon" height={40} />
        </div>

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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB', textAlign: 'center', marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 28 }}>
            Join the closers who are winning more.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => { e.target.style.border = '1px solid rgba(6,182,212,0.6)'; e.target.style.background = 'rgba(6,182,212,0.08)' }}
                onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min 8 characters"
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={(e) => { e.target.style.border = '1px solid rgba(6,182,212,0.6)'; e.target.style.background = 'rgba(6,182,212,0.08)' }}
                  onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: 0 }}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={(e) => { e.target.style.border = '1px solid rgba(6,182,212,0.6)'; e.target.style.background = 'rgba(6,182,212,0.08)' }}
                  onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: 0 }}>
                  {showConfirm ? 'HIDE' : 'SHOW'}
                </button>
              </div>
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
              className="w-full rounded-xl text-sm font-semibold transition-all mt-2"
              style={{
                height: 56,
                background: loading ? 'rgba(29,78,216,0.5)' : 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                color: '#F9FAFB',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 16,
                fontWeight: 700,
                boxShadow: loading ? 'none' : '0 4px 24px rgba(29,78,216,0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#06B6D4', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
