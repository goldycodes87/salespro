'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcPrice, type PricingInputs, FINANCING_LABELS } from '@/lib/pricing'
import Link from 'next/link'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'

type Proposal = Record<string, any>
const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

interface DiscountStep {
  id: string
  label: string
  amount: number
  priceBefore: number
  priceAfter: number
}

function buildDiscountSteps(inputs: PricingInputs, packagePrice: number, cashDiscount: number): DiscountStep[] {
  const steps: DiscountStep[] = []
  let current = packagePrice
  if (inputs.bnsn === '30_combined') {
    const amount = packagePrice * 0.30
    steps.push({ id: 'combined', label: '30% BUY NOW SAVE NOW', amount, priceBefore: current, priceAfter: current - amount })
    current -= amount
  } else {
    if (inputs.promotion !== 'none') {
      const pct = inputs.promotion === '20_off' ? 0.20 : 0.25
      const amount = packagePrice * pct
      steps.push({ id: 'promo', label: `${pct * 100}% PROMOTIONAL DISCOUNT`, amount, priceBefore: current, priceAfter: current - amount })
      current -= amount
    }
    if (inputs.bnsn !== 'none') {
      const pct = inputs.bnsn === '10_off' ? 0.10 : 0.05
      const amount = packagePrice * pct
      steps.push({ id: 'bnsn', label: `BUY NOW SAVE NOW +${pct * 100}%`, amount, priceBefore: current, priceAfter: current - amount })
      current -= amount
    }
  }
  if (cashDiscount > 0) {
    steps.push({ id: 'cash', label: 'CASH DISCOUNT', amount: cashDiscount, priceBefore: current, priceAfter: current - cashDiscount })
  }
  return steps
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '20px',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
}

function SavingsCard({ result, discountSteps }: { result: any; discountSteps: DiscountStep[] }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={glassCard} className="w-full p-6">
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: '10px', color: '#2DD4BF', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>You Saved</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', color: '#2DD4BF', fontWeight: 700, lineHeight: 1 }}>
            {fmt(result.you_save)}
          </p>
        </div>
        <button type="button"
          onClick={e => { e.stopPropagation(); setExpanded(s => !s) }}
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)', color: '#2DD4BF' }}>
          <motion.svg animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {discountSteps.map((s, i) => (
                <div key={s.id} className="flex justify-between py-2"
                  style={{ borderBottom: i < discountSteps.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{s.label}</span>
                  <span style={{ color: '#2DD4BF', fontSize: '13px' }}>−{fmt(s.amount)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CostcoCard({ result }: { result: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...glassCard, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', boxShadow: '0 0 30px rgba(251,191,36,0.05)' }}
      className="w-full p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#D97706' }}>
          <span style={{ color: '#fff', fontSize: '9px', fontWeight: 900 }}>C</span>
        </div>
        <p style={{ fontSize: '10px', color: '#FCD34D', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Costco Member Savings</p>
      </div>
      {result.costco_member_savings > 0 && (
        <div className="flex justify-between py-1.5">
          <span style={{ color: 'rgba(251,191,36,0.7)', fontSize: '14px' }}>Member Benefit (10%)</span>
          <span style={{ color: '#FCD34D', fontSize: '14px', fontWeight: 700 }}>−{fmt(result.costco_member_savings)}</span>
        </div>
      )}
      {result.costco_exec_savings > 0 && (
        <div className="flex justify-between py-1.5" style={{ borderTop: '1px solid rgba(251,191,36,0.1)' }}>
          <span style={{ color: 'rgba(251,191,36,0.7)', fontSize: '14px' }}>Executive Reward</span>
          <span style={{ color: '#FCD34D', fontSize: '14px', fontWeight: 700 }}>−{fmt(result.costco_exec_savings)}</span>
        </div>
      )}
    </motion.div>
  )
}

export default function PresentView({ proposal, backHref }: { proposal: Proposal; backHref?: string }) {
  const pricing: PricingInputs | null = proposal.pricing_data?.proposal_type
    ? proposal.pricing_data as PricingInputs : null
  const result = useMemo(() => pricing ? calcPrice(pricing) : null, [pricing])
  const discountSteps = useMemo(() => {
    if (!pricing || !result) return []
    return buildDiscountSteps(pricing, result.package_price, result.cash_discount)
  }, [pricing, result])

  // phases: intro(0), starting(1), discount_0..N(2..2+N), final(2+N+1=N+3... wait)
  // Let me use indexOf for safety
  const phases = useMemo(() => {
    const p: string[] = ['intro', 'starting']
    discountSteps.forEach((_, i) => p.push(`discount_${i}`))
    p.push('final', 'savings')
    return p
  }, [discountSteps])

  const [phaseIdx, setPhaseIdx] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [booking, setBooking] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPhase = phases[phaseIdx]
  const isIntro = currentPhase === 'intro'
  const isFinal = currentPhase === 'final'
  const isSavings = currentPhase === 'savings'
  const finalIdx = phases.indexOf('final')
  const savingsIdx = phases.indexOf('savings')

  const hasFinancing = !!(pricing && pricing.financing !== 'none' && result && result.monthly_payment > 0)
  const hasCostco = !!(pricing?.costco_revealed && result && (result.costco_member_savings > 0 || result.costco_exec_savings > 0))
  const addressLine = [proposal.customer_address, proposal.customer_city, proposal.customer_state].filter(Boolean).join(', ')
  const hintText = isFinal ? 'Tap to see your savings' : 'Tap to continue'

  // Hint: appears after animation delay, cleared on tap
  useEffect(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
    setShowHint(false)
    if (isSavings) return
    const delay = isIntro ? 1400 : 700
    hintTimer.current = setTimeout(() => setShowHint(true), delay)
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current) }
  }, [phaseIdx, isIntro, isSavings])

  // Auto-scroll to newest card
  useEffect(() => {
    if (isIntro || !scrollRef.current) return
    const el = scrollRef.current
    setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 150)
  }, [phaseIdx, isIntro])

  const advance = useCallback(() => {
    setShowHint(false)
    setPhaseIdx(i => Math.min(i + 1, phases.length - 1))
  }, [phases.length])

  const handleTap = () => { if (!isSavings) advance() }

  const handleEmail = async () => {
    setEmailing(true)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/email`, { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        setActionDone(`Emailed to ${d.to} ✓`)
        setTimeout(() => setActionDone(null), 4000)
      }
    } finally { setEmailing(false) }
  }

  const handleBooked = async () => {
    setBooking(true)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signed', lead_id: proposal.lead_id }),
      })
      if (res.ok) {
        const confetti = (await import('canvas-confetti')).default
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#1D4ED8', '#34D399', '#60A5FA', '#FCD34D'] })
        setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 300)
        setActionDone('Booked! 🎉')
      }
    } finally { setBooking(false) }
  }

  const ExitButton = () => backHref ? (
    <Link href={backHref}
      className="flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
      style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
      onClick={e => e.stopPropagation()}>×</Link>
  ) : (
    <button type="button"
      className="flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
      style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
      onClick={e => { e.stopPropagation(); window.history.back() }}>×</button>
  )

  return (
    <div className="fixed inset-0 z-[200]" style={{ background: '#000', color: '#fff' }}
      onClick={!isSavings ? handleTap : undefined}>

      {/* Breathing gradient background */}
      <AnimatedGradientBackground
        gradientColors={['#000000', '#0A0F1E', '#0D1F3C', '#0A1628', '#000000']}
        gradientStops={[0, 25, 50, 75, 100]}
        Breathing={true}
        animationSpeed={0.008}
        breathingRange={3}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="flex items-center justify-between">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ duration: 0.8 }}
            className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>SalesPro</span>
          </motion.div>
          <ExitButton />
        </div>
        {addressLine && (
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center uppercase tracking-widest mt-2"
            style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>
            {addressLine}
          </motion.p>
        )}
      </div>

      {/* Scrollable card stack */}
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto"
        style={{ paddingTop: '96px', paddingBottom: isSavings ? '180px' : '72px' }}>
        <div className="flex flex-col items-stretch px-5 gap-4 py-4 max-w-sm mx-auto">

          {/* STARTING PRICE */}
          {phaseIdx >= 1 && result && (
            <motion.div
              key="starting"
              initial={{ opacity: 0, y: 40 }} animate={{
                opacity: phaseIdx > 1 ? 0.5 : 1,
                y: 0,
                filter: phaseIdx >= finalIdx ? 'blur(1.5px)' : 'blur(0px)',
              }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={glassCard} className="w-full p-6">
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Starting Price
              </p>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '52px', fontWeight: 700,
                color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through', lineHeight: 1,
              }}>
                {fmt(result.package_price)}
              </p>
            </motion.div>
          )}

          {/* DISCOUNT CARDS (accumulate, previous dim) */}
          {discountSteps.map((ds, i) => {
            const cardPhaseIdx = 2 + i
            if (phaseIdx < cardPhaseIdx) return null
            const isPast = phaseIdx > cardPhaseIdx
            return (
              <motion.div
                key={ds.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{
                  opacity: isPast ? 0.5 : 1,
                  y: 0,
                  filter: phaseIdx >= finalIdx ? 'blur(1.5px)' : 'blur(0px)',
                }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={glassCard} className="w-full p-6">
                <motion.div
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3 }}
                  style={{ height: '1px', background: 'linear-gradient(90deg, #06B6D4, rgba(6,182,212,0.2))', originX: 0, marginBottom: '16px' }}
                />
                <p style={{ fontSize: '10px', color: '#06B6D4', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {ds.label}
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '32px', color: '#2DD4BF', fontWeight: 700, lineHeight: 1, marginBottom: '10px' }}>
                  −{fmt(ds.amount)}
                </p>
                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  New Price
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '40px', color: '#fff', fontWeight: 600, lineHeight: 1 }}>
                  {fmt(ds.priceAfter)}
                </p>
              </motion.div>
            )
          })}

          {/* YOUR PRICE */}
          {phaseIdx >= finalIdx && result && (
            <motion.div
              key="final"
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                ...glassCard,
                boxShadow: '0 0 60px rgba(29,78,216,0.3), 0 0 120px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                position: 'relative', overflow: 'hidden',
              }}
              className="w-full p-8">
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 50% 100%, rgba(29,78,216,0.2) 0%, transparent 60%)',
              }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                Your Price Today
              </p>
              <div style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
                {/* Framer Motion particles */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i / 8) * Math.PI * 2
                  return (
                    <motion.div key={i}
                      initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
                      animate={{ x: Math.cos(angle) * 80, y: Math.sin(angle) * 50, opacity: 0, scale: 0 }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 1.1, ease: 'easeOut' }}
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        width: 4, height: 4, borderRadius: '50%',
                        background: i % 3 === 0 ? '#60A5FA' : i % 3 === 1 ? '#06B6D4' : '#34D399',
                        pointerEvents: 'none', marginTop: -2, marginLeft: -2,
                      }}
                    />
                  )
                })}
                <motion.p
                  initial={{ scale: 0.7, opacity: 0, filter: 'blur(20px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 'clamp(52px, 10vw, 88px)',
                    fontWeight: 800, lineHeight: 1,
                    background: 'linear-gradient(135deg, #60A5FA 0%, #06B6D4 40%, #34D399 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                  {fmt(result.your_price)}
                </motion.p>
              </div>
              {hasFinancing && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }} style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Or as low as</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '24px', color: '#fff', fontWeight: 600 }}>
                    {fmt(result.monthly_payment)}
                    <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>/mo</span>
                  </p>
                  {pricing?.financing && FINANCING_LABELS[pricing.financing] && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      {FINANCING_LABELS[pricing.financing]}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SAVINGS */}
          {isSavings && result && result.you_save > 0 && (
            <SavingsCard result={result} discountSteps={discountSteps} />
          )}

          {/* COSTCO */}
          {isSavings && hasCostco && result && <CostcoCard result={result} />}
        </div>
      </div>

      {/* Tap to continue hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div key="hint"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            className="absolute left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none"
            style={{ bottom: '36px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{hintText}</p>
            <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom action bar */}
      <AnimatePresence>
        {isSavings && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 28 }}
            className="absolute left-0 right-0 z-50 px-4 pt-3"
            style={{
              bottom: 0,
              paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
            onClick={e => e.stopPropagation()}>
            <AnimatePresence>
              {actionDone && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-center text-sm mb-2" style={{ color: '#34D399' }}>
                  {actionDone}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex gap-2">
              {backHref ? (
                <Link href={backHref}
                  className="flex-1 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}>
                  Follow Up
                </Link>
              ) : (
                <button type="button"
                  className="flex-1 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}
                  onClick={() => window.history.back()}>
                  Follow Up
                </button>
              )}
              <button type="button" onClick={handleEmail} disabled={emailing}
                className="flex-1 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold"
                style={{ border: '1px solid rgba(29,78,216,0.5)', color: emailing ? 'rgba(96,165,250,0.4)' : '#60A5FA', background: 'rgba(29,78,216,0.08)' }}>
                {emailing ? 'Sending…' : 'Email'}
              </button>
              <button type="button" onClick={handleBooked} disabled={booking}
                className="flex-1 h-12 rounded-2xl flex items-center justify-center text-sm font-bold"
                style={{
                  background: booking ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                  color: '#fff',
                  boxShadow: booking ? 'none' : '0 4px 20px rgba(29,78,216,0.35)',
                }}>
                {booking ? 'Saving…' : 'Booked! 🎉'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
