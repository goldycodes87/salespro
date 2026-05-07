'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { PERSONAS } from '@/lib/coach-personas'
import { formatPhone } from '@/hooks/usePhoneFormat'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '14px',
  color: '#F9FAFB',
  width: '100%',
  height: '52px',
  padding: '0 16px',
  fontSize: '16px',
  outline: 'none',
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: i === current ? '#1D4ED8' : i < current ? '#06B6D4' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

function PersonaCard({
  persona,
  selected,
  onSelect,
}: {
  persona: (typeof PERSONAS)[0]
  selected: boolean
  onSelect: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-2xl p-4 transition-all"
      style={{
        background: selected ? 'rgba(29,78,216,0.15)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1.5px solid rgba(29,78,216,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-3">
        {imgError ? (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
            style={{ background: persona.color }}
          >
            {persona.avatar}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/coaches/${persona.photoFile}.png`}
            alt={persona.name}
            className="w-14 h-14 rounded-2xl object-cover object-top flex-shrink-0"
            onError={() => setImgError(true)}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm" style={{ color: '#F9FAFB' }}>{persona.name}</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
            >
              {persona.tagline}
            </span>
          </div>
          <p className="text-xs mt-1 line-clamp-2" style={{ color: '#6B7280' }}>
            {persona.systemPrompt.split('.')[0]}.
          </p>
        </div>
        {selected && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#1D4ED8' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('Lifetime Home Remodeling')
  const [personaId, setPersonaId] = useState('jordan')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPersona = PERSONAS.find(p => p.id === personaId) ?? PERSONAS[0]

  const handleComplete = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, company, personaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Setup failed')

      // Cookie is set by the API response, but also set client-side as fallback
      document.cookie = 'sp_onboarded=true; path=/; max-age=31536000; samesite=lax'

      router.push(`/dashboard?welcome=${encodeURIComponent(firstName)}&coach=${encodeURIComponent(selectedPersona.name)}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: '#0A0F1E' }}
    >
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <motion.div
              key="step0"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <StepIndicator current={0} total={3} />
              <div className="text-center mb-10">
                <div className="flex justify-center mb-5">
                  <Image
                    src="/salespro-icon.png"
                    width={72}
                    height={72}
                    alt="SalesPro"
                    style={{ mixBlendMode: 'screen' }}
                  />
                </div>
                <h1
                  className="text-3xl font-extrabold mb-3"
                  style={{
                    background: 'linear-gradient(90deg, #ffffff 0%, #06B6D4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Welcome to SalesPro
                </h1>
                <p className="text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Let&apos;s get you set up in 3 quick steps
                </p>
              </div>
              <div
                className="rounded-2xl p-5 mb-6"
                style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)' }}
              >
                {[
                  { icon: '👤', text: 'Set up your profile' },
                  { icon: '🤝', text: 'Pick your AI sales coach' },
                  { icon: '🚀', text: 'Start closing deals' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium" style={{ color: '#D1D5DB' }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full h-14 rounded-2xl text-base font-bold"
                style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', color: '#fff', boxShadow: '0 4px 24px rgba(29,78,216,0.4)' }}
              >
                Get Started
              </button>
            </motion.div>
          )}

          {/* STEP 1 — Profile */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <StepIndicator current={1} total={3} />
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#F9FAFB' }}>
                  Tell us about yourself
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Step 2 of 3 — Your Profile</p>
              </div>
              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.border = '1px solid rgba(29,78,216,0.6)'; e.target.style.background = 'rgba(29,78,216,0.08)' }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.border = '1px solid rgba(29,78,216,0.6)'; e.target.style.background = 'rgba(29,78,216,0.08)' }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                />
                <input
                  type="tel"
                  placeholder="Phone (123-456-7890)"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  style={inputStyle}
                  onFocus={e => { e.target.style.border = '1px solid rgba(29,78,216,0.6)'; e.target.style.background = 'rgba(29,78,216,0.08)' }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.border = '1px solid rgba(29,78,216,0.6)'; e.target.style.background = 'rgba(29,78,216,0.08)' }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 h-14 rounded-2xl text-base font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF' }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!firstName.trim() || !lastName.trim() || !phone.trim() || !company.trim()}
                  className="flex-[2] h-14 rounded-2xl text-base font-bold"
                  style={{
                    background: (!firstName.trim() || !lastName.trim() || !phone.trim() || !company.trim())
                      ? 'rgba(29,78,216,0.3)'
                      : 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                    color: '#fff',
                    opacity: (!firstName.trim() || !lastName.trim() || !phone.trim() || !company.trim()) ? 0.5 : 1,
                  }}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Coach */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <StepIndicator current={2} total={3} />
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#F9FAFB' }}>
                  Pick your sales coach
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Step 3 of 3 — You can change this anytime in Settings
                </p>
              </div>
              <div className="space-y-3 mb-6">
                {PERSONAS.map(persona => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    selected={personaId === persona.id}
                    onSelect={() => setPersonaId(persona.id)}
                  />
                ))}
              </div>
              {error && (
                <div className="rounded-xl px-4 py-3 mb-4 text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-14 rounded-2xl text-base font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF' }}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-[2] h-14 rounded-2xl text-base font-bold"
                  style={{
                    background: saving ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #059669, #10B981)',
                    color: '#fff',
                    boxShadow: saving ? 'none' : '0 4px 20px rgba(16,185,129,0.3)',
                  }}
                >
                  {saving ? 'Setting up…' : '🚀 Start Selling'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
