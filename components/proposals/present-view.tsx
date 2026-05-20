'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  calcPrice,
  type PricingInputs,
  type DiscountOptionSetting,
  type FinancingOptionSetting,
  DEFAULT_DISCOUNT_SETTINGS,
  DEFAULT_FINANCING_SETTINGS,
} from '@/lib/pricing'
import Link from 'next/link'
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background'
import ClozrLogo from '@/components/ui/clozr-logo'
import { calculateJob, getFinancingLabel, type JobTypeConfig, type JobCalculatorResult } from '@/lib/job-calculator'

type Proposal = Record<string, any>

export interface ProposalRender {
  id: string
  image_url: string
  color_name: string | null
  color_hex: string | null
  created_at: string
}

export interface RepSettings {
  discount_options?: DiscountOptionSetting[]
  financing_options?: FinancingOptionSetting[]
}

const fmt = (n: number) => '$' + Math.round(Math.max(0, n)).toLocaleString()

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToggleState {
  promoOn: boolean
  selectedPromoId: string | null
  bnsnOn: boolean
  selectedBnsnId: string | null
  cashOn: boolean
  financingOn: boolean
  selectedFinancingId: string | null
  costcoShopOn: boolean
  costcoExecOn: boolean
}

interface CustomerPricing {
  packagePrice: number
  promoPct: number
  promoLabel: string
  promoDiscount: number
  afterPromo: number
  bnsnName: string
  bnsnPct: number
  bnsnDiscount: number
  afterBnsn: number
  cashPct: number
  cashDiscount: number
  afterCash: number
  adminFee: number
  leadPaint: number
  yourPrice: number
  memberRebate: number
  execRebate: number
  visaRebate: number
  totalRebate: number
  netAfterRebates: number
  monthlyPayment: number
  cashAvailable: boolean
  totalWindows: number
  totalSavings: number
}

// ─── Cascading pricing ────────────────────────────────────────────────────────

function calculateCustomerPricing(
  pd: PricingInputs,
  ts: ToggleState,
  promoPct: number,
  discountOpts: DiscountOptionSetting[],
  financingOpts: FinancingOptionSetting[],
): CustomerPricing {
  let packagePrice = 0
  let totalWindows = pd.num_windows ?? 0

  if (pd.proposal_type === 'siding') {
    const r = calcPrice(pd)
    return {
      packagePrice: r.package_price, promoPct: 0, promoLabel: '', promoDiscount: 0,
      afterPromo: r.package_price, bnsnName: '', bnsnPct: 0, bnsnDiscount: 0,
      afterBnsn: r.package_price, cashPct: 7, cashDiscount: 0, afterCash: r.package_price,
      adminFee: r.admin_fee, leadPaint: r.lead_paint, yourPrice: r.your_price,
      memberRebate: 0, execRebate: 0, visaRebate: 0, totalRebate: 0,
      netAfterRebates: r.your_price, monthlyPayment: 0, cashAvailable: false,
      totalWindows: 0, totalSavings: 0,
    }
  }

  if (pd.windows_project_value != null && pd.windows_project_value > 0) {
    packagePrice = pd.windows_project_value
  } else {
    for (const item of pd.line_items ?? []) {
      const rowTotal = item.qty * item.unit_price
      totalWindows += item.qty
      if (item.discountable) packagePrice += rowTotal
    }
  }

  const adminFee = pd.admin_fee_enabled ? pd.admin_fee_amount : 0
  const leadPaint = pd.lead_paint_enabled ? pd.lead_paint_amount : 0

  const selectedBnsn = (ts.bnsnOn && ts.selectedBnsnId)
    ? discountOpts.find(d => d.id === ts.selectedBnsnId)
    : null
  const isCombined = selectedBnsn?.is_combined ?? false

  const effectivePromoPct = isCombined ? 0 : promoPct
  const promoLabelText = effectivePromoPct === 20
    ? 'Spring Savings'
    : effectivePromoPct === 25
    ? 'Preferred Customer Savings'
    : effectivePromoPct > 0
    ? `${effectivePromoPct}% Package Discount`
    : ''

  const promoDiscount = Math.floor(packagePrice * effectivePromoPct / 100)
  const afterPromo = packagePrice - promoDiscount

  const bnsnPct = selectedBnsn?.pct ?? 0
  const bnsnDiscount = (ts.bnsnOn && selectedBnsn) ? Math.floor(afterPromo * bnsnPct / 100) : 0
  const afterBnsn = afterPromo - bnsnDiscount

  const cashOpt = discountOpts.find(d => d.type === 'cash' && d.active)
  const cashPct = cashOpt?.pct ?? 7

  const selectedFin = (ts.financingOn && ts.selectedFinancingId)
    ? financingOpts.find(f => f.id === ts.selectedFinancingId)
    : null
  const cashAvailable = !selectedFin || selectedFin.id === '9.99_10yr'

  const cashDiscount = (ts.cashOn && cashAvailable) ? Math.floor(afterBnsn * cashPct / 100) : 0
  const afterCash = afterBnsn - cashDiscount

  const yourPrice = afterCash + adminFee + leadPaint

  const memberRebate = (ts.costcoShopOn && pd.costco_member) ? afterCash * 0.10 : 0
  const execRebate = (ts.costcoExecOn && pd.costco_executive) ? Math.min(afterCash * 0.02, 1250) : 0
  const visaRebate = (pd.costco_city_visa_enabled && pd.costco_city_visa_amount)
    ? Math.floor(pd.costco_city_visa_amount * 0.02)
    : 0
  const totalRebate = memberRebate + execRebate + visaRebate

  let monthlyPayment = 0
  if (selectedFin && ts.financingOn) {
    if (selectedFin.method === 'factor' && selectedFin.factor) monthlyPayment = yourPrice * selectedFin.factor
    else if (selectedFin.method === 'months' && selectedFin.months) monthlyPayment = yourPrice / selectedFin.months
  }

  return {
    packagePrice, promoPct: effectivePromoPct, promoLabel: promoLabelText,
    promoDiscount, afterPromo,
    bnsnName: selectedBnsn?.name ?? '', bnsnPct, bnsnDiscount, afterBnsn,
    cashPct, cashDiscount, afterCash,
    adminFee, leadPaint, yourPrice,
    memberRebate, execRebate, visaRebate, totalRebate,
    netAfterRebates: yourPrice - totalRebate,
    monthlyPayment, cashAvailable, totalWindows,
    totalSavings: promoDiscount + bnsnDiscount + cashDiscount,
  }
}

// ─── Initialize toggle state from saved proposal ──────────────────────────────

function initToggleState(
  pd: PricingInputs,
  discountOpts: DiscountOptionSetting[],
  financingOpts: FinancingOptionSetting[],
): ToggleState {
  type StoredTs = { promotion?: string | null; bnsn?: string | null; cash_incentive?: boolean }

  const fromStoredTs = (sts: StoredTs): ToggleState => {
    const isCombined = sts.bnsn === '30_combined'
    const promoPct = sts.promotion === '20_off' ? 20 : sts.promotion === '25_off' ? 25 : null
    const bnsnPct = sts.bnsn === '10_off' ? 10 : sts.bnsn === '5_off' ? 5 : sts.bnsn === '30_combined' ? 30 : null
    const selectedPromoId = promoPct
      ? (discountOpts.find(d => d.type === 'promotion' && d.pct === promoPct && d.active)?.id ?? null)
      : null
    const selectedBnsnId = bnsnPct
      ? (discountOpts.find(d => d.type === 'bnsn' && d.pct === bnsnPct && (isCombined ? !!d.is_combined : !d.is_combined) && d.active)?.id ?? null)
      : null
    return {
      promoOn: !!sts.promotion || isCombined,
      selectedPromoId: isCombined ? null : selectedPromoId,
      bnsnOn: !!sts.bnsn,
      selectedBnsnId,
      cashOn: !!sts.cash_incentive,
      financingOn: false,
      selectedFinancingId: null,
      costcoShopOn: false,
      costcoExecOn: false,
    }
  }

  const storedTs = (pd as any).toggle_state as StoredTs | undefined
  if (storedTs) return fromStoredTs(storedTs)

  if ((pd as any).vendo_imported) {
    const pkgPrice = pd.windows_project_value || (pd as any).package_price || 0
    const adminFeeAmt = pd.admin_fee_enabled ? (pd.admin_fee_amount || 850) : 0
    const storedYourPrice = (pd as any).your_price || 0
    const discBase = pkgPrice - adminFeeAmt
    if (discBase > 0 && storedYourPrice > 0) {
      const pct = Math.round(((pkgPrice - storedYourPrice) / discBase) * 100)
      let derived: StoredTs | null = null
      if (pct >= 36 && pct <= 38)      derived = { promotion: '20_off', bnsn: '10_off', cash_incentive: true }
      else if (pct >= 29 && pct <= 31) derived = { promotion: '20_off', bnsn: '10_off', cash_incentive: false }
      else if (pct >= 26 && pct <= 28) derived = { promotion: '20_off', bnsn: null, cash_incentive: true }
      else if (pct === 25)             derived = { promotion: '25_off', bnsn: null, cash_incentive: false }
      else if (pct === 20)             derived = { promotion: '20_off', bnsn: null, cash_incentive: false }
      if (derived) return fromStoredTs(derived)
    }
  }

  const isCombined = pd.bnsn === '30_combined' || !!pd.bnsn_is_combined
  const hasPromo = (pd.promotion != null && pd.promotion !== 'none') || (pd.promotion_pct != null && pd.promotion_pct > 0)
  const hasBnsn = pd.bnsn !== 'none' || (pd.bnsn_pct != null && pd.bnsn_pct > 0)

  let selectedPromoId: string | null = null
  if (hasPromo && !isCombined) {
    const pct = pd.promotion_pct ?? (pd.promotion === '20_off' ? 20 : pd.promotion === '25_off' ? 25 : 0)
    selectedPromoId =
      discountOpts.find(d => d.type === 'promotion' && d.pct === pct && d.active)?.id ??
      discountOpts.find(d => d.type === 'promotion' && d.active)?.id ?? null
  }

  let selectedBnsnId: string | null = null
  if (hasBnsn) {
    if (isCombined) {
      const pct = pd.bnsn_pct ?? 30
      selectedBnsnId =
        discountOpts.find(d => d.type === 'bnsn' && d.is_combined && d.pct === pct && d.active)?.id ??
        discountOpts.find(d => d.type === 'bnsn' && d.is_combined && d.active)?.id ?? null
    } else {
      const pct = pd.bnsn_pct ?? (pd.bnsn === '10_off' ? 10 : pd.bnsn === '5_off' ? 5 : 0)
      selectedBnsnId =
        discountOpts.find(d => d.type === 'bnsn' && !d.is_combined && d.pct === pct && d.active)?.id ?? null
    }
  }

  let selectedFinancingId: string | null = null
  if (pd.financing !== 'none') {
    const fid = pd.selected_financing_id ?? pd.financing
    selectedFinancingId = financingOpts.find(f => f.id === fid && f.active)?.id ?? null
  }

  return {
    promoOn: hasPromo || isCombined,
    selectedPromoId: isCombined ? null : selectedPromoId,
    bnsnOn: hasBnsn,
    selectedBnsnId,
    cashOn: pd.cash_incentive ?? false,
    financingOn: pd.financing !== 'none',
    selectedFinancingId,
    costcoShopOn: pd.costco_revealed ?? false,
    costcoExecOn: !!(pd.costco_executive && pd.costco_revealed),
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.09)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '20px',
}

const s = (i: number) => ({ duration: 0.4, ease: 'easeOut' as const, delay: i * 0.07 })

// ─── Helper components ────────────────────────────────────────────────────────

function CardGlow({ color }: { color: string }) {
  return (
    <div style={{
      position: 'absolute', inset: '-8px', borderRadius: '28px',
      background: `radial-gradient(circle at 50% 0%, ${color} 0%, transparent 70%)`,
      opacity: 0.15, filter: 'blur(12px)', zIndex: 0, pointerEvents: 'none',
    }} />
  )
}

function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{
      fontSize: '10px', color: color ?? 'rgba(255,255,255,0.45)',
      letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px',
    }}>
      {children}
    </p>
  )
}

function BreakdownRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span style={{ fontSize: '13px', color: color ?? 'rgba(255,255,255,0.5)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: color ?? 'rgba(255,255,255,0.7)', fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  )
}

function BigToggle({ on, onToggle, label, disabled }: {
  on: boolean; onToggle: () => void; label: string; disabled?: boolean
}) {
  return (
    <button type="button" onClick={disabled ? undefined : onToggle}
      className="w-full flex items-center justify-between"
      style={{ minHeight: '44px', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer' }}>
      <span style={{ fontSize: '16px', fontWeight: 600, color: on ? '#F9FAFB' : 'rgba(255,255,255,0.55)' }}>
        {label}
      </span>
      <div style={{
        position: 'relative', flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px',
        background: on ? '#1D4ED8' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: '3px', width: '22px', height: '22px', borderRadius: '50%',
          background: '#fff', left: on ? '27px' : '3px', transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      </div>
    </button>
  )
}

function RadioOption({ selected, onSelect, label, rightLabel, badge }: {
  selected: boolean; onSelect: () => void; label: string; rightLabel?: string; badge?: string
}) {
  return (
    <button type="button" onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: selected ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.03)',
        border: selected ? '1px solid rgba(29,78,216,0.35)' : '1px solid rgba(255,255,255,0.07)',
        textAlign: 'left', minHeight: '44px',
      }}>
      <div style={{
        flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%',
        border: selected ? '2px solid #3B82F6' : '2px solid rgba(255,255,255,0.2)',
        background: selected ? '#3B82F6' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
      </div>
      <span style={{ flex: 1, fontSize: '14px', color: selected ? '#F9FAFB' : 'rgba(255,255,255,0.7)', fontWeight: selected ? 500 : 400 }}>
        {label}
        {badge && (
          <span style={{ marginLeft: '8px', fontSize: '10px', color: '#2DD4BF', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            {badge}
          </span>
        )}
      </span>
      {rightLabel && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#06B6D4', fontWeight: 600, flexShrink: 0 }}>
          {rightLabel}
        </span>
      )}
    </button>
  )
}

function NewPriceRow({ value }: { value: number }) {
  return (
    <div className="flex justify-between items-center mt-3 pt-3"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        New Price
      </span>
      <motion.span
        key={Math.round(value)}
        initial={{ opacity: 0.6, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', color: '#F9FAFB', fontWeight: 700 }}>
        {fmt(value)}
      </motion.span>
    </div>
  )
}

// ─── Job Builder Present View ─────────────────────────────────────────────────

function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevRef.current === value) return
    const from = prevRef.current
    const to = value
    prevRef.current = value
    const startTime = { v: null as number | null }
    const dur = 600
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const tick = (now: number) => {
      if (startTime.v === null) startTime.v = now
      const p = Math.min((now - startTime.v) / dur, 1)
      setDisplay(Math.round(from + (to - from) * ease(p)))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 'clamp(40px, 9vw, 72px)', fontWeight: 800, lineHeight: 1,
      letterSpacing: '-0.02em',
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    }}>
      ${display.toLocaleString()}
    </span>
  )
}

function JobBuilderPresentView({ proposal, config, calcResult, backHref }: {
  proposal: Proposal
  config: JobTypeConfig
  calcResult: JobCalculatorResult
  backHref?: string
}) {
  const rawPd = proposal.pricing_data || {}

  const [cashEnabled, setCashEnabled] = useState<boolean>(rawPd.cash_enabled ?? false)
  const [selectedFinancingId, setSelectedFinancingId] = useState<string | null>(rawPd.financing_id ?? null)
  const [finDropOpen, setFinDropOpen] = useState(false)
  const [currentScreen, setCurrentScreen] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [confirmPrice, setConfirmPrice] = useState<number | null>(null)
  const [costcoExpanded, setCostcoExpanded] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)

  const touchStartX = useRef<number | null>(null)
  const finDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (finDropRef.current && !finDropRef.current.contains(e.target as Node)) {
        setFinDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const liveResult = useMemo(() => {
    try {
      return calculateJob(config, {
        base_price: rawPd.base_price ?? 0,
        enabled_tier_ids: rawPd.enabled_tier_ids ?? [],
        cash_enabled: cashEnabled,
        financing_id: selectedFinancingId,
        charged_amount: rawPd.charged_amount ?? 0,
      })
    } catch { return calcResult }
  }, [config, cashEnabled, selectedFinancingId, calcResult, rawPd])

  const screens = useMemo(() => {
    const s: string[] = ['intro']
    calcResult.tiers_applied.forEach((_, i) => s.push(`tier_${i}`))
    if (config.cash_incentive?.enabled) s.push('cash')
    s.push('summary')
    return s
  }, [calcResult.tiers_applied, config.cash_incentive?.enabled])

  const safeScreen = Math.min(currentScreen, screens.length - 1)
  const screen = screens[safeScreen]

  const goNext = () => { if (safeScreen < screens.length - 1) { setDirection(1); setCurrentScreen(safeScreen + 1) } }
  const goPrev = () => { if (safeScreen > 0) { setDirection(-1); setCurrentScreen(safeScreen - 1) } }

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (confirmPrice !== null) return
    if (finDropOpen) { setFinDropOpen(false); return }
    const rect = e.currentTarget.getBoundingClientRect()
    if ((e.clientX - rect.left) / rect.width < 0.35) goPrev(); else goNext()
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) > 40) { if (dx < 0) goNext(); else goPrev() }
  }

  const handleAcceptSend = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signed', lead_id: proposal.lead_id }),
      })
      if (res.ok) {
        const confetti = (await import('canvas-confetti')).default
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#34D399', '#6ee7b7', '#ffffff'] })
        setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 300)
        setConfirmPrice(null)
        setActionDone('Accepted! 🎉')
        setTimeout(() => setActionDone(null), 4000)
      }
    } finally { setSending(false) }
  }

  const first = proposal.customer_first_name || proposal.customer_name?.split(' ')[0] || ''
  const hasRebate = !!(config.rebate_program?.enabled && (liveResult.total_rebate ?? 0) > 0)
  const rebateName = config.rebate_program?.name ?? 'Member'
  const selectedFin = selectedFinancingId ? (config.financing_options ?? []).find(f => f.id === selectedFinancingId) : null
  const totalSavings = liveResult.total_discount_amount + liveResult.cash_discount

  // Tier screen derived values
  const tierIdx = screen.startsWith('tier_') ? parseInt(screen.split('_')[1], 10) : -1
  const tiersUpTo = tierIdx >= 0 ? calcResult.tiers_applied.slice(0, tierIdx + 1) : []
  const tierDiscountTotal = tiersUpTo.reduce((sum, t) => sum + t.amount, 0)
  const tierPrice = tierIdx >= 0 ? calcResult.base_price - tierDiscountTotal + config.admin_fee : 0
  const isLastTierScreen = tierIdx >= 0 && tierIdx === calcResult.tiers_applied.length - 1

  const premiumCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px',
  }

  const slideVariants = {
    enter: (d: number) => ({ x: `${d * 100}%`, opacity: 0 }),
    center: { x: '0%', opacity: 1 },
    exit: (d: number) => ({ x: `${-d * 100}%`, opacity: 0 }),
  }

  return (
    <div
      className="fixed inset-0 z-[200]"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d2137 25%, #0a3d2e 50%, #0d2137 75%, #0f172a 100%)', color: '#fff', userSelect: 'none' }}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>

      {/* Exit */}
      {backHref ? (
        <Link href={backHref} className="fixed z-[300] flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
          style={{ top: 'max(20px, env(safe-area-inset-top, 0px) + 12px)', right: '20px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
          onClick={e => e.stopPropagation()}>×</Link>
      ) : (
        <button type="button" className="fixed z-[300] flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
          style={{ top: 'max(20px, env(safe-area-inset-top, 0px) + 12px)', right: '20px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
          onClick={e => { e.stopPropagation(); window.history.back() }}>×</button>
      )}


      {/* Screens */}
      <div className="fixed inset-0 overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div key={screen}
            custom={direction} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ type: 'tween', duration: 0.28, ease: 'easeInOut' }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
            style={{ paddingTop: '80px', paddingBottom: '140px' }}>

            {/* ── INTRO ── */}
            {screen === 'intro' && (
              <div className="text-center max-w-sm w-full">
                {config.icon && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
                    style={{ fontSize: '64px', marginBottom: '20px' }}>{config.icon}</motion.div>
                )}
                <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  style={{ fontSize: 'clamp(22px, 5vw, 38px)', fontWeight: 800, color: '#fff', letterSpacing: '0.03em', marginBottom: '20px' }}>
                  Your Investment
                </motion.h2>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  {first && (
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '48px', fontWeight: 800, color: 'white', letterSpacing: '-1px', display: 'block' }}>{first}</span>
                    </div>
                  )}
                  <AnimatedPrice value={calcResult.base_price + config.admin_fee} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  style={{ ...premiumCard, padding: '16px 20px', marginTop: '24px', textAlign: 'left' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {config.name}
                  </p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                    Premium installation with professional-grade materials and a certified installation team.
                  </p>
                </motion.div>
                {hasRebate && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                    style={{ ...premiumCard, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', padding: '10px 16px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>🏷️</span>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{rebateName} rebates available</p>
                  </motion.div>
                )}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                  style={{ marginTop: '28px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                  Tap to continue →
                </motion.p>
              </div>
            )}

            {/* ── TIER SCREENS ── */}
            {screen.startsWith('tier_') && (
              <div className="max-w-sm w-full">
                <div style={{ ...premiumCard, padding: '20px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }}>
                    Price Breakdown
                  </p>
                  <BreakdownRow label="Original Price" value={fmt(calcResult.base_price + config.admin_fee)} />
                  {tiersUpTo.map(t => (
                    <BreakdownRow key={t.id} label={`${t.name} (${t.pct}%)`} value={`-${fmt(t.amount)}`} color="#10b981" />
                  ))}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '10px', paddingTop: '10px' }}>
                    <BreakdownRow label="Your Price" value={fmt(tierPrice)} bold color="#fff" />
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  {first && (
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '48px', fontWeight: 800, color: 'white', letterSpacing: '-1px', display: 'block' }}>{first}</span>
                    </div>
                  )}
                  <AnimatedPrice value={tierPrice} />
                  <motion.p key={Math.round(tierDiscountTotal)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: '18px', fontWeight: 600, color: '#10b981', marginTop: '8px' }}>
                    You save {fmt(tierDiscountTotal)}
                  </motion.p>
                </div>

                {isLastTierScreen && (config.financing_options ?? []).length > 0 && (
                  <div ref={finDropRef} style={{ position: 'relative', marginBottom: '12px' }} onClick={e => e.stopPropagation()}>
                    <button type="button"
                      style={{ width: '100%', height: '44px', padding: '0 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#F9FAFB', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      onClick={() => setFinDropOpen(v => !v)}>
                      <span style={{ color: selectedFin ? '#F9FAFB' : 'rgba(255,255,255,0.4)' }}>
                        {selectedFin ? getFinancingLabel(selectedFin) : 'Select financing…'}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ transform: finDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {finDropOpen && (
                        <motion.div initial={{ opacity: 0, scaleY: 0.95, y: -4 }} animate={{ opacity: 1, scaleY: 1, y: 0 }}
                          exit={{ opacity: 0, scaleY: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                          style={{ position: 'absolute', top: '48px', left: 0, right: 0, zIndex: 50, background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', transformOrigin: 'top' }}>
                          <button type="button"
                            style={{ width: '100%', padding: '12px 14px', textAlign: 'left', fontSize: '14px', color: !selectedFinancingId ? '#60A5FA' : 'rgba(255,255,255,0.5)', background: !selectedFinancingId ? 'rgba(29,78,216,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                            onClick={() => { setSelectedFinancingId(null); setFinDropOpen(false) }}>
                            No financing
                          </button>
                          {(config.financing_options ?? []).map(fin => (
                            <button key={fin.id} type="button"
                              style={{ width: '100%', padding: '12px 14px', textAlign: 'left', fontSize: '14px', color: fin.id === selectedFinancingId ? '#60A5FA' : '#F9FAFB', background: fin.id === selectedFinancingId ? 'rgba(29,78,216,0.12)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              onClick={() => { setSelectedFinancingId(fin.id); setFinDropOpen(false) }}>
                              {getFinancingLabel(fin)}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {liveResult.monthly_payment && liveResult.monthly_payment > 0 && (
                      <motion.p key={liveResult.monthly_payment} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                        As low as{' '}
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#60A5FA', fontWeight: 700 }}>{fmt(liveResult.monthly_payment)}/mo</span>
                      </motion.p>
                    )}
                  </div>
                )}

                <button type="button"
                  onClick={e => { e.stopPropagation(); setConfirmPrice(tierPrice) }}
                  style={{ width: '100%', height: '48px', background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '12px', color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                  Send Job
                </button>
              </div>
            )}

            {/* ── CASH SCREEN ── */}
            {screen === 'cash' && (
              <div className="max-w-sm w-full">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    {config.cash_incentive?.label ?? 'Cash Incentive'}
                  </p>
                  {first && (
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '48px', fontWeight: 800, color: 'white', letterSpacing: '-1px', display: 'block' }}>{first}</span>
                    </div>
                  )}
                  <AnimatedPrice value={liveResult.customer_price} />
                  {cashEnabled && liveResult.cash_discount > 0 && (
                    <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: '18px', fontWeight: 600, color: '#10b981', marginTop: '8px' }}>
                      You save {fmt(liveResult.total_discount_amount + liveResult.cash_discount)}
                    </motion.p>
                  )}
                </div>
                <div style={{ ...premiumCard, padding: '20px', marginBottom: '14px' }} onClick={e => e.stopPropagation()}>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '16px', textAlign: 'center', lineHeight: 1.5 }}>
                    Save an additional {config.cash_incentive?.pct ?? 0}% by paying with cash or check today.
                  </p>
                  <BigToggle
                    on={cashEnabled}
                    onToggle={() => setCashEnabled(v => !v)}
                    label={cashEnabled ? `${config.cash_incentive?.label ?? 'Cash'} Applied ✓` : `Apply ${config.cash_incentive?.label ?? 'Cash Incentive'}`}
                  />
                  {cashEnabled && liveResult.cash_discount > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      style={{ overflow: 'hidden', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <BreakdownRow label={`${config.cash_incentive?.pct ?? 0}% cash savings`} value={`-${fmt(liveResult.cash_discount)}`} color="#10b981" />
                    </motion.div>
                  )}
                </div>
                <button type="button"
                  onClick={e => { e.stopPropagation(); setConfirmPrice(liveResult.customer_price) }}
                  style={{ width: '100%', height: '48px', background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '12px', color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                  Send Job
                </button>
              </div>
            )}

            {/* ── SUMMARY SCREEN ── */}
            {screen === 'summary' && (
              <div className="max-w-sm w-full">
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Your Price
                  </p>
                  {first && (
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '48px', fontWeight: 800, color: 'white', letterSpacing: '-1px', display: 'block' }}>{first}</span>
                    </div>
                  )}
                  <AnimatedPrice value={liveResult.customer_price} />
                  {totalSavings > 0 && (
                    <motion.p key={Math.round(totalSavings)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: '18px', fontWeight: 600, color: '#10b981', marginTop: '8px' }}>
                      You save {fmt(totalSavings)}
                    </motion.p>
                  )}
                  {liveResult.monthly_payment && liveResult.monthly_payment > 0 && (
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
                      Or as low as{' '}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#60A5FA', fontWeight: 700 }}>{fmt(liveResult.monthly_payment)}/mo</span>
                    </p>
                  )}
                </div>

                <div style={{ ...premiumCard, padding: '18px 20px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Full Breakdown
                  </p>
                  <BreakdownRow label="Original Price" value={fmt(calcResult.base_price + config.admin_fee)} />
                  {liveResult.tiers_applied.map(t => (
                    <BreakdownRow key={t.id} label={`${t.name} (${t.pct}%)`} value={`-${fmt(t.amount)}`} color="#10b981" />
                  ))}
                  {liveResult.hidden_tier_amount > 0 && (
                    <BreakdownRow label="Additional Discount" value={`-${fmt(liveResult.hidden_tier_amount)}`} color="#10b981" />
                  )}
                  {liveResult.cash_discount > 0 && (
                    <BreakdownRow label={`${config.cash_incentive?.label ?? 'Cash'} (${config.cash_incentive?.pct ?? 0}%)`} value={`-${fmt(liveResult.cash_discount)}`} color="#10b981" />
                  )}
                  {liveResult.financing_fee > 0 && (
                    <BreakdownRow label="Financing Fee" value={`+${fmt(liveResult.financing_fee)}`} color="#FCD34D" />
                  )}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '10px', paddingTop: '10px' }}>
                    <BreakdownRow label="Your Price" value={fmt(liveResult.customer_price)} bold color="#fff" />
                  </div>
                </div>

                {hasRebate && (
                  <div style={{ ...premiumCard, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', padding: '18px 20px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                      {rebateName} Benefits
                    </p>
                    {(liveResult.rebates ?? []).filter(r => r.amount > 0).map(r => (
                      <BreakdownRow key={r.id} label={r.name} value={fmt(r.amount)} color="#F59E0B" />
                    ))}
                    <div style={{ borderTop: '1px solid rgba(251,191,36,0.12)', marginTop: '10px', paddingTop: '10px' }}>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#F9FAFB' }}>Net After Rebates</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', color: '#FCD34D', fontWeight: 700 }}>
                          {fmt(liveResult.customer_price - (liveResult.total_rebate ?? 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button type="button"
                  onClick={e => { e.stopPropagation(); setConfirmPrice(liveResult.customer_price) }}
                  style={{ width: '100%', height: '56px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '17px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
                  Accept & Send
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Costco compact box — tier + cash screens only */}
      {hasRebate && (screen.startsWith('tier_') || screen === 'cash') && (
        <div onClick={e => { e.stopPropagation(); setCostcoExpanded(v => !v) }}
          className="fixed z-[200]"
          style={{ bottom: '100px', right: '20px', cursor: 'pointer' }}>
          <AnimatePresence mode="wait">
            {costcoExpanded ? (
              <motion.div key="exp"
                initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }} transition={{ duration: 0.15 }}
                style={{ background: 'rgba(12,16,32,0.96)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '14px', padding: '14px', width: '200px' }}>
                <p style={{ fontSize: '10px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  {rebateName}
                </p>
                {(liveResult.rebates ?? []).filter(r => r.amount > 0).map(r => (
                  <div key={r.id} className="flex justify-between" style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{r.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FCD34D', fontWeight: 600 }}>{fmt(r.amount)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(251,191,36,0.12)', marginTop: '8px', paddingTop: '8px' }}>
                  <div className="flex justify-between">
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Net after rebates</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#FCD34D', fontWeight: 700 }}>
                      {fmt(liveResult.customer_price - (liveResult.total_rebate ?? 0))}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="col"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', borderRadius: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🏷️</span>
                <div>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', lineHeight: 1, marginBottom: '2px' }}>{rebateName}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#FCD34D', fontWeight: 700, lineHeight: 1 }}>
                    -{fmt(liveResult.total_rebate ?? 0)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tap arrows */}
      {safeScreen > 0 && (
        <div className="fixed left-0 inset-y-0 z-10 flex items-center pl-3" style={{ width: '35%', pointerEvents: 'none' }}>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} transition={{ delay: 0.5 }} style={{ fontSize: '22px' }}>‹</motion.span>
        </div>
      )}
      {safeScreen < screens.length - 1 && (
        <div className="fixed right-0 inset-y-0 z-10 flex items-center justify-end pr-3" style={{ width: '35%', pointerEvents: 'none' }}>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} transition={{ delay: 0.5 }} style={{ fontSize: '22px' }}>›</motion.span>
        </div>
      )}

      {/* Progress dots */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center px-4 pt-3"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))', background: 'rgba(10,13,26,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-2">
          {screens.map((_, i) => (
            <div key={i} style={{ borderRadius: '999px', width: i === safeScreen ? '20px' : '6px', height: '6px', background: i === safeScreen ? '#10b981' : 'rgba(255,255,255,0.2)', transition: 'all 0.25s ease' }} />
          ))}
        </div>
        <AnimatePresence>
          {actionDone && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ color: '#10b981', fontSize: '14px', textAlign: 'center', paddingBottom: '4px' }}>
              {actionDone}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmPrice !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={e => e.stopPropagation()}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ background: 'rgba(12,16,32,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '32px 24px', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px) + 24px)', width: '100%', maxWidth: '480px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px' }}>
                Confirm Proposal
              </p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: '28px', lineHeight: 1.3 }}>
                Send proposal at <span style={{ color: '#10b981' }}>{fmt(confirmPrice)}</span>?
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmPrice(null)}
                  style={{ flex: 1, height: '52px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleAcceptSend} disabled={sending}
                  style={{ flex: 2, height: '52px', borderRadius: '12px', background: sending ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: sending ? 'default' : 'pointer', boxShadow: sending ? 'none' : '0 4px 20px rgba(16,185,129,0.4)' }}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PresentView({ proposal, backHref, repSettings, downloadPdfUrl, renders = [] }: {
  proposal: Proposal
  backHref?: string
  repSettings?: RepSettings
  downloadPdfUrl?: string
  renders?: ProposalRender[]
}) {
  const rawPd = proposal.pricing_data || {}
  const isJobBuilder = rawPd?.source === 'job_builder'
  const pricingData: PricingInputs | null = rawPd.proposal_type ? (rawPd as PricingInputs) : null

  const discountOpts = useMemo(
    () => (repSettings?.discount_options ?? DEFAULT_DISCOUNT_SETTINGS).filter(d => d.active),
    [repSettings],
  )
  const financingOpts = useMemo(
    () => (repSettings?.financing_options ?? DEFAULT_FINANCING_SETTINGS).filter(f => f.active),
    [repSettings],
  )

  const [ts, setTs] = useState<ToggleState>(() =>
    pricingData
      ? initToggleState(pricingData, discountOpts, financingOpts)
      : { promoOn: false, selectedPromoId: null, bnsnOn: false, selectedBnsnId: null, cashOn: false, financingOn: false, selectedFinancingId: null, costcoShopOn: false, costcoExecOn: false },
  )

  const promoPct = useMemo(() => {
    if (!ts.promoOn) return 0
    if (ts.selectedPromoId) {
      const opt = discountOpts.find(d => d.id === ts.selectedPromoId)
      if (opt) return opt.pct
    }
    if (pricingData?.promotion_pct) return pricingData.promotion_pct
    if (pricingData?.promotion === '20_off') return 20
    if (pricingData?.promotion === '25_off') return 25
    return 0
  }, [ts.promoOn, ts.selectedPromoId, discountOpts, pricingData])

  const pp = useMemo(
    () => pricingData ? calculateCustomerPricing(pricingData, ts, promoPct, discountOpts, financingOpts) : null,
    [pricingData, ts, promoPct, discountOpts, financingOpts],
  )

  const [booking, setBooking] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)

  const bnsnOpts = discountOpts.filter(d => d.type === 'bnsn')
  const cashOpt = discountOpts.find(d => d.type === 'cash')
  const hasCostco = !!(pricingData?.costco_member || pricingData?.costco_executive || pricingData?.costco_city_visa_enabled)

  const getMonthlyPayment = (f: FinancingOptionSetting) => {
    if (!pp) return 0
    if (f.method === 'factor' && f.factor) return pp.yourPrice * f.factor
    if (f.method === 'months' && f.months) return pp.yourPrice / f.months
    return 0
  }

  const first = proposal.customer_first_name || proposal.customer_name?.split(' ')[0] || ''
  const last = proposal.customer_last_name || proposal.customer_name?.split(' ').slice(1).join(' ') || ''
  const spouseFirst = proposal.spouse_first_name || ''
  const spouseLast = proposal.spouse_last_name || last
  const displayName = spouseFirst
    ? `${first} & ${spouseFirst} ${spouseLast}`.toUpperCase()
    : `${first} ${last}`.trim().toUpperCase()
  const addressLine = [proposal.customer_address, proposal.customer_city, proposal.customer_state].filter(Boolean).join(', ')

  const startingSubtitle = useMemo(() => {
    if (!pricingData) return ''
    if (pricingData.proposal_type === 'siding') return 'Siding Project'
    const parts: string[] = []
    if (pricingData.num_windows) parts.push(`${pricingData.num_windows} Window${pricingData.num_windows !== 1 ? 's' : ''}`)
    if (pricingData.num_doors) parts.push(`${pricingData.num_doors} Door${pricingData.num_doors !== 1 ? 's' : ''}`)
    if (parts.length) return parts.join(', ')
    const n = pp?.totalWindows ?? 0
    return n > 0 ? `For ${n} Window${n !== 1 ? 's' : ''}` : ''
  }, [pricingData, pp?.totalWindows])

  // Toggle handlers
  const toggleBnsn = () => setTs(prev => ({ ...prev, bnsnOn: !prev.bnsnOn, ...(!prev.bnsnOn ? {} : { cashOn: false }) }))
  const selectBnsn = (id: string) => setTs(prev => ({ ...prev, bnsnOn: true, selectedBnsnId: id }))

  const toggleCash = () => setTs(prev => {
    const fin = (prev.financingOn && prev.selectedFinancingId)
      ? financingOpts.find(f => f.id === prev.selectedFinancingId) : null
    const avail = !fin || fin.id === '9.99_10yr'
    if (!avail) return prev
    return { ...prev, cashOn: !prev.cashOn }
  })

  const toggleFinancing = () => setTs(prev => ({ ...prev, financingOn: !prev.financingOn }))
  const selectFinancing = (id: string | null) => setTs(prev => {
    const newTs = { ...prev, financingOn: true, selectedFinancingId: id }
    if (id && id !== '9.99_10yr') return { ...newTs, cashOn: false }
    return newTs
  })

  const toggleCostcoShop = () => setTs(prev => ({ ...prev, costcoShopOn: !prev.costcoShopOn }))
  const toggleCostcoExec = () => setTs(prev => ({ ...prev, costcoExecOn: !prev.costcoExecOn }))

  // Job Builder path — branch after all hooks
  if (isJobBuilder) {
    const snapshot = proposal.job_type_snapshot as JobTypeConfig | null
    let calcResult = (rawPd?.calculator_result ?? null) as JobCalculatorResult | null

    if (snapshot && !calcResult) {
      try {
        calcResult = calculateJob(snapshot, {
          base_price: rawPd.base_price ?? 0,
          enabled_tier_ids: rawPd.enabled_tier_ids ?? [],
          cash_enabled: rawPd.cash_enabled ?? false,
          financing_id: rawPd.financing_id ?? null,
          charged_amount: rawPd.charged_amount ?? 0,
        })
      } catch { /* leave null */ }
    }

    if (snapshot && calcResult) {
      return (
        <JobBuilderPresentView
          proposal={proposal}
          config={snapshot}
          calcResult={calcResult}
          backHref={backHref}
        />
      )
    }

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: '#000', color: '#fff' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>No pricing data available.</p>
      </div>
    )
  }

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

  const ExitBtn = () => backHref ? (
    <Link href={backHref} className="flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
      style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}>×</Link>
  ) : (
    <button type="button" className="flex items-center justify-center w-8 h-8 rounded-full text-xl font-light"
      style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
      onClick={() => window.history.back()}>×</button>
  )

  if (!pricingData || !pp) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: '#000', color: '#fff' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>No pricing data available.</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto" style={{ background: '#000', color: '#fff' }}>
      <AnimatedGradientBackground
        gradientColors={['#000000', '#0A0F1E', '#0D1F3C', '#0A1628', '#000000']}
        gradientStops={[0, 25, 50, 75, 100]}
        Breathing={true} animationSpeed={0.008} breathingRange={3}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
        background: 'linear-gradient(to bottom, transparent, #000000)',
        pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 px-5 flex items-center justify-between"
        style={{
          paddingTop: 'max(20px, env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: '12px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ duration: 0.8 }}>
          <ClozrLogo variant="icon" height={28} />
        </motion.div>
        <div className="flex items-center gap-2">
          {downloadPdfUrl && (
            <a href={downloadPdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
              title="Download PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          )}
          <ExitBtn />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4 px-4 pt-2 max-w-sm mx-auto"
        style={{ paddingBottom: '120px' }}>

        {/* ── HERO: Name + Address ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(0)}
          style={{ textAlign: 'center', padding: '20px 8px 8px' }}>
          <h1 style={{
            fontSize: 'clamp(22px, 5vw, 42px)', fontWeight: 800, color: '#fff',
            letterSpacing: '0.05em', lineHeight: 1.15, marginBottom: '6px',
          }}>
            {displayName}
          </h1>
          {addressLine && (
            <p className="uppercase" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: '4px' }}>
              {addressLine}
            </p>
          )}
          {startingSubtitle && (
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{startingSubtitle}</p>
          )}
        </motion.div>

        {/* ── SECTION 1: Price Breakdown ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(1)}
          style={{ position: 'relative' }}>
          <CardGlow color="rgba(255,255,255,0.3)" />
          <div style={{ ...glassCard, padding: '20px', position: 'relative', zIndex: 1 }}>
            <SectionLabel>Price Breakdown</SectionLabel>

            <BreakdownRow label="Package Price" value={fmt(pp.packagePrice)} />

            {pp.promoDiscount > 0 && (
              <BreakdownRow
                label={`${pp.promoLabel} (${pp.promoPct}%)`}
                value={`-${fmt(pp.promoDiscount)}`}
                color="#2DD4BF"
              />
            )}

            <div className="flex justify-between items-center pt-3 mt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                {pp.promoDiscount > 0 ? 'Discounted Price' : 'Starting Price'}
              </span>
              <motion.span
                key={Math.round(pp.afterPromo)}
                initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '26px', color: '#F9FAFB', fontWeight: 700 }}>
                {fmt(pp.afterPromo)}
              </motion.span>
            </div>

            {pp.adminFee > 0 && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginTop: '10px' }}>
                Includes {fmt(pp.adminFee)} admin fee — not subject to discount
              </p>
            )}
          </div>
        </motion.div>

        {/* ── SECTION 2: Additional Savings (BNSN + Cash) ── */}
        {(bnsnOpts.length > 0 || cashOpt) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(2)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(6,182,212,0.4)" />
            <div style={{ ...glassCard, border: '1px solid rgba(6,182,212,0.15)', padding: '20px', position: 'relative', zIndex: 1 }}>
              <SectionLabel>Additional Savings</SectionLabel>

              {/* BNSN */}
              {bnsnOpts.length > 0 && (
                <>
                  <BigToggle on={ts.bnsnOn} onToggle={toggleBnsn} label="Buy Now, Save Now" />
                  <AnimatePresence>
                    {ts.bnsnOn && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                        className="overflow-hidden">
                        <div className="space-y-2 mt-3">
                          {bnsnOpts.map(opt => (
                            <RadioOption
                              key={opt.id}
                              selected={ts.selectedBnsnId === opt.id}
                              onSelect={() => selectBnsn(opt.id)}
                              label={opt.name}
                              rightLabel={`-${fmt(Math.floor(pp.afterPromo * (opt.pct / 100)))}`}
                            />
                          ))}
                        </div>
                        {ts.selectedBnsnId && <NewPriceRow value={pp.afterBnsn} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Divider */}
              {bnsnOpts.length > 0 && cashOpt && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
              )}

              {/* Cash */}
              {cashOpt && (
                <>
                  <div className="flex items-center gap-3" style={{ minHeight: '44px' }}>
                    <span style={{
                      flex: 1, fontSize: '16px', fontWeight: 600,
                      color: pp.cashAvailable ? (ts.cashOn ? '#F9FAFB' : 'rgba(255,255,255,0.55)') : 'rgba(255,255,255,0.3)',
                    }}>
                      Cash Incentive (+{cashOpt.pct}%)
                    </span>
                    {ts.cashOn && pp.cashAvailable && pp.cashDiscount > 0 && (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#06B6D4', fontWeight: 600 }}>
                        -{fmt(pp.cashDiscount)}
                      </span>
                    )}
                    <div onClick={pp.cashAvailable ? toggleCash : undefined} style={{
                      position: 'relative', flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px',
                      background: (ts.cashOn && pp.cashAvailable) ? '#1D4ED8' : 'rgba(255,255,255,0.15)',
                      transition: 'background 0.2s',
                      opacity: pp.cashAvailable ? 1 : 0.4,
                      cursor: pp.cashAvailable ? 'pointer' : 'default',
                    }}>
                      <div style={{
                        position: 'absolute', top: '3px', width: '22px', height: '22px', borderRadius: '50%',
                        background: '#fff', left: (ts.cashOn && pp.cashAvailable) ? '27px' : '3px',
                        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      }} />
                    </div>
                  </div>
                  {!pp.cashAvailable && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginTop: '8px' }}>
                      Not available with selected financing
                    </p>
                  )}
                  {ts.cashOn && pp.cashAvailable && pp.cashDiscount > 0 && (
                    <NewPriceRow value={pp.afterCash} />
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── SECTION 3: Financing ── */}
        {financingOpts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(3)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(99,102,241,0.4)" />
            <div style={{ ...glassCard, border: '1px solid rgba(99,102,241,0.15)', padding: '20px', position: 'relative', zIndex: 1 }}>
              <BigToggle on={ts.financingOn} onToggle={toggleFinancing} label="Financing Options" />
              <AnimatePresence>
                {ts.financingOn && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden">
                    <div className="space-y-2 mt-3">
                      <RadioOption
                        selected={ts.selectedFinancingId === null}
                        onSelect={() => selectFinancing(null)}
                        label="Cash / Credit Card"
                      />
                      {financingOpts.map(opt => {
                        const mo = getMonthlyPayment(opt)
                        return (
                          <RadioOption
                            key={opt.id}
                            selected={ts.selectedFinancingId === opt.id}
                            onSelect={() => selectFinancing(opt.id)}
                            label={opt.label}
                            rightLabel={mo > 0 ? `${fmt(mo)}/mo` : undefined}
                            badge={opt.id === '9.99_10yr' ? '✓ Cash eligible' : undefined}
                          />
                        )
                      })}
                      {ts.selectedFinancingId && pp.monthlyPayment > 0 && (
                        <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Or as low as{' '}
                          </span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', color: '#60A5FA', fontWeight: 700 }}>
                            {fmt(pp.monthlyPayment)}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── SECTION 4: Your Price Summary ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(4)}
          style={{ position: 'relative' }}>
          <CardGlow color="rgba(29,78,216,0.5)" />
          <div style={{
            ...glassCard,
            boxShadow: '0 0 60px rgba(29,78,216,0.25), 0 0 120px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            padding: '24px 20px', position: 'relative', zIndex: 1, overflow: 'visible',
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '20px', pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 50% 100%, rgba(29,78,216,0.25) 0%, transparent 60%)',
            }} />

            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
              Your Price
            </p>

            {/* Breakdown */}
            <div className="space-y-1.5 mb-4" style={{ position: 'relative', zIndex: 1 }}>
              <BreakdownRow label="Package Price" value={fmt(pp.packagePrice)} />
              {pp.promoDiscount > 0 && (
                <BreakdownRow label={`${pp.promoLabel} (${pp.promoPct}%)`} value={`-${fmt(pp.promoDiscount)}`} color="#2DD4BF" />
              )}
              {pp.bnsnDiscount > 0 && (
                <BreakdownRow label={pp.bnsnName || `BNSN (${pp.bnsnPct}%)`} value={`-${fmt(pp.bnsnDiscount)}`} color="#2DD4BF" />
              )}
              {pp.cashDiscount > 0 && (
                <BreakdownRow label={`Cash Incentive (${pp.cashPct}%)`} value={`-${fmt(pp.cashDiscount)}`} color="#2DD4BF" />
              )}
              {pp.adminFee > 0 && (
                <BreakdownRow label="Admin Fee" value={`+${fmt(pp.adminFee)}`} />
              )}
              {pp.leadPaint > 0 && (
                <BreakdownRow label="Lead Paint Test" value={`+${fmt(pp.leadPaint)}`} />
              )}
            </div>

            {/* Final price */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', position: 'relative', zIndex: 1 }}>
              <motion.p
                key={`final-${Math.round(pp.yourPrice)}`}
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 800, lineHeight: 1, marginBottom: '12px',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #60A5FA 0%, #06B6D4 40%, #34D399 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  overflow: 'visible',
                }}>
                {fmt(pp.yourPrice)}
              </motion.p>

              {pp.totalSavings > 0 && (
                <p style={{ fontSize: '17px', fontWeight: 700, color: '#2DD4BF', marginBottom: '4px' }}>
                  Total Savings: {fmt(pp.totalSavings)}
                </p>
              )}
              {ts.financingOn && ts.selectedFinancingId && pp.monthlyPayment > 0 && (
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  Or as low as {fmt(pp.monthlyPayment)}/mo
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 5: Costco Rebates ── */}
        {hasCostco && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(5)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(251,191,36,0.4)" />
            <div style={{ ...glassCard, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', padding: '20px', position: 'relative', zIndex: 1 }}>
              <SectionLabel color="#F59E0B">Costco Member Benefits</SectionLabel>

              {/* Shop Card Toggle */}
              {pricingData.costco_member && (
                <div className="flex items-center gap-3" style={{ minHeight: '44px' }}>
                  <span style={{ flex: 1, fontSize: '16px', fontWeight: 600, color: ts.costcoShopOn ? '#F9FAFB' : 'rgba(255,255,255,0.55)' }}>
                    Costco Shop Card (10%)
                  </span>
                  {ts.costcoShopOn && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#F59E0B', fontWeight: 700 }}>
                      -{fmt(pp.memberRebate)}
                    </span>
                  )}
                  <div onClick={toggleCostcoShop} style={{
                    position: 'relative', flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px',
                    background: ts.costcoShopOn ? '#1D4ED8' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s', cursor: 'pointer',
                  }}>
                    <div style={{
                      position: 'absolute', top: '3px', width: '22px', height: '22px', borderRadius: '50%',
                      background: '#fff', left: ts.costcoShopOn ? '27px' : '3px', transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                    }} />
                  </div>
                </div>
              )}

              {/* Executive Toggle */}
              {pricingData.costco_executive && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(251,191,36,0.1)' }}>
                  <div className="flex items-center gap-3" style={{ minHeight: '44px' }}>
                    <span style={{ flex: 1, fontSize: '16px', fontWeight: 600, color: ts.costcoExecOn ? '#F9FAFB' : 'rgba(255,255,255,0.55)' }}>
                      Executive Reward (2%)
                    </span>
                    {ts.costcoExecOn && (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#F59E0B', fontWeight: 700 }}>
                        -{fmt(pp.execRebate)}
                      </span>
                    )}
                    <div onClick={toggleCostcoExec} style={{
                      position: 'relative', flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px',
                      background: ts.costcoExecOn ? '#1D4ED8' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s', cursor: 'pointer',
                    }}>
                      <div style={{
                        position: 'absolute', top: '3px', width: '22px', height: '22px', borderRadius: '50%',
                        background: '#fff', left: ts.costcoExecOn ? '27px' : '3px', transition: 'left 0.2s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      }} />
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    For Executive members · Max $1,250
                  </p>
                </div>
              )}

              {/* City Visa (display only) */}
              {pricingData.costco_city_visa_enabled && pricingData.costco_city_visa_amount && pp.visaRebate > 0 && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(251,191,36,0.1)' }}>
                  <div className="flex items-center justify-between" style={{ minHeight: '44px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#F9FAFB' }}>
                      Costco City Visa (2%)
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#F59E0B', fontWeight: 700 }}>
                      -{fmt(pp.visaRebate)}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    On {fmt(pricingData.costco_city_visa_amount)} charged
                  </p>
                </div>
              )}

              {/* Net After Rebates */}
              {pp.totalRebate > 0 && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(251,191,36,0.15)' }}>
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB' }}>Net After Costco</span>
                    <motion.span
                      key={Math.round(pp.netAfterRebates)}
                      initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '22px', color: '#FCD34D', fontWeight: 700 }}>
                      {fmt(pp.netAfterRebates)}
                    </motion.span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── RENDERS ── */}
        {renders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(6)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(139,92,246,0.4)" />
            <div style={{ ...glassCard, border: '1px solid rgba(139,92,246,0.15)', padding: '20px', position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>
                See Your Home Transformed
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: renders.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                gap: '10px',
              }}>
                {renders.map(r => (
                  <div key={r.id} style={{ borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.image_url}
                      alt={r.color_name ?? 'Visualization'}
                      style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                    />
                    {r.color_name && (
                      <div style={{ padding: '8px 10px' }}>
                        <div className="flex items-center gap-1.5">
                          {r.color_hex && (
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: r.color_hex, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0,
                            }} />
                          )}
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>{r.color_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '14px', letterSpacing: '0.08em' }}>
                Powered by Clozr AI
              </p>
            </div>
          </motion.div>
        )}

      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-3"
        style={{
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
        <AnimatePresence>
          {actionDone && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center text-sm mb-2" style={{ color: '#34D399' }}>
              {actionDone}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex gap-2 max-w-sm mx-auto">
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
            {emailing ? 'Sending…' : 'Email Proposal'}
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
      </div>
    </div>
  )
}
