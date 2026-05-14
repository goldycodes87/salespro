'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import ClozrLogo from '@/components/ui/clozr-logo'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'
import { Spotlight } from '@/components/ui/spotlight'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7

const INDUSTRIES = [
  { id: 'windows_doors', icon: '🪟', name: 'Windows & Doors' },
  { id: 'roofing',       icon: '🏠', name: 'Roofing' },
  { id: 'solar',         icon: '☀️', name: 'Solar' },
  { id: 'hvac',          icon: '❄️', name: 'HVAC' },
  { id: 'insurance',     icon: '🛡️', name: 'Insurance' },
  { id: 'real_estate',   icon: '🏡', name: 'Real Estate' },
  { id: 'saas',          icon: '💻', name: 'Software / SaaS' },
  { id: 'financial',     icon: '💰', name: 'Financial Services' },
  { id: 'other',         icon: '💼', name: 'Other' },
]

const COACHES = [
  {
    id: 'jordan',
    name: 'Jordan',
    title: 'The Wise Closer',
    color: '#1D4ED8',
    photo: '/coaches/jordan.png',
    desc: 'Calm, wise, 25 years in sales. Asks the right questions. Believes in you.',
    intro: (n: string) => `Hey ${n}. I'm Jordan. 25 years closing deals — and I'm here to help you close more. What's on your mind?`,
  },
  {
    id: 'victoria',
    name: 'Victoria',
    title: 'The High-Standard Driver',
    color: '#7C3AED',
    photo: '/coaches/victoria.png',
    desc: 'Direct, high expectations. Celebrates hard wins. No excuses.',
    intro: (n: string) => `Let's get straight to it, ${n}. I've seen your industry. There's real money to be made. Let's go get it.`,
  },
  {
    id: 'coach_ray',
    name: 'Coach Ray',
    title: 'The Sports Coach',
    color: '#DC2626',
    photo: '/coaches/coach-ray.png',
    desc: 'Pure sports coach energy. Every deal is a game. Let\'s win.',
    intro: (n: string) => `LET'S GO ${n}! Coach Ray here. Every appointment is a game and I am YOUR coach. Ready to WIN?`,
  },
  {
    id: 'noel',
    name: 'Noel',
    title: 'The Data Strategist',
    color: '#0F766E',
    photo: '/coaches/noel.png',
    desc: 'Data-driven, analytical. Finds patterns. Builds systems.',
    intro: (n: string) => `Hello ${n}. The data on your industry is fascinating. With the right system, your close rate can improve 40%. Let's build that system.`,
  },
]

const VOICE_OPTIONS = {
  female: [
    { name: 'Rachel', voice_id: '21m00Tcm4TlvDq8ikWAM' },
    { name: 'Bella',  voice_id: 'EXAVITQu4vr4xnSDxMaL' },
    { name: 'Elli',   voice_id: 'MF3mGyEYCl7XYWbV9V6O' },
  ],
  male: [
    { name: 'Adam', voice_id: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Josh', voice_id: 'TxGEqnHWrfWFTfGW9XjX' },
    { name: 'Sam',  voice_id: 'yoZ06aMxZJJ28mfd3POQ' },
  ],
}

const CAPABILITIES = [
  { id: 'answer_all',    icon: '📞', label: 'Answer all calls' },
  { id: 'answer_dnd',   icon: '🔕', label: 'Answer calls on DND only' },
  { id: 'schedule',     icon: '📅', label: 'Schedule appointments' },
  { id: 'qualify',      icon: '👤', label: 'Qualify leads' },
  { id: 'email_summary',icon: '📧', label: 'Send call summary emails' },
  { id: 'outbound',     icon: '📱', label: 'Make outbound calls' },
]

// ─── Step animation variants ──────────────────────────────────────────────────

const stepVariants = {
  enter:  { x: 60,  opacity: 0 },
  center: { x: 0,   opacity: 1 },
  exit:   { x: -60, opacity: 0 },
}

const stepTransition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

// ─── Shared input style ───────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 56,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#F9FAFB',
  fontSize: 16,
  padding: '0 16px',
  outline: 'none',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
}

function onFocusField(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = '#06B6D4'
  e.target.style.background = 'rgba(6,182,212,0.08)'
}
function onBlurField(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.12)'
  e.target.style.background = 'rgba(255,255,255,0.06)'
}

// ─── Gradient button ──────────────────────────────────────────────────────────

function GradientBtn({ children, onClick, disabled = false, fullWidth = false, style = {} }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  fullWidth?: boolean
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 56,
        width: fullWidth ? '100%' : 'auto',
        padding: fullWidth ? undefined : '0 32px',
        borderRadius: 16,
        background: disabled
          ? 'rgba(255,255,255,0.1)'
          : 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
        color: disabled ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
        fontWeight: 700,
        fontSize: 16,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 24px rgba(29,78,216,0.3)',
        transition: 'background 0.2s, opacity 0.2s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── Typewriter component ─────────────────────────────────────────────────────

function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('')
  const words = text.split(' ')

  useEffect(() => {
    setDisplayed('')
    let i = 0
    const start = setTimeout(() => {
      const interval = setInterval(() => {
        if (i >= words.length) { clearInterval(interval); return }
        setDisplayed(words.slice(0, i + 1).join(' '))
        i++
      }, 40)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(start)
  }, [text, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  return <span>{displayed}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  // Step 1 — animation states
  const [s1Phase, setS1Phase] = useState(0)

  // Step 2 — profile
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [phone, setPhone]           = useState('')
  const [company, setCompany]       = useState('')
  const [role, setRole]             = useState('')
  const [territory, setTerritory]   = useState('')

  // Step 3 — industry
  const [industry, setIndustry] = useState('')

  // Step 4 — coach
  const [coach, setCoach] = useState('')
  const [coachBubble, setCoachBubble] = useState(false)

  // Step 5 — assistant
  const [assistantEnabled, setAssistantEnabled]     = useState(true)
  const [phoneType, setPhoneType]                   = useState<'business' | 'cell' | ''>('')
  const [areaCode, setAreaCode]                     = useState('')
  const [availableNumbers, setAvailableNumbers]     = useState<{phoneNumber:string;friendlyName:string}[]>([])
  const [searchingNumbers, setSearchingNumbers]     = useState(false)
  const [selectedNumber, setSelectedNumber]         = useState('')
  const [assistantName, setAssistantName]           = useState('Alex')
  const [voiceTab, setVoiceTab]                     = useState<'female'|'male'>('female')
  const [selectedVoice, setSelectedVoice]           = useState('')
  const [previewingVoice, setPreviewingVoice]       = useState('')
  const [capabilities, setCapabilities]             = useState<string[]>([])
  const [qualifyCriteria, setQualifyCriteria]       = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Step 6 — plan
  const [plan, setPlan] = useState<'payg' | 'unlimited' | ''>('')

  // Step 7 — submitting
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const confettiFired = useRef(false)

  // ── Step 1 auto-sequence ───────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 1) return
    const timers = [
      setTimeout(() => setS1Phase(1), 300),
      setTimeout(() => setS1Phase(2), 800),
      setTimeout(() => setS1Phase(3), 1400),
      setTimeout(() => setS1Phase(4), 2000),
      setTimeout(() => setS1Phase(5), 2800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [step])

  // ── Step 4 — show bubble after coach selected ─────────────────────────────
  useEffect(() => {
    if (!coach) { setCoachBubble(false); return }
    const t = setTimeout(() => setCoachBubble(true), 100)
    return () => clearTimeout(t)
  }, [coach])

  // ── Step 7 confetti + submit ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== 7 || confettiFired.current) return
    confettiFired.current = true
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#1D4ED8', '#06B6D4', '#ffffff', '#10B981', '#7C3AED'],
      startVelocity: 45,
      gravity: 0.8,
    })
  }, [step])

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goNext = () => { setDirection(1); setStep(s => s + 1) }
  const goBack = () => { setDirection(-1); setStep(s => s - 1) }

  // ── Phone formatting ───────────────────────────────────────────────────────
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  }

  // ── Voice preview ──────────────────────────────────────────────────────────
  const previewVoice = async (voice_id: string) => {
    if (previewingVoice === voice_id) return
    setPreviewingVoice(voice_id)
    try {
      const res = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id }),
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      audio.onended = () => setPreviewingVoice('')
    } catch {
      setPreviewingVoice('')
    }
  }

  // ── Twilio number search ───────────────────────────────────────────────────
  const searchNumbers = async () => {
    if (areaCode.length !== 3) return
    setSearchingNumbers(true)
    try {
      const res = await fetch('/api/twilio/search-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaCode }),
      })
      const data = await res.json()
      setAvailableNumbers(data.numbers ?? [])
    } catch {
      setAvailableNumbers([])
    } finally {
      setSearchingNumbers(false)
    }
  }

  // ── Toggle capability ──────────────────────────────────────────────────────
  const toggleCap = (id: string) => {
    setCapabilities(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  // ── Final submit ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting || submitted) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, phone, company,
          position: role, territory, industry,
          coachPersona: coach,
          assistantEnabled,
          assistantName,
          assistantVoiceId: selectedVoice,
          assistantCapabilities: capabilities,
          assistantQualifyingCriteria: qualifyCriteria,
          phoneNumberType: phoneType,
          selectedPhoneNumber: selectedNumber,
          subscriptionTier: plan,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        document.cookie = 'clozr_onboarded=true; path=/; max-age=31536000; samesite=lax'
        setTimeout(() => router.push('/dashboard'), 600)
      }
    } catch {
      setSubmitting(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedCoach = COACHES.find(c => c.id === coach)
  const profileComplete = firstName.trim() && lastName.trim() && phone.trim() && company.trim() && role.trim() && territory.trim()

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#0A0F1E' }}>
      <AnimatedGradientBackground />

      {/* Progress bar */}
      {step > 1 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', zIndex: 50 }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #1D4ED8, #06B6D4)', borderRadius: '0 2px 2px 0' }}
          />
        </div>
      )}

      {/* Back button */}
      {step > 1 && step < 7 && (
        <button
          onClick={goBack}
          style={{
            position: 'fixed', top: 20, left: 20, zIndex: 50,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.6)',
            fontSize: 14, cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={stepTransition}
          className="relative z-10 min-h-screen flex flex-col"
          style={{ paddingTop: step === 1 ? 0 : 60 }}
        >

          {/* ── STEP 1: WELCOME SPLASH ─────────────────────────────────── */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ position: 'relative' }}>
              <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#1D4ED8" />

              {/* Logo */}
              <motion.div
                animate={{ opacity: s1Phase >= 1 ? 1 : 0 }}
                transition={{ duration: 0.8 }}
                style={{ marginBottom: 32 }}
              >
                <ClozrLogo variant="full" height={288} />
              </motion.div>

              {/* Hero headline */}
              <motion.h1
                animate={{ opacity: s1Phase >= 2 ? 1 : 0, y: s1Phase >= 2 ? 0 : 20 }}
                transition={{ duration: 0.6 }}
                style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, color: '#FFFFFF', marginBottom: 16, lineHeight: 1.1 }}
              >
                The unfair advantage.
              </motion.h1>

              {/* Subtext */}
              <motion.p
                animate={{ opacity: s1Phase >= 3 ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 320, margin: '0 auto 24px', lineHeight: 1.6 }}
              >
                Top closers use Clozr to win more deals, coach smarter, and close faster.
              </motion.p>

              {/* Feature pills */}
              <motion.div
                animate={{ opacity: s1Phase >= 4 ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}
              >
                {['🎯 Close more deals', '🧠 AI sales coach', '📱 Smart assistant'].map(pill => (
                  <span key={pill} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 20,
                    padding: '8px 16px',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.7)',
                  }}>{pill}</span>
                ))}
              </motion.div>

              {/* CTA button */}
              <motion.div
                animate={{ opacity: s1Phase >= 5 ? 1 : 0, y: s1Phase >= 5 ? 0 : 20 }}
                transition={{ duration: 0.5 }}
              >
                <GradientBtn onClick={goNext} style={{ width: 280 }}>
                  Let&apos;s build yours →
                </GradientBtn>
              </motion.div>
            </div>
          )}

          {/* ── STEP 2: PROFILE ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="px-5 pb-32 max-w-lg mx-auto w-full">
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F9FAFB', marginBottom: 8 }}>
                Tell us about yourself.
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
                This personalizes your entire Clozr experience.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>First Name *</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" style={fieldStyle} onFocus={onFocusField} onBlur={onBlurField} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>Last Name *</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" style={fieldStyle} onFocus={onFocusField} onBlur={onBlurField} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>Phone *</label>
                  <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="123-456-7890" type="tel" style={fieldStyle} onFocus={onFocusField} onBlur={onBlurField} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>Company *</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Who do you work for?" style={fieldStyle} onFocus={onFocusField} onBlur={onBlurField} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>Your Role *</label>
                  <input value={role} onChange={e => setRole(e.target.value)} placeholder="Sales Rep, Account Exec..." style={fieldStyle} onFocus={onFocusField} onBlur={onBlurField} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>Territory *</label>
                  <input value={territory} onChange={e => setTerritory(e.target.value)} placeholder="e.g. Colorado Springs, Denver Metro" style={fieldStyle} onFocus={onFocusField} onBlur={onBlurField} />
                </div>
              </div>

              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #0A0F1E 60%, transparent)', zIndex: 40 }}>
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                  <GradientBtn onClick={goNext} disabled={!profileComplete} fullWidth>
                    Continue →
                  </GradientBtn>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: INDUSTRY ───────────────────────────────────────── */}
          {step === 3 && (
            <div className="px-5 pb-32 max-w-lg mx-auto w-full">
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F9FAFB', marginBottom: 8 }}>
                What do you sell?
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
                We&apos;ll customize Clozr for your industry.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {INDUSTRIES.map(ind => (
                  <motion.button
                    key={ind.id}
                    onClick={() => setIndustry(ind.id)}
                    whileTap={{ scale: 0.97 }}
                    animate={{ scale: industry === ind.id ? 1.03 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={{
                      background: industry === ind.id ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                      border: industry === ind.id
                        ? '1px solid #06B6D4'
                        : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      padding: '20px 16px',
                      textAlign: 'center',
                      minHeight: 100,
                      cursor: 'pointer',
                      boxShadow: industry === ind.id
                        ? '0 0 0 1px #06B6D4, 0 0 20px rgba(6,182,212,0.15)'
                        : 'none',
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{ind.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F9FAFB', marginTop: 8 }}>
                      {ind.name}
                    </div>
                  </motion.button>
                ))}
              </div>

              {industry && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #0A0F1E 60%, transparent)', zIndex: 40 }}>
                  <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <GradientBtn onClick={goNext} fullWidth>Continue →</GradientBtn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: COACH ──────────────────────────────────────────── */}
          {step === 4 && (
            <div className="px-5 pb-40 max-w-lg mx-auto w-full">
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F9FAFB', marginBottom: 12, textAlign: 'center' }}>
                Your AI Sales Coach
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', maxWidth: 340, margin: '0 auto 16px', textAlign: 'center', lineHeight: 1.6 }}>
                Your coach learns your sales patterns, remembers every appointment, and gives you specific advice to close more deals. Text or talk to your coach anytime — on the drive home, before a big appointment, or when you need a strategy session.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
                {['💬 Text anytime', '🎙️ Voice on the go', '🧠 Remembers everything'].map(pill => (
                  <span key={pill} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{pill}</span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {COACHES.map(c => (
                  <motion.button
                    key={c.id}
                    onClick={() => setCoach(c.id)}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: coach === c.id
                        ? `2px solid ${c.color}`
                        : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 20,
                      padding: 20,
                      cursor: 'pointer',
                      minHeight: 160,
                      textAlign: 'left',
                      boxShadow: coach === c.id
                        ? `0 0 0 1px ${c.color}, 0 0 24px ${c.color}30`
                        : 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <img
                      src={c.photo}
                      alt={c.name}
                      style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    />
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB', marginTop: 12 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: c.color, marginTop: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.5 }}>{c.desc}</div>
                  </motion.button>
                ))}
              </div>

              {/* Coach bubble */}
              <AnimatePresence>
                {coachBubble && selectedCoach && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '18px 18px 18px 4px',
                      padding: '16px 20px',
                      maxWidth: 320,
                      margin: '20px auto 0',
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.6,
                    }}
                  >
                    <Typewriter text={selectedCoach.intro(firstName || 'there')} delay={200} />
                  </motion.div>
                )}
              </AnimatePresence>

              {coach && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #0A0F1E 60%, transparent)', zIndex: 40 }}>
                  <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <GradientBtn onClick={goNext} fullWidth>
                      Choose {selectedCoach?.name} →
                    </GradientBtn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: AI ASSISTANT ───────────────────────────────────── */}
          {step === 5 && (
            <div className="px-5 pb-32 max-w-lg mx-auto w-full">
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F9FAFB', marginBottom: 12, textAlign: 'center' }}>
                Your AI Sales Assistant
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', maxWidth: 340, margin: '0 auto 8px', textAlign: 'center', lineHeight: 1.6 }}>
                Your assistant answers calls, schedules appointments, qualifies leads, and captures every conversation — so you never miss an opportunity, even when you&apos;re with a customer.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
                {['📞 Answers your calls', '📅 Books appointments', '🎯 Qualifies leads'].map(pill => (
                  <span key={pill} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{pill}</span>
                ))}
              </div>

              {/* Meeting Mode highlight */}
              <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: 16, margin: '0 0 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🎙️ Meeting Mode</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Record appointments, get AI summaries, and let your coach debrief every meeting automatically.
                </p>
                <span style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#06B6D4' }}>
                  Coming soon
                </span>
              </div>

              {/* Enable toggle */}
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#F9FAFB' }}>Enable AI Assistant</span>
                <button
                  onClick={() => setAssistantEnabled(v => !v)}
                  style={{
                    width: 52, height: 28, borderRadius: 14,
                    background: assistantEnabled ? 'linear-gradient(135deg, #1D4ED8, #06B6D4)' : 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3,
                    left: assistantEnabled ? 26 : 3,
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </button>
              </div>

              <div style={{ opacity: assistantEnabled ? 1 : 0.35, pointerEvents: assistantEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                {/* Phone type */}
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>How should your assistant handle calls?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {[
                    { id: 'business' as const, label: 'Give me a business number', sub: 'Get a dedicated Clozr number. Calls forward to your cell.' },
                    { id: 'cell'     as const, label: 'Use my cell number',        sub: 'Your assistant activates when you\'re in DND mode.' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setPhoneType(opt.id)}
                      style={{
                        background: phoneType === opt.id ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                        border: phoneType === opt.id ? '1px solid #06B6D4' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, padding: '14px 18px', textAlign: 'left', cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#F9FAFB' }}>{opt.label}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Number search */}
                {phoneType === 'business' && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>Enter your area code</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        value={areaCode}
                        onChange={e => setAreaCode(e.target.value.replace(/\D/g,'').slice(0,3))}
                        placeholder="719"
                        type="tel"
                        style={{ ...fieldStyle, width: 100 }}
                        onFocus={onFocusField} onBlur={onBlurField}
                      />
                      <GradientBtn onClick={searchNumbers} disabled={areaCode.length !== 3 || searchingNumbers}>
                        {searchingNumbers ? 'Searching…' : 'Search Numbers'}
                      </GradientBtn>
                    </div>
                    {availableNumbers.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {availableNumbers.map(n => (
                          <button key={n.phoneNumber} onClick={() => setSelectedNumber(n.phoneNumber)}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              background: selectedNumber === n.phoneNumber ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                              border: selectedNumber === n.phoneNumber ? '1px solid #06B6D4' : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontSize: 15, color: '#F9FAFB', fontWeight: 500 }}>{n.friendlyName}</span>
                            <span style={{ fontSize: 12, color: selectedNumber === n.phoneNumber ? '#06B6D4' : 'rgba(255,255,255,0.4)' }}>
                              {selectedNumber === n.phoneNumber ? 'Selected ✓' : 'Select'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Assistant name */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>What should your assistant be called?</label>
                  <input
                    value={assistantName}
                    onChange={e => setAssistantName(e.target.value.slice(0, 20))}
                    placeholder="Alex"
                    style={fieldStyle}
                    onFocus={onFocusField} onBlur={onBlurField}
                  />
                </div>

                {/* Voice */}
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Choose a voice</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {(['female', 'male'] as const).map(tab => (
                      <button key={tab} onClick={() => setVoiceTab(tab)}
                        style={{
                          padding: '8px 20px', borderRadius: 10,
                          background: voiceTab === tab ? 'linear-gradient(135deg, #1D4ED8, #06B6D4)' : 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: voiceTab === tab ? '#fff' : 'rgba(255,255,255,0.6)',
                          fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {VOICE_OPTIONS[voiceTab].map(v => (
                      <div key={v.voice_id}
                        onClick={() => setSelectedVoice(v.voice_id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: selectedVoice === v.voice_id ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                          border: selectedVoice === v.voice_id ? '1px solid #06B6D4' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#F9FAFB' }}>{v.name}</span>
                        <button
                          onClick={e => { e.stopPropagation(); previewVoice(v.voice_id) }}
                          style={{
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                            color: previewingVoice === v.voice_id ? '#06B6D4' : 'rgba(255,255,255,0.7)',
                            fontSize: 12, fontWeight: 600,
                          }}
                        >
                          {previewingVoice === v.voice_id ? '▶ Playing…' : '▶ Preview'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capabilities */}
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>What can your assistant do?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {CAPABILITIES.map(cap => (
                      <div key={cap.id}>
                        <button
                          onClick={() => toggleCap(cap.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            background: capabilities.includes(cap.id) ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.04)',
                            border: capabilities.includes(cap.id) ? '1px solid #1D4ED8' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{cap.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#F9FAFB' }}>{cap.label}</span>
                          {capabilities.includes(cap.id) && (
                            <span style={{ marginLeft: 'auto', color: '#06B6D4', fontSize: 16 }}>✓</span>
                          )}
                        </button>
                        {cap.id === 'qualify' && capabilities.includes('qualify') && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{ marginTop: 8 }}
                          >
                            <textarea
                              value={qualifyCriteria}
                              onChange={e => setQualifyCriteria(e.target.value)}
                              placeholder="e.g. Homeowner, project over $5,000, within my territory"
                              rows={3}
                              style={{
                                ...fieldStyle,
                                height: 'auto',
                                padding: '12px 16px',
                                resize: 'none',
                                lineHeight: 1.5,
                              } as React.CSSProperties}
                              onFocus={onFocusField} onBlur={onBlurField}
                            />
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #0A0F1E 60%, transparent)', zIndex: 40 }}>
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                  <GradientBtn onClick={goNext} fullWidth>Continue →</GradientBtn>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 6: SUBSCRIPTION ───────────────────────────────────── */}
          {step === 6 && (
            <div className="px-5 pb-32 max-w-lg mx-auto w-full">
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F9FAFB', marginBottom: 8 }}>
                Choose your plan.
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
                Start free. Upgrade anytime.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* PAYG */}
                <button
                  onClick={() => setPlan('payg')}
                  style={{
                    background: plan === 'payg' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                    border: plan === 'payg' ? '2px solid #06B6D4' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20, padding: 24, textAlign: 'left', cursor: 'pointer',
                    boxShadow: plan === 'payg' ? '0 0 24px rgba(6,182,212,0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB', marginBottom: 8 }}>Pay As You Go</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: '#1D4ED8' }}>$50</span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/mo + usage</span>
                  </div>
                  {['All core features', 'AI coach (text)', 'Lead management', 'Proposals & presentations'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: '#10B981', fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                    </div>
                  ))}
                  {['API calls billed at cost + 20%', 'Voice coach extra', 'AI assistant extra'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>○</span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{f}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, display: 'inline-block', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, color: '#06B6D4' }}>
                    1 month free trial
                  </div>
                </button>

                {/* Unlimited */}
                <button
                  onClick={() => setPlan('unlimited')}
                  style={{
                    background: 'rgba(29,78,216,0.15)',
                    border: plan === 'unlimited' ? '2px solid #06B6D4' : '2px solid #1D4ED8',
                    borderRadius: 20, padding: 24, textAlign: 'left', cursor: 'pointer',
                    position: 'relative',
                    boxShadow: plan === 'unlimited' ? '0 0 32px rgba(6,182,212,0.2)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ position: 'absolute', top: -12, left: 20, background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                    MOST POPULAR
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB', marginBottom: 8 }}>Unlimited</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$150</span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/mo</span>
                  </div>
                  {['Everything in Pay As You Go', 'Unlimited API usage', 'Voice coach (11Labs)', 'AI assistant (Vapi)', 'Twilio business number included', 'Priority support'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: '#10B981', fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, display: 'inline-block', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, color: '#06B6D4' }}>
                    2 months free trial
                  </div>
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
                No credit card required for trial.
              </p>

              {plan && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #0A0F1E 60%, transparent)', zIndex: 40 }}>
                  <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <GradientBtn onClick={goNext} fullWidth>Start Free Trial →</GradientBtn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 7: LAUNCH ─────────────────────────────────────────── */}
          {step === 7 && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={{ marginBottom: 24 }}>
                <ClozrLogo variant="full" height={288} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, color: '#F9FAFB', marginBottom: 12 }}
              >
                You&apos;re in,{' '}
                <span style={{ background: 'linear-gradient(90deg, #1D4ED8, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {firstName}
                </span>
                .
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                style={{ fontSize: 16, color: '#06B6D4', marginBottom: 8 }}
              >
                Your coach {selectedCoach?.name} is ready.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 48 }}
              >
                {plan === 'unlimited' ? 'Unlimited plan' : 'Pay As You Go plan'} — {plan === 'unlimited' ? '2' : '1'} month{plan === 'unlimited' ? 's' : ''} free.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <GradientBtn
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{ width: 240, fontSize: 18 }}
                  >
                    {submitting ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" style={{ display: 'inline-block' }} />
                        Setting up…
                      </span>
                    ) : 'Enter Clozr →'}
                  </GradientBtn>
                </motion.div>
              </motion.div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
