'use client'

import { useState, useMemo } from 'react'
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

type Proposal = Record<string, any>

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

interface PricePoints {
  packagePrice: number
  discountableBase: number
  adminFee: number
  leadPaint: number
  totalFees: number
  priceBeforeDiscounts: number
  promoDiscount: number
  bnsnDiscount: number
  cashDiscount: number
  youSave: number
  yourPrice: number
  monthlyPayment: number
  costcoShopCard: number
  costcoExec: number
  netAfterCostco: number
  cashAvailable: boolean
  totalWindows: number
}

// ─── Pure pricing function ────────────────────────────────────────────────────

function calculatePricing(
  pd: PricingInputs,
  ts: ToggleState,
  discountOpts: DiscountOptionSetting[],
  financingOpts: FinancingOptionSetting[],
): PricePoints {
  const selectedPromo = ts.promoOn
    ? discountOpts.find(d => d.id === ts.selectedPromoId && d.type === 'promotion')
    : null
  const selectedBnsn = (ts.bnsnOn && ts.promoOn)
    ? discountOpts.find(d => d.id === ts.selectedBnsnId && d.type === 'bnsn')
    : null
  const cashOpt = discountOpts.find(d => d.type === 'cash' && d.active)
  const selectedFin = (ts.financingOn && ts.selectedFinancingId)
    ? financingOpts.find(f => f.id === ts.selectedFinancingId)
    : null
  const isCombined = selectedBnsn?.is_combined ?? false
  const cashAvailable = !selectedFin || selectedFin.id === '9.99_10yr'

  const inputs: PricingInputs = {
    ...pd,
    // Normalize: ensure calcPrice can find the package price
    line_items: pd.line_items ?? [],
    project_value: pd.project_value ?? 0,
    windows_project_value: pd.windows_project_value ?? (pd as any).package_price ?? undefined,
    promotion: (selectedPromo && !isCombined) ? '20_off' : 'none',
    promotion_pct: (selectedPromo && !isCombined) ? selectedPromo.pct : undefined,
    bnsn: isCombined ? '30_combined' : (selectedBnsn ? '10_off' : 'none'),
    bnsn_pct: selectedBnsn?.pct,
    bnsn_is_combined: isCombined || undefined,
    cash_incentive: ts.cashOn && cashAvailable,
    cash_pct: cashOpt?.pct ?? 7,
    costco_revealed: ts.costcoShopOn || ts.costcoExecOn,
    costco_member: pd.costco_member,
    costco_executive: pd.costco_executive,
    financing: 'none',
    financing_factor: selectedFin?.method === 'factor' ? selectedFin.factor : undefined,
    financing_months: selectedFin?.method === 'months' ? selectedFin.months : undefined,
    selected_financing_id: undefined,
  }

  const r = calcPrice(inputs)
  const discountableBase = r.discountable_base

  let promoDiscount = 0
  let bnsnDiscount = 0
  if (isCombined && selectedBnsn) {
    bnsnDiscount = discountableBase * (selectedBnsn.pct / 100)
  } else {
    if (selectedPromo) promoDiscount = discountableBase * (selectedPromo.pct / 100)
    if (selectedBnsn) bnsnDiscount = discountableBase * (selectedBnsn.pct / 100)
  }

  const costcoShopCard = r.your_price * 0.10
  const costcoExecutive = Math.min(r.your_price * 0.02, 1250)
  const netCostcoSavings = (ts.costcoShopOn ? costcoShopCard : 0) + (ts.costcoExecOn ? costcoExecutive : 0)

  return {
    packagePrice: r.package_price,
    discountableBase,
    adminFee: r.admin_fee,
    leadPaint: r.lead_paint,
    totalFees: r.admin_fee + r.lead_paint,
    priceBeforeDiscounts: r.package_price,
    promoDiscount,
    bnsnDiscount,
    cashDiscount: r.cash_discount,
    youSave: r.you_save,
    yourPrice: r.your_price,
    monthlyPayment: r.monthly_payment,
    costcoShopCard,
    costcoExec: costcoExecutive,
    netAfterCostco: r.your_price - netCostcoSavings,
    cashAvailable,
    totalWindows: r.total_windows,
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

  // Case 1: explicit toggle_state stored in pricing_data
  const storedTs = (pd as any).toggle_state as StoredTs | undefined
  if (storedTs) return fromStoredTs(storedTs)

  // Case 2: old-format Vendo — derive toggles from stored prices
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

  // Case 3: regular proposal — initialize from PricingInputs fields
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

function PriceBridge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-2 py-4"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <motion.span
        key={Math.round(value)}
        initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '22px', color: '#F9FAFB', fontWeight: 700 }}>
        {fmt(value)}
      </motion.span>
    </div>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function PresentView({ proposal, backHref, repSettings, downloadPdfUrl }: {
  proposal: Proposal
  backHref?: string
  repSettings?: RepSettings
  downloadPdfUrl?: string
}) {
  const rawPd = proposal.pricing_data || {}

  const pricingData: PricingInputs | null = rawPd.proposal_type
    ? (rawPd as PricingInputs)
    : null

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

  const pp = useMemo(
    () => pricingData ? calculatePricing(pricingData, ts, discountOpts, financingOpts) : null,
    [pricingData, ts, discountOpts, financingOpts],
  )

  const [booking, setBooking] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)
  const [revealedCount, setRevealedCount] = useState(1)

  // Derived option lists
  const promoOpts = discountOpts.filter(d => d.type === 'promotion')
  const bnsnOpts = discountOpts.filter(d => d.type === 'bnsn')
  const cashOpt = discountOpts.find(d => d.type === 'cash')
  const hasFees = pp ? pp.adminFee > 0 || pp.leadPaint > 0 : false
  const hasCostco = !!(pricingData?.costco_member || pricingData?.costco_executive)

  const getMonthlyPayment = (f: FinancingOptionSetting) => {
    if (!pp) return 0
    if (f.method === 'factor' && f.factor) return pp.yourPrice * f.factor
    if (f.method === 'months' && f.months) return pp.yourPrice / f.months
    return 0
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

  const cardOrder = useMemo(() => {
    const cards: string[] = ['starting_price']
    if (hasFees) { cards.push('fees'); cards.push('bridge1') }
    if (promoOpts.length > 0) cards.push('promo')
    if (bnsnOpts.length > 0) cards.push('bnsn')
    if (cashOpt) cards.push('cash')
    cards.push('bridge2')
    if (financingOpts.length > 0) cards.push('financing')
    if (hasCostco) cards.push('costco')
    cards.push('final_price')
    return cards
  }, [hasFees, promoOpts.length, bnsnOpts.length, cashOpt, financingOpts.length, hasCostco])

  const totalCards = cardOrder.length
  const fullyRevealed = revealedCount >= totalCards
  const handleTap = () => {
    console.log('TAP', revealedCount, 'of', totalCards, 'revealed:', fullyRevealed)
    setRevealedCount(c => Math.min(c + 1, totalCards))
  }
  const shown = (id: string) => {
    const idx = cardOrder.indexOf(id)
    return idx !== -1 && idx < revealedCount
  }

  // Toggle handlers
  const togglePromo = () => setTs(prev => {
    if (prev.promoOn) return { ...prev, promoOn: false, bnsnOn: false, selectedBnsnId: null, cashOn: false }
    return { ...prev, promoOn: true }
  })
  const selectPromo = (id: string) => setTs(prev => ({ ...prev, promoOn: true, selectedPromoId: id }))

  const toggleBnsn = () => setTs(prev => {
    if (!prev.promoOn) return prev
    if (prev.bnsnOn) return { ...prev, bnsnOn: false, cashOn: false }
    return { ...prev, bnsnOn: true }
  })
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
        position: 'absolute',
        bottom: 0, left: 0, right: 0, height: '120px',
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

      {/* Card stack */}
      <div className="relative z-10 flex flex-col gap-3 px-4 py-4 max-w-sm mx-auto"
        style={{ paddingBottom: '120px' }}>

        {/* ── CARD 1: STARTING PRICE ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(0)}
          style={{ position: 'relative' }}>
          <CardGlow color="rgba(255,255,255,0.3)" />
          <div style={{ ...glassCard, padding: '24px 20px', position: 'relative', zIndex: 1, width: '100%', textAlign: 'center' }}>
            <h1 style={{
              fontSize: 'clamp(24px, 5vw, 48px)',
              fontWeight: 800, color: '#fff',
              letterSpacing: '0.05em', lineHeight: 1.15,
              wordBreak: 'normal', overflowWrap: 'break-word',
              whiteSpace: 'normal', width: '100%', display: 'block',
              marginBottom: '6px',
            }}>
              {displayName}
            </h1>
            {addressLine && (
              <p className="uppercase" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: '20px' }}>
                {addressLine}
              </p>
            )}
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Starting Price
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '52px', fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>
              {fmt(pp.packagePrice)}
            </p>
            {startingSubtitle && (
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>{startingSubtitle}</p>
            )}
            {pp.adminFee > 0 && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '10px', fontStyle: 'italic' }}>
                Includes {fmt(pp.adminFee)} admin fee — not subject to discount
              </p>
            )}
          </div>
        </motion.div>

        {/* ── CARD 2: FEES ── */}
        {hasFees && shown('fees') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(1)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(255,255,255,0.2)" />
            <div style={{ ...glassCard, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Project Fees
              </p>
              {pp.adminFee > 0 && (
                <div className="flex justify-between py-1.5">
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px' }}>Admin Fee</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px' }}>{fmt(pp.adminFee)}</span>
                </div>
              )}
              {pp.leadPaint > 0 && (
                <div className="flex justify-between py-1.5">
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px' }}>Lead Paint Test</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px' }}>{fmt(pp.leadPaint)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 600 }}>Total Fees</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 600 }}>{fmt(pp.totalFees)}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginTop: '12px' }}>
                Fees are not subject to discount.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── PRICE BRIDGE 1 ── */}
        {hasFees && shown('bridge1') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(2)}>
            <PriceBridge label="Price Before Discounts" value={pp.priceBeforeDiscounts} />
          </motion.div>
        )}

        {/* ── CARD 3: PACKAGE DISCOUNT ── */}
        {promoOpts.length > 0 && shown('promo') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(3)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(6,182,212,0.4)" />
            <div style={{ ...glassCard, border: '1px solid rgba(6,182,212,0.15)', padding: '20px', position: 'relative', zIndex: 1 }}>
              <BigToggle on={ts.promoOn} onToggle={togglePromo} label="Package Discount" />
              <AnimatePresence>
                {ts.promoOn && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden">
                    <div className="space-y-2 mt-3">
                      {promoOpts.map(opt => (
                        <RadioOption
                          key={opt.id}
                          selected={ts.selectedPromoId === opt.id}
                          onSelect={() => selectPromo(opt.id)}
                          label={opt.name}
                          rightLabel={`-${fmt(pp.discountableBase * (opt.pct / 100))}`}
                        />
                      ))}
                      {ts.selectedPromoId && <NewPriceRow value={pp.yourPrice} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── CARD 4: BNSN ── */}
        {bnsnOpts.length > 0 && shown('bnsn') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(4)}
            style={{ position: 'relative', opacity: ts.promoOn ? 1 : 0.5, transition: 'opacity 0.2s' }}>
            <CardGlow color="rgba(6,182,212,0.4)" />
            <div style={{ ...glassCard, border: '1px solid rgba(6,182,212,0.12)', padding: '20px', position: 'relative', zIndex: 1 }}>
              <BigToggle on={ts.bnsnOn} onToggle={toggleBnsn} label="Buy Now, Save Now" disabled={!ts.promoOn} />
              <AnimatePresence>
                {ts.bnsnOn && ts.promoOn && (
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
                          rightLabel={`-${fmt(pp.discountableBase * (opt.pct / 100))}`}
                        />
                      ))}
                      {ts.selectedBnsnId && <NewPriceRow value={pp.yourPrice} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── CARD 5: CASH INCENTIVE ── */}
        {cashOpt && shown('cash') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(5)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(6,182,212,0.4)" />
            <div style={{ ...glassCard, border: '1px solid rgba(6,182,212,0.12)', padding: '20px', position: 'relative', zIndex: 1 }}>
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
                <NewPriceRow value={pp.yourPrice} />
              )}
            </div>
          </motion.div>
        )}

        {/* ── PRICE BRIDGE 2 ── */}
        {shown('bridge2') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(6)}>
            <PriceBridge label="Your Price" value={pp.yourPrice} />
          </motion.div>
        )}

        {/* ── CARD 6: FINANCING ── */}
        {financingOpts.length > 0 && shown('financing') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(7)}
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

        {/* ── CARD 7: COSTCO ── */}
        {hasCostco && shown('costco') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(9)}
            style={{ position: 'relative' }}>
            <CardGlow color="rgba(251,191,36,0.4)" />
            <div style={{ ...glassCard, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', padding: '20px', position: 'relative', zIndex: 1 }}>

              {/* Toggle A: Shop Card */}
              <div className="flex items-center gap-3" style={{ minHeight: '44px' }}>
                <span style={{ flex: 1, fontSize: '16px', fontWeight: 600, color: ts.costcoShopOn ? '#F9FAFB' : 'rgba(255,255,255,0.55)' }}>
                  Costco Shop Card (10%)
                </span>
                {ts.costcoShopOn && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#F59E0B', fontWeight: 700 }}>
                    -{fmt(pp.costcoShopCard)}
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

              {/* Toggle B: Executive */}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(251,191,36,0.1)' }}>
                <div className="flex items-center gap-3" style={{ minHeight: '44px' }}>
                  <span style={{ flex: 1, fontSize: '16px', fontWeight: 600, color: ts.costcoExecOn ? '#F9FAFB' : 'rgba(255,255,255,0.55)' }}>
                    Executive Membership Reward (2%)
                  </span>
                  {ts.costcoExecOn && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#F59E0B', fontWeight: 700 }}>
                      -{fmt(pp.costcoExec)}
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

            </div>
          </motion.div>
        )}

        {/* ── CARD 8: FINAL PRICE SUMMARY ── */}
        {shown('final_price') && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={s(10)}
          style={{ position: 'relative' }}>
          <CardGlow color="rgba(29,78,216,0.5)" />
          <div style={{
            ...glassCard,
            boxShadow: '0 0 60px rgba(29,78,216,0.25), 0 0 120px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            padding: '28px 16px', position: 'relative', zIndex: 1, overflow: 'visible',
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '20px', pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 50% 100%, rgba(29,78,216,0.25) 0%, transparent 60%)',
            }} />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
              Your Final Price
            </p>
            <motion.p
              key={`final-${Math.round((ts.costcoShopOn || ts.costcoExecOn) ? pp.netAfterCostco : pp.yourPrice)}`}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 800, lineHeight: 1, marginBottom: '16px',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #60A5FA 0%, #06B6D4 40%, #34D399 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                position: 'relative', zIndex: 1, overflow: 'visible',
              }}>
              {fmt((ts.costcoShopOn || ts.costcoExecOn) ? pp.netAfterCostco : pp.yourPrice)}
            </motion.p>
            <div style={{ position: 'relative', zIndex: 1 }}>
              {pp.youSave > 0 && (
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#2DD4BF', marginBottom: '4px' }}>
                  Total Savings: {fmt(pp.youSave)}
                </p>
              )}
              {ts.financingOn && ts.selectedFinancingId && pp.monthlyPayment > 0 && (
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Or as low as {fmt(pp.monthlyPayment)}/mo
                </p>
              )}
              {(ts.costcoShopOn || ts.costcoExecOn) && (
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#FCD34D' }}>
                  Net cost after Costco: {fmt(pp.netAfterCostco)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
        )}

      </div>

      {/* Tap overlay — captures taps to advance cinematic reveal */}
      {!fullyRevealed && (
        <div onClick={handleTap} style={{ position: 'fixed', inset: 0, zIndex: 10, cursor: 'pointer', background: 'transparent' }} />
      )}

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
