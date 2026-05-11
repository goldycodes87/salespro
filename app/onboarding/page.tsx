'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'
import SalesProLogo from '@/components/ui/salespro-logo'
import { PERSONAS } from '@/lib/coach-personas'

// ─── Data ────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { key: 'windows_siding', name: 'Windows & Doors', emoji: '🪟', desc: 'Replacement windows, doors & siding' },
  { key: 'roofing', name: 'Roofing', emoji: '🏠', desc: 'Residential & commercial roofing' },
  { key: 'solar', name: 'Solar', emoji: '☀️', desc: 'Solar panels & energy systems' },
  { key: 'hvac', name: 'HVAC', emoji: '❄️', desc: 'Heating, cooling & ventilation' },
  { key: 'insurance', name: 'Insurance', emoji: '🛡️', desc: 'All lines of insurance' },
  { key: 'real_estate', name: 'Real Estate', emoji: '🏡', desc: 'Residential & commercial property' },
  { key: 'saas', name: 'Software / SaaS', emoji: '💻', desc: 'B2B software & technology' },
  { key: 'financial', name: 'Financial Services', emoji: '💰', desc: 'Investments, lending & planning' },
  { key: 'other', name: 'Other', emoji: '💼', desc: 'Custom for your industry' },
]

type PlatformStatus = 'active' | 'coming_soon'
interface Platform {
  id: string
  name: string
  status: PlatformStatus
}

const PLATFORM_REGISTRY: Record<string, Platform[]> = {
  windows_siding: [
    { id: 'vendo', name: 'Vendo', status: 'active' },
    { id: 'hover', name: 'Hover', status: 'coming_soon' },
  ],
  roofing: [
    { id: 'eagleview', name: 'EagleView', status: 'coming_soon' },
    { id: 'hover', name: 'Hover', status: 'coming_soon' },
  ],
  solar: [
    { id: 'aurora', name: 'Aurora Solar', status: 'coming_soon' },
  ],
  hvac: [
    { id: 'servicetitan', name: 'ServiceTitan', status: 'coming_soon' },
  ],
  insurance: [
    { id: 'salesforce', name: 'Salesforce', status: 'coming_soon' },
  ],
  real_estate: [],
  saas: [
    { id: 'salesforce', name: 'Salesforce', status: 'coming_soon' },
    { id: 'hubspot', name: 'HubSpot', status: 'coming_soon' },
  ],
  financial: [
    { id: 'salesforce', name: 'Salesforce', status: 'coming_soon' },
  ],
  other: [],
}

const ONBOARDING_WELCOME: Record<string, string> = {
  jordan: "Hey {name}. I'm Jordan. I've been watching sales reps like you for 25 years. I already know you're capable of more. Let's prove it.",
  victoria: "Let's be direct, {name}. I don't do average and neither should you. I'm here to make you the top closer on your team. Ready?",
  ray: "LET'S GO {name}! Coach Ray here and I am FIRED UP to work with you. Every appointment is a game. I'm your coach. Let's WIN some games!",
  noel: "Hello {name}. I've already been thinking about your strategy. The data doesn't lie and neither do I. Let's build a system that closes.",
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const INPUT_BASE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '14px',
  color: '#F9FAFB',
  width: '100%',
  height: '56px',
  padding: '0 18px',
  fontSize: '20px',
  outline: 'none',
  textAlign: 'center',
}

const INPUT_FOCUS: React.CSSProperties = {
  background: 'rgba(29,78,216,0.08)',
  border: '1px solid rgba(29,78,216,0.5)',
}

const PRIMARY_BTN: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
  color: '#fff',
  height: '56px',
  borderRadius: '16px',
  fontSize: '18px',
  fontWeight: 700,
  width: '100%',
  maxWidth: '320px',
  cursor: 'pointer',
  border: 'none',
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background:
              i === current
                ? '#1D4ED8'
                : i < current
                ? '#06B6D4'
                : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

// ─── Animated field wrapper ───────────────────────────────────────────────────

function AnimatedField({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────

function useTypewriter(text: string, active: boolean, msPerWord = 50) {
  const [displayed, setDisplayed] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) {
      setDisplayed('')
      return
    }
    setDisplayed('')
    const words = text.split(' ')
    let idx = 0
    const tick = () => {
      idx++
      setDisplayed(words.slice(0, idx).join(' '))
      if (idx < words.length) {
        timerRef.current = setTimeout(tick, msPerWord)
      }
    }
    timerRef.current = setTimeout(tick, msPerWord)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, active, msPerWord])

  return displayed
}

// ─── Screen variants ──────────────────────────────────────────────────────────

const screenVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

const screenTransition = { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }

// ─── Screen 0 — Exclusive Welcome ────────────────────────────────────────────

function Screen0({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="screen0"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={screenTransition}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '40px 24px',
      }}
    >
      <AnimatedGradientBackground
        gradientColors={['#000000', '#0A0F1E', '#0A1628', '#0F2044', '#0A0F1E']}
        Breathing={true}
        animationSpeed={0.008}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '320px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <SalesProLogo variant="icon" height={64} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          style={{
            fontSize: '48px',
            fontWeight: 800,
            color: '#fff',
            marginTop: '32px',
            marginBottom: '0',
            lineHeight: 1.1,
          }}
        >
          You&apos;ve been invited.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.6)',
            maxWidth: '320px',
            marginTop: '20px',
            lineHeight: 1.6,
          }}
        >
          SalesPro is the unfair advantage top sales professionals don&apos;t talk about.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8, duration: 0.5 }}
          style={{
            fontSize: '18px',
            color: '#06B6D4',
            marginTop: '12px',
            fontWeight: 600,
          }}
        >
          Let&apos;s build yours.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.5, duration: 0.5 }}
          style={{ width: '100%', maxWidth: '320px', marginTop: '40px' }}
        >
          <button onClick={onNext} style={PRIMARY_BTN}>
            Get Started →
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Screen 1 — Who You Are ───────────────────────────────────────────────────

interface Screen1Props {
  firstName: string
  setFirstName: (v: string) => void
  lastName: string
  setLastName: (v: string) => void
  company: string
  setCompany: (v: string) => void
  position: string
  setPosition: (v: string) => void
  territory: string
  setTerritory: (v: string) => void
  onNext: () => void
}

function FocusableInput({
  placeholder,
  value,
  onChange,
  helper,
  autoFocus,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  helper?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ marginBottom: '12px' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...INPUT_BASE,
          ...(focused ? INPUT_FOCUS : {}),
        }}
      />
      {helper && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', textAlign: 'center' }}>
          {helper}
        </p>
      )}
    </div>
  )
}

function Screen1(props: Screen1Props) {
  const { firstName, setFirstName, lastName, setLastName, company, setCompany, position, setPosition, territory, setTerritory, onNext } = props

  const allFilled =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    company.trim() !== '' &&
    position.trim() !== '' &&
    territory.trim() !== ''

  return (
    <motion.div
      key="screen1"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={screenTransition}
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '48px 24px 120px' }}
    >
      <ProgressDots current={1} />

      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: '32px' }}>
        Tell us about yourself.
      </h2>

      <div style={{ maxWidth: '320px', width: '100%', margin: '0 auto' }}>
        <FocusableInput
          placeholder="First Name"
          value={firstName}
          onChange={setFirstName}
          autoFocus
        />

        <AnimatedField visible={firstName.trim() !== ''}>
          <FocusableInput
            placeholder="Last Name"
            value={lastName}
            onChange={setLastName}
          />
        </AnimatedField>

        <AnimatedField visible={lastName.trim() !== ''}>
          <FocusableInput
            placeholder="Company"
            value={company}
            onChange={setCompany}
            helper="Who do you work for?"
          />
        </AnimatedField>

        <AnimatedField visible={company.trim() !== ''}>
          <FocusableInput
            placeholder="Your Role"
            value={position}
            onChange={setPosition}
            helper="e.g. Sales Rep, Account Executive"
          />
        </AnimatedField>

        <AnimatedField visible={position.trim() !== ''}>
          <FocusableInput
            placeholder="Your Territory"
            value={territory}
            onChange={setTerritory}
            helper="Where do you sell? e.g. Colorado Springs"
          />
        </AnimatedField>
      </div>

      <AnimatePresence>
        {allFilled && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 48px)',
              maxWidth: '320px',
              zIndex: 50,
            }}
          >
            <button onClick={onNext} style={PRIMARY_BTN}>
              Continue →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Screen 2 — What You Sell ─────────────────────────────────────────────────

interface Screen2Props {
  selectedIndustry: string
  setSelectedIndustry: (k: string) => void
  onNext: () => void
}

function Screen2({ selectedIndustry, setSelectedIndustry, onNext }: Screen2Props) {
  return (
    <motion.div
      key="screen2"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={screenTransition}
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '48px 24px 120px' }}
    >
      <ProgressDots current={2} />

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          What do you sell?
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          We&apos;ll customize SalesPro for your industry.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          maxWidth: '360px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {INDUSTRIES.map(ind => {
          const isSelected = selectedIndustry === ind.key
          return (
            <motion.button
              key={ind.key}
              onClick={() => setSelectedIndustry(ind.key)}
              whileTap={{ scale: 0.97 }}
              animate={isSelected ? { scale: 1.03 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                background: isSelected ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                border: isSelected ? '1px solid #06B6D4' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 18px rgba(6,182,212,0.2)' : 'none',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{ind.emoji}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                {ind.name}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{ind.desc}</div>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedIndustry && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 48px)',
              maxWidth: '320px',
              zIndex: 50,
            }}
          >
            <button onClick={onNext} style={PRIMARY_BTN}>
              Continue →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Screen 3 — Connect Your Tools ───────────────────────────────────────────

interface Screen3Props {
  selectedIndustry: string
  onNext: () => void
}

function Screen3({ selectedIndustry, onNext }: Screen3Props) {
  const [vendoExpanded, setVendoExpanded] = useState(false)
  const platforms = PLATFORM_REGISTRY[selectedIndustry] ?? []
  const hasPlatforms = platforms.length > 0

  return (
    <motion.div
      key="screen3"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={screenTransition}
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '48px 24px 40px' }}
    >
      <ProgressDots current={3} />

      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          Connect your sales platform.
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Import proposals and sync data automatically.
        </p>
      </div>

      <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto', flex: 1 }}>
        {!hasPlatforms && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '32px 20px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px',
            }}
          >
            No platform integrations available for your industry yet.
          </div>
        )}

        {hasPlatforms && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {platforms.map(platform => (
              <div key={platform.id}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: platform.status === 'coming_soon' ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                    {platform.name}
                  </span>

                  {platform.status === 'coming_soon' && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.5)',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '20px',
                        padding: '3px 10px',
                      }}
                    >
                      Coming Soon
                    </span>
                  )}

                  {platform.status === 'active' && (
                    <button
                      onClick={() => {
                        if (platform.id === 'vendo') setVendoExpanded(v => !v)
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {vendoExpanded && platform.id === 'vendo' ? 'Connected ✓' : 'Connect'}
                    </button>
                  )}
                </div>

                {platform.id === 'vendo' && vendoExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      background: 'rgba(6,182,212,0.06)',
                      border: '1px solid rgba(6,182,212,0.2)',
                      borderRadius: '12px',
                      padding: '16px 18px',
                      marginTop: '8px',
                    }}
                  >
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '14px' }}>
                      Forward your Vendo proposal emails to{' '}
                      <span style={{ color: '#06B6D4', fontWeight: 600 }}>vendo@salespro.app</span>{' '}
                      and we&apos;ll import them automatically.
                    </p>
                    <button
                      onClick={onNext}
                      style={{
                        background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      Got it, continue →
                    </button>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '24px' }}>
        <button
          onClick={onNext}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '15px',
            padding: '10px 28px',
            cursor: 'pointer',
          }}
        >
          Skip for now →
        </button>
      </div>
    </motion.div>
  )
}

// ─── Screen 4 — Pick Your Coach ───────────────────────────────────────────────

interface Screen4Props {
  firstName: string
  selectedCoach: string
  setSelectedCoach: (id: string) => void
  onNext: () => void
}

function CoachCard({
  persona,
  selected,
  dimmed,
  onSelect,
  firstName,
}: {
  persona: (typeof PERSONAS)[0]
  selected: boolean
  dimmed: boolean
  onSelect: () => void
  firstName: string
}) {
  const [imgError, setImgError] = useState(false)
  const rawMessage = ONBOARDING_WELCOME[persona.id] ?? ''
  const message = rawMessage.replace('{name}', firstName || 'there')
  const typewriterText = useTypewriter(message, selected)

  return (
    <motion.div
      animate={{
        scale: selected ? 1.05 : 1,
        opacity: dimmed ? 0.5 : 1,
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
    >
      <button
        type="button"
        onClick={onSelect}
        style={{
          width: '100%',
          textAlign: 'left',
          background: selected ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.04)',
          border: selected ? '1.5px solid rgba(29,78,216,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          padding: '16px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {imgError ? (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: persona.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                flexShrink: 0,
              }}
            >
              {persona.avatar}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/coaches/${persona.photoFile}.png`}
              alt={persona.name}
              className="w-20 h-20 rounded-full object-cover object-top"
              style={{ flexShrink: 0 }}
              onError={() => setImgError(true)}
            />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#F9FAFB' }}>
                {persona.name}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: persona.color,
                  color: '#fff',
                }}
              >
                {persona.tagline}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>
              {persona.systemPrompt.split('.')[0]}.
            </p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '18px 18px 18px 4px',
              padding: '16px',
              marginTop: '8px',
              maxWidth: '320px',
            }}
          >
            <p style={{ fontSize: '14px', color: '#fff', lineHeight: 1.6, margin: 0, minHeight: '20px' }}>
              {typewriterText}
              <span style={{ opacity: 0.4 }}>▋</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Screen4({ firstName, selectedCoach, setSelectedCoach, onNext }: Screen4Props) {
  const selectedPersona = PERSONAS.find(p => p.id === selectedCoach)

  return (
    <motion.div
      key="screen4"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={screenTransition}
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '48px 24px 120px' }}
    >
      <ProgressDots current={4} />

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          Meet your coaching team.
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Pick the coach who will push you to close more.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '360px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {PERSONAS.map((persona, i) => (
          <motion.div
            key={persona.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 260, damping: 24 }}
          >
            <CoachCard
              persona={persona}
              selected={selectedCoach === persona.id}
              dimmed={selectedCoach !== '' && selectedCoach !== persona.id}
              onSelect={() => setSelectedCoach(persona.id)}
              firstName={firstName}
            />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedCoach && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 48px)',
              maxWidth: '320px',
              zIndex: 50,
            }}
          >
            <button onClick={onNext} style={PRIMARY_BTN}>
              Choose {selectedPersona?.name} →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Screen 5 — Launch ────────────────────────────────────────────────────────

interface Screen5Props {
  firstName: string
  selectedCoach: string
  onComplete: () => void
  saving: boolean
  error: string | null
}

function Screen5({ firstName, selectedCoach, onComplete, saving, error }: Screen5Props) {
  const coach = PERSONAS.find(p => p.id === selectedCoach)

  useEffect(() => {
    import('canvas-confetti').then(mod =>
      mod.default({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.4 },
        colors: ['#1D4ED8', '#06B6D4', '#ffffff', '#10B981'],
      })
    )
  }, [])

  return (
    <motion.div
      key="screen5"
      variants={screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={screenTransition}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedGradientBackground
        gradientColors={['#000000', '#0A0F1E', '#0A1628', '#0F2044', '#0A0F1E']}
        Breathing={true}
        animationSpeed={0.008}
      />

      <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        <ProgressDots current={5} />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '320px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '28px' }}
        >
          <SalesProLogo variant="full" height={48} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ fontSize: '36px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '8px' }}
        >
          Welcome to SalesPro,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {firstName}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{ fontSize: '16px', color: '#06B6D4', marginBottom: '12px', fontWeight: 600 }}
        >
          Your coach {coach?.name} is ready.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}
        >
          Your customers are waiting.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '40px' }}
        >
          Your first proposal starts now.
        </motion.p>

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#EF4444',
              fontSize: '14px',
              marginBottom: '16px',
              width: '100%',
            }}
          >
            {error}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <motion.button
            onClick={onComplete}
            disabled={saving}
            animate={saving ? {} : { scale: [1, 1.02, 1] }}
            transition={
              saving
                ? {}
                : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }
            style={{
              ...PRIMARY_BTN,
              opacity: saving ? 0.7 : 1,
              maxWidth: '100%',
            }}
          >
            {saving ? 'Setting up your account…' : 'Enter SalesPro →'}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [screen, setScreen] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [territory, setTerritory] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedCoach, setSelectedCoach] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleComplete = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          company,
          position,
          territory,
          industry: selectedIndustry,
          coachPersona: selectedCoach,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Setup failed')
      document.cookie = 'sp_onboarded=true; path=/; max-age=31536000; samesite=lax'
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#0A0F1E', minHeight: '100dvh' }}>
      <AnimatePresence mode="wait">
        {screen === 0 && (
          <Screen0 key="s0" onNext={() => setScreen(1)} />
        )}
        {screen === 1 && (
          <Screen1
            key="s1"
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            company={company}
            setCompany={setCompany}
            position={position}
            setPosition={setPosition}
            territory={territory}
            setTerritory={setTerritory}
            onNext={() => setScreen(2)}
          />
        )}
        {screen === 2 && (
          <Screen2
            key="s2"
            selectedIndustry={selectedIndustry}
            setSelectedIndustry={setSelectedIndustry}
            onNext={() => setScreen(3)}
          />
        )}
        {screen === 3 && (
          <Screen3
            key="s3"
            selectedIndustry={selectedIndustry}
            onNext={() => setScreen(4)}
          />
        )}
        {screen === 4 && (
          <Screen4
            key="s4"
            firstName={firstName}
            selectedCoach={selectedCoach}
            setSelectedCoach={setSelectedCoach}
            onNext={() => setScreen(5)}
          />
        )}
        {screen === 5 && (
          <Screen5
            key="s5"
            firstName={firstName}
            selectedCoach={selectedCoach}
            onComplete={handleComplete}
            saving={saving}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
