'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcPrice, type PricingInputs, type PricingResult, FINANCING_LABELS } from '@/lib/pricing'
import Link from 'next/link'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'

type Proposal = Record<string, any>
const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

interface DiscountLine { id: string; label: string; amount: number }

function buildDiscountLines(inputs: PricingInputs, result: PricingResult): DiscountLine[] {
  const lines: DiscountLine[] = []
  const base = result.package_price
  if (inputs.bnsn === '30_combined') {
    lines.push({ id: 'combined', label: '30% Buy Now Save Now', amount: base * 0.30 })
  } else {
    if (inputs.promotion !== 'none') {
      const pct = inputs.promotion === '20_off' ? 0.20 : 0.25
      lines.push({ id: 'promo', label: `${pct * 100}% Package Discount`, amount: base * pct })
    }
    if (inputs.bnsn !== 'none') {
      const pct = inputs.bnsn === '10_off' ? 0.10 : 0.05
      lines.push({ id: 'bnsn', label: `Buy Now Save Now +${pct * 100}%`, amount: base * pct })
    }
  }
  if (result.cash_discount > 0) {
    lines.push({ id: 'cash', label: 'Cash Incentive', amount: result.cash_discount })
  }
  return lines
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '20px',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
}

function cardAnimState(myIdx: number, phaseIdx: number, finalIdx: number) {
  const isCurrent = phaseIdx === myIdx
  const isPast = phaseIdx > myIdx
  const isBeyondFinal = phaseIdx > finalIdx && myIdx < finalIdx
  return {
    opacity: isCurrent ? 1 : isPast ? (isBeyondFinal ? 0.35 : 0.5) : 1,
    filter: isBeyondFinal ? 'blur(1.5px)' : 'blur(0px)',
    y: 0,
  }
}

function CostcoCard({ result }: { result: PricingResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...glassCard, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', boxShadow: '0 0 30px rgba(251,191,36,0.05)' }}
      className="w-full p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#D97706' }}>
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
      {(result.costco_member_savings > 0 || result.costco_exec_savings > 0) && (
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(251,191,36,0.1)' }}>
          <p style={{ fontSize: '11px', color: 'rgba(251,191,36,0.5)', fontStyle: 'italic' }}>
            Additional {fmt(result.costco_member_savings + result.costco_exec_savings)} back in your pocket
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default function PresentView({ proposal, backHref }: { proposal: Proposal; backHref?: string }) {
  const pricing: PricingInputs | null = proposal.pricing_data?.proposal_type
    ? proposal.pricing_data as PricingInputs : null
  const result = useMemo(() => pricing ? calcPrice(pricing) : null, [pricing])
  const discountLines = useMemo(() => {
    if (!pricing || !result) return []
    return buildDiscountLines(pricing, result)
  }, [pricing, result])

  const hasFees = !!(result && (result.admin_fee > 0 || result.lead_paint > 0))
  const hasDiscounts = discountLines.length > 0
  const hasCostco = !!(pricing?.costco_revealed && result && (result.costco_member_savings > 0 || result.costco_exec_savings > 0))
  const totalFees = result ? result.admin_fee + result.lead_paint : 0
  const priceBeforeDiscounts = result ? result.package_price + totalFees : 0

  const phases = useMemo(() => {
    const p: string[] = ['intro', 'starting']
    if (hasFees) p.push('fees')
    if (hasDiscounts) p.push('price_before', 'discounts')
    p.push('final')
    if (hasCostco) p.push('costco')
    p.push('savings')
    return p
  }, [hasFees, hasDiscounts, hasCostco])

  const [phaseIdx, setPhaseIdx] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [booking, setBooking] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPhase = phases[phaseIdx]
  const isIntro = currentPhase === 'intro'
  const isSavings = currentPhase === 'savings'
  const finalIdx = phases.indexOf('final')
  const startingIdx = phases.indexOf('starting')
  const feesIdx = phases.indexOf('fees')
  const priceBeforeIdx = phases.indexOf('price_before')
  const discountsIdx = phases.indexOf('discounts')
  const costcoIdx = phases.indexOf('costco')

  const hasFinancing = !!(pricing && pricing.financing !== 'none' && result && result.monthly_payment > 0)

  // Hint timer
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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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

  // Customer name
  const first = proposal.customer_first_name || proposal.customer_name?.split(' ')[0] || ''
  const last = proposal.customer_last_name || proposal.customer_name?.split(' ').slice(1).join(' ') || ''
  const spouseFirst = proposal.spouse_first_name || ''
  const spouseLast = proposal.spouse_last_name || last
  const displayName = spouseFirst
    ? `${first} & ${spouseFirst} ${spouseLast}`.toUpperCase()
    : `${first} ${last}`.trim().toUpperCase()
  const addressLine = [proposal.customer_address, proposal.customer_city, proposal.customer_state].filter(Boolean).join(', ')

  // Starting price subtitle
  const startingSubtitle = useMemo(() => {
    if (!pricing || !result) return ''
    if (pricing.proposal_type === 'siding') return 'Siding Project'
    const n = result.total_windows
    return n > 0 ? `For ${n} Window${n !== 1 ? 's' : ''}` : ''
  }, [pricing, result])

  const hintText = currentPhase === 'final' ? 'Tap to see your savings' : 'Tap to continue'

  const ExitBtn = () => backHref ? (
    <Link href={backHref} className="flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
      style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
      onClick={e => e.stopPropagation()}>×</Link>
  ) : (
    <button type="button" className="flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
      style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
      onClick={e => { e.stopPropagation(); window.history.back() }}>×</button>
  )

  return (
    <div className="fixed inset-0 z-[200]" style={{ background: '#000', color: '#fff' }}
      onClick={!isSavings ? () => advance() : undefined}>

      <AnimatedGradientBackground
        gradientColors={['#000000', '#0A0F1E', '#0D1F3C', '#0A1628', '#000000']}
        gradientStops={[0, 25, 50, 75, 100]}
        Breathing={true} animationSpeed={0.008} breathingRange={3}
      />

      {/* Top bar: logo + exit */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5 flex items-center justify-between"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}>
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
        <ExitBtn />
      </div>

      {/* INTRO: customer name hero */}
      <AnimatePresence>
        {isIntro && (
          <motion.div key="intro"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                fontSize: 'clamp(32px, 6vw, 56px)',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.05em',
                lineHeight: 1.1,
                marginBottom: '12px',
              }}>
              {displayName}
            </motion.h1>
            {addressLine && (
              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                className="uppercase tracking-widest"
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>
                {addressLine}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD STACK */}
      {!isIntro && (
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto"
          style={{ paddingTop: '72px', paddingBottom: isSavings ? '180px' : '72px' }}>
          <div className="flex flex-col items-stretch px-5 gap-4 py-4 max-w-sm mx-auto">

            {/* STARTING PRICE */}
            {phaseIdx >= startingIdx && result && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={cardAnimState(startingIdx, phaseIdx, finalIdx)}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={glassCard} className="w-full p-6">
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Starting Price
                </p>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '6px' }}>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '52px', fontWeight: 700,
                    color: 'rgba(255,255,255,0.35)', lineHeight: 1,
                  }}>
                    {fmt(result.package_price)}
                  </p>
                  {/* Animated strikethrough when discounts revealed */}
                  {discountsIdx !== -1 && phaseIdx >= discountsIdx && (
                    <motion.div
                      initial={{ width: '0%' }} animate={{ width: '105%' }} transition={{ duration: 0.5 }}
                      style={{ position: 'absolute', height: '2px', background: 'rgba(255,255,255,0.4)', top: '52%', left: '-2%' }}
                    />
                  )}
                </div>
                {startingSubtitle && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{startingSubtitle}</p>
                )}
              </motion.div>
            )}

            {/* REQUIRED FEES */}
            {feesIdx !== -1 && phaseIdx >= feesIdx && result && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={cardAnimState(feesIdx, phaseIdx, finalIdx)}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ ...glassCard, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                className="w-full p-6">
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }}>
                  Required Fees
                </p>
                {result.admin_fee > 0 && (
                  <div className="flex justify-between py-1.5">
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Admin Fee</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{fmt(result.admin_fee)}</span>
                  </div>
                )}
                {result.lead_paint > 0 && (
                  <div className="flex justify-between py-1.5">
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Lead Paint Test</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{fmt(result.lead_paint)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 600 }}>Total Fees</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 600 }}>{fmt(totalFees)}</span>
                </div>
              </motion.div>
            )}
            {feesIdx !== -1 && phaseIdx >= feesIdx && phaseIdx < priceBeforeIdx && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.3 }}
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '0 8px' }}>
                Fees are required for all projects and are not subject to discount.
              </motion.p>
            )}

            {/* PRICE BEFORE DISCOUNTS */}
            {priceBeforeIdx !== -1 && phaseIdx >= priceBeforeIdx && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={cardAnimState(priceBeforeIdx, phaseIdx, finalIdx)}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full px-2">
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Price Before Discounts
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '22px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                      {fmt(priceBeforeDiscounts)}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center', marginTop: '8px' }}>
                  Fees are required for all projects and are not subject to discount.
                </p>
              </motion.div>
            )}

            {/* DISCOUNTS */}
            {discountsIdx !== -1 && phaseIdx >= discountsIdx && result && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={cardAnimState(discountsIdx, phaseIdx, finalIdx)}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ ...glassCard, border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 0 20px rgba(6,182,212,0.05)' }}
                className="w-full p-6">
                <p style={{ fontSize: '10px', color: '#06B6D4', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }}>
                  Your Discounts
                </p>
                {discountLines.map((dl, i) => (
                  <div key={dl.id} className="flex justify-between py-1.5"
                    style={{ borderBottom: i < discountLines.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{dl.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#06B6D4', fontSize: '14px', fontWeight: 600 }}>
                      −{fmt(dl.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(6,182,212,0.15)' }}>
                  <span style={{ color: '#06B6D4', fontSize: '15px', fontWeight: 600 }}>Total Savings</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#06B6D4', fontSize: '15px', fontWeight: 700 }}>
                    −{fmt(result.you_save)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* YOUR FINAL PRICE */}
            {phaseIdx >= finalIdx && result && (
              <motion.div
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
                  Your Final Price
                </p>
                <div style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
                  {/* Particles */}
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
                <div style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
                  {result.you_save > 0 && (
                    <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                      style={{ fontSize: '16px', fontWeight: 700, color: '#2DD4BF', marginBottom: '4px' }}>
                      You saved {fmt(result.you_save)} today
                    </motion.p>
                  )}
                  {hasFinancing && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
                      style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                      Or as low as {fmt(result.monthly_payment)}/mo
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}

            {/* COSTCO */}
            {costcoIdx !== -1 && phaseIdx >= costcoIdx && result && <CostcoCard result={result} />}

          </div>
        </div>
      )}

      {/* Tap hint */}
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
              bottom: 0, paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
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
                  color: '#fff', boxShadow: booking ? 'none' : '0 4px 20px rgba(29,78,216,0.35)',
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
