'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcPrice, type PricingInputs, FINANCING_LABELS } from '@/lib/pricing'
import Link from 'next/link'

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
    steps.push({ id: 'combined', label: '30% Buy Now Save Now', amount, priceBefore: current, priceAfter: current - amount })
    current -= amount
  } else {
    if (inputs.promotion !== 'none') {
      const pct = inputs.promotion === '20_off' ? 0.20 : 0.25
      const amount = packagePrice * pct
      steps.push({ id: 'promo', label: `${pct * 100}% Promotional Discount`, amount, priceBefore: current, priceAfter: current - amount })
      current -= amount
    }
    if (inputs.bnsn !== 'none') {
      const pct = inputs.bnsn === '10_off' ? 0.10 : 0.05
      const amount = packagePrice * pct
      steps.push({ id: 'bnsn', label: `Buy Now Save Now +${pct * 100}%`, amount, priceBefore: current, priceAfter: current - amount })
      current -= amount
    }
  }

  if (cashDiscount > 0) {
    steps.push({ id: 'cash', label: 'Cash Discount', amount: cashDiscount, priceBefore: current, priceAfter: current - cashDiscount })
  }

  return steps
}

// Phase ids: logo → address → starting → discount_0..N → final → complete
type PhaseId = 'logo' | 'address' | 'starting' | `discount_${number}` | 'final' | 'complete'

interface Phase {
  id: PhaseId
  autoMs?: number
}

export default function PresentView({
  proposal,
  backHref,
}: {
  proposal: Proposal
  backHref?: string
}) {
  const pricing: PricingInputs | null = proposal.pricing_data?.proposal_type
    ? proposal.pricing_data as PricingInputs
    : null
  const result = useMemo(() => pricing ? calcPrice(pricing) : null, [pricing])

  const discountSteps = useMemo(() => {
    if (!pricing || !result) return []
    return buildDiscountSteps(pricing, result.package_price, result.cash_discount)
  }, [pricing, result])

  const phases: Phase[] = useMemo(() => {
    const p: Phase[] = [
      { id: 'logo', autoMs: 1300 },
      { id: 'address', autoMs: 1500 },
      { id: 'starting', autoMs: 1200 },
    ]
    discountSteps.forEach((_, i) => p.push({ id: `discount_${i}`, autoMs: 1500 }))
    p.push({ id: 'final' })
    p.push({ id: 'complete' })
    return p
  }, [discountSteps])

  const [phaseIdx, setPhaseIdx] = useState(0)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPhase = phases[phaseIdx]
  const isComplete = currentPhase?.id === 'complete'
  const isFinal = currentPhase?.id === 'final'

  const advance = useCallback(() => {
    setPhaseIdx(i => Math.min(i + 1, phases.length - 1))
  }, [phases.length])

  // Auto-advance timer
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const ms = currentPhase?.autoMs
    if (ms) {
      timerRef.current = setTimeout(advance, ms)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phaseIdx, currentPhase?.autoMs, advance])

  const handleTap = () => {
    if (isComplete) return
    if (timerRef.current) clearTimeout(timerRef.current)
    advance()
  }

  // Current intermediate price for the price story
  const storyPrice = useMemo(() => {
    if (currentPhase?.id === 'starting') return result?.package_price ?? 0
    if (currentPhase?.id?.startsWith('discount_')) {
      const idx = parseInt(currentPhase.id.replace('discount_', ''))
      return discountSteps[idx]?.priceAfter ?? result?.package_price ?? 0
    }
    return result?.package_price ?? 0
  }, [currentPhase, discountSteps, result])

  const storyPriceBefore = useMemo(() => {
    if (currentPhase?.id?.startsWith('discount_')) {
      const idx = parseInt(currentPhase.id.replace('discount_', ''))
      return discountSteps[idx]?.priceBefore ?? null
    }
    return null
  }, [currentPhase, discountSteps])

  const currentDiscount = useMemo(() => {
    if (!currentPhase?.id?.startsWith('discount_')) return null
    const idx = parseInt(currentPhase.id.replace('discount_', ''))
    return discountSteps[idx] ?? null
  }, [currentPhase, discountSteps])

  const showPriceStory = ['starting', ...discountSteps.map((_, i) => `discount_${i}`)].includes(currentPhase?.id ?? '')

  const hasFinancing = pricing && pricing.financing !== 'none' && result && result.monthly_payment > 0
  const hasCostco = pricing?.costco_revealed && result && (result.costco_member_savings > 0 || result.costco_exec_savings > 0)
  const hasYouSaved = result && result.you_save > 0

  const fullName = [proposal.customer_first_name, proposal.customer_last_name].filter(Boolean).join(' ')
    || proposal.customer_name || ''
  const addressLine = [proposal.customer_address, proposal.customer_city, proposal.customer_state]
    .filter(Boolean).join(', ')

  return (
    // Full-screen overlay — covers bottom nav and everything
    <div
      className="fixed inset-0 z-[200] overflow-y-auto flex flex-col"
      style={{ background: '#000', color: '#fff' }}
      onClick={!isComplete && !isFinal ? handleTap : undefined}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-safe-top pt-8 pb-4 flex-shrink-0"
        style={{ paddingTop: 'max(32px, env(safe-area-inset-top, 0px) + 16px)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <AnimatePresence>
            {phaseIdx >= 1 && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                SalesPro
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {/* Done */}
        {backHref ? (
          <Link href={backHref} className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}
            onClick={e => e.stopPropagation()}>
            Done
          </Link>
        ) : (
          <button type="button" className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}
            onClick={e => { e.stopPropagation(); window.history.back() }}>
            Done
          </button>
        )}
      </div>

      {/* Main stage */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">

        {/* PHASE: logo */}
        <AnimatePresence>
          {phaseIdx === 0 && (
            <motion.div key="logo-phase" className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </motion.div>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-xl font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  SalesPro
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE: address */}
        <AnimatePresence>
          {phaseIdx === 1 && addressLine && (
            <motion.div key="address-phase" className="absolute inset-0 flex items-center justify-center px-8"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="text-3xl font-light tracking-tight text-center leading-snug"
                style={{ color: '#fff' }}>
                {addressLine}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE: price story (starting + discounts) */}
        <AnimatePresence mode="wait">
          {showPriceStory && (
            <motion.div key={currentPhase.id} className="w-full" style={{ maxWidth: '400px' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

              {/* Discount line draws across */}
              {currentDiscount && (
                <motion.div className="w-full mb-4"
                  style={{ height: '1px', background: 'rgba(255,255,255,0.12)', originX: 0 }}
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5 }} />
              )}

              {/* Discount label */}
              {currentDiscount && (
                <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-sm font-semibold mb-4 uppercase tracking-widest"
                  style={{ color: '#1D4ED8' }}>
                  {currentDiscount.label}
                  <span className="ml-2 text-base" style={{ color: '#34D399' }}>−{fmt(currentDiscount.amount)}</span>
                </motion.div>
              )}

              {/* Label */}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {currentDiscount ? 'Price After Discount' : 'Starting Price'}
              </motion.p>

              {/* Old price strikethrough */}
              {storyPriceBefore !== null && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  className="text-2xl mb-2" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'line-through', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(storyPriceBefore)}
                </motion.p>
              )}

              {/* Current price */}
              <motion.p
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: storyPriceBefore ? 0.4 : 0.2, duration: 0.5 }}
                style={{ fontSize: '52px', fontWeight: '700', color: '#fff', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                {fmt(storyPrice)}
              </motion.p>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Tap anywhere to continue
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE: final price reveal */}
        <AnimatePresence>
          {(isFinal || isComplete) && result && (
            <motion.div key="final" className="w-full flex flex-col items-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

              {/* "YOUR PRICE TODAY" label */}
              <motion.p
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Your Price Today
              </motion.p>

              {/* Glow */}
              <div className="absolute pointer-events-none" style={{
                width: '300px', height: '200px',
                background: 'radial-gradient(ellipse, rgba(29,78,216,0.25) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }} />

              {/* The Price */}
              <motion.p
                initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  fontSize: 'clamp(56px, 15vw, 96px)',
                  fontWeight: '800',
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                {fmt(result.your_price)}
              </motion.p>

              {/* Financing */}
              {hasFinancing && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  className="mt-4">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>or as low as</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(result.monthly_payment)}<span className="text-lg font-normal">/mo</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{FINANCING_LABELS[pricing!.financing]}</p>
                </motion.div>
              )}

              {/* Savings + breakdown (complete phase) */}
              <AnimatePresence>
                {isComplete && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="mt-8 w-full" style={{ maxWidth: '360px' }}>

                    {/* You saved */}
                    {hasYouSaved && (
                      <div className="text-center mb-4">
                        <p className="text-lg font-semibold" style={{ color: '#34D399' }}>
                          You saved {fmt(result.you_save)}
                        </p>
                        <button onClick={() => setShowBreakdown(s => !s)}
                          className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {showBreakdown ? 'Hide breakdown' : 'See breakdown'}
                        </button>
                      </div>
                    )}

                    {/* Breakdown */}
                    <AnimatePresence>
                      {showBreakdown && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden rounded-2xl px-4 py-3 mb-4"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {discountSteps.map((s, i) => (
                            <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className="flex justify-between text-sm py-1.5"
                              style={{ borderBottom: i < discountSteps.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                              <span style={{ color: '#34D399' }}>−{fmt(s.amount)}</span>
                            </motion.div>
                          ))}
                          {result.admin_fee > 0 && (
                            <div className="flex justify-between text-sm py-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Admin fee</span>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(result.admin_fee)}</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Costco */}
                    {hasCostco && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="rounded-2xl px-5 py-4 mb-4"
                        style={{ background: 'rgba(29,78,216,0.12)', border: '1px solid rgba(29,78,216,0.2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#1D4ED8' }}>
                            <span className="text-xs font-black text-white" style={{ fontSize: '9px' }}>C</span>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: '#60A5FA' }}>Costco Member Savings</span>
                        </div>
                        {result.costco_member_savings > 0 && (
                          <div className="flex justify-between text-sm">
                            <span style={{ color: '#93C5FD' }}>Member (10%)</span>
                            <span className="font-bold" style={{ color: '#60A5FA' }}>−{fmt(result.costco_member_savings)}</span>
                          </div>
                        )}
                        {result.costco_exec_savings > 0 && (
                          <div className="flex justify-between text-sm">
                            <span style={{ color: '#93C5FD' }}>Executive reward</span>
                            <span className="font-bold" style={{ color: '#60A5FA' }}>−{fmt(result.costco_exec_savings)}</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tap to see savings / Done button */}
              {isFinal && !isComplete && (
                <motion.button
                  type="button"
                  onClick={e => { e.stopPropagation(); advance() }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                  className="mt-10 px-8 py-3 rounded-full text-sm font-medium"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', background: 'transparent' }}>
                  Continue
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Done button */}
      <AnimatePresence>
        {isComplete && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex-shrink-0 flex justify-center pb-8 px-8"
            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px) + 16px)' }}>
            {backHref ? (
              <Link href={backHref}
                className="px-10 py-3 rounded-full text-sm font-medium"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}
                onClick={e => e.stopPropagation()}>
                Done
              </Link>
            ) : (
              <button type="button"
                className="px-10 py-3 rounded-full text-sm font-medium"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}
                onClick={e => { e.stopPropagation(); window.history.back() }}>
                Done
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
