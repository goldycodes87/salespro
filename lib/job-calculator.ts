export interface DiscountTier {
  id: string
  name: string
  pct: number
  visible: boolean
  enabled: boolean
  position: number
}

export interface HiddenTier {
  enabled: boolean
  pct: number
}

export interface CashIncentive {
  enabled: boolean
  pct: number
  label: string
}

export interface FinancingOption {
  id: string
  rate_pct: number       // interest rate, e.g. 0, 6.99, 9.99
  term_months: number    // e.g. 12, 18, 24, 120; 0 = no term (special case)
  fee_pct: number        // fee added to price (cash_up only)
  display_name: string   // auto-generated via formatFinancingName or manual for special cases
  show_after_tier: number
  is_special_case?: boolean  // true for Cash/Check, Credit Card — manual name, no rate/term
}

export interface RebateTier {
  id: string
  name: string
  type: 'pct_of_price' | 'pct_of_charged' | 'fixed'
  value: number
  cap?: number
  base: 'customer_price' | 'subtotal' | 'charged_amount'
}

export interface RebateProgram {
  enabled: boolean
  name: string
  tiers: RebateTier[]
}

export interface JobFee {
  id: string
  label: string
  amount: number
  default_on: boolean
}

export interface JobTypeConfig {
  id: string
  rep_id?: string
  name: string
  icon?: string
  is_default?: boolean
  pricing_model: 'financed_down' | 'cash_up'
  admin_fee: number
  max_discount_pct: number
  cash_incentive: CashIncentive
  discount_tiers: DiscountTier[]
  hidden_tier: HiddenTier
  financing_options: FinancingOption[]
  rebate_program: RebateProgram
  fees?: JobFee[]
}

export interface JobCalculatorInputs {
  base_price: number
  enabled_tier_ids: string[]
  cash_enabled: boolean
  financing_id: string | null
  charged_amount?: number
  included_fee_ids?: string[]
}

export interface TierResult {
  id: string
  name: string
  pct: number
  amount: number
}

export interface RebateResult {
  id: string
  name: string
  amount: number
}

export interface JobCalculatorResult {
  base_price: number
  admin_fee: number
  tiers_applied: TierResult[]
  hidden_tier_amount: number
  total_discount_pct: number
  total_discount_amount: number
  subtotal: number
  cash_discount: number
  financing_fee: number
  customer_price: number
  monthly_payment: number | null
  rebates: RebateResult[] | null
  total_rebate: number | null
  fees_breakdown: { id: string; label: string; amount: number; included: boolean }[]
  included_fees_total: number
  adjusted_base: number
}

// Auto-generate human-readable display name from rate and term
export function formatFinancingName(rate_pct: number, term_months: number): string {
  const rate = rate_pct === 0 ? '0% Interest' : `${rate_pct}% Interest`
  if (term_months >= 12 && term_months % 12 === 0) {
    const years = term_months / 12
    const yearLabel = years === 1 ? '1 Year' : `${years} Years`
    return `${yearLabel} at ${rate}`
  }
  return `${term_months} Months at ${rate}`
}
// Examples:
// 0%, 24mo  → "24 Months at 0% Interest"
// 9.99%, 120mo → "10 Years at 9.99% Interest"
// 6.99%, 60mo  → "5 Years at 6.99% Interest"
// 0%, 18mo  → "18 Months at 0% Interest"

export function getFinancingLabel(opt: FinancingOption): string {
  if (opt.display_name) return opt.display_name
  if (opt.rate_pct !== undefined && opt.term_months !== undefined && opt.term_months > 0) {
    return formatFinancingName(opt.rate_pct, opt.term_months)
  }
  if ((opt as any).name) return (opt as any).name
  return opt.id.replace(/^fin_/, '').replace(/_/g, ' ')
}

// monthly_factor in old schema stores term months (e.g. 24, 120)
// so the payment factor is 1/monthly_factor (0% assumed — rate not stored)
export function getMonthlyFactor(opt: FinancingOption): number {
  if (opt.rate_pct !== undefined && opt.term_months !== undefined && opt.term_months > 0) {
    return calcMonthlyFactor(opt.rate_pct, opt.term_months)
  }
  const legacyMonths = (opt as any).monthly_factor
  if (legacyMonths) return 1 / legacyMonths
  return 0
}

// Standard amortization monthly payment factor
export function calcMonthlyFactor(rate_pct: number, term_months: number): number {
  if (rate_pct === 0) {
    return Number((1 / term_months).toFixed(6))
  }
  const r = (rate_pct / 100) / 12
  const n = term_months
  const factor = r / (1 - Math.pow(1 + r, -n))
  return Number(factor.toFixed(6))
}

export function calculateJob(
  config: JobTypeConfig,
  inputs: JobCalculatorInputs,
): JobCalculatorResult {
  const base = inputs.base_price

  // Step 1: Active visible tiers sorted by position
  const activeTiers = config.discount_tiers
    .filter(t => inputs.enabled_tier_ids.includes(t.id))
    .sort((a, b) => a.position - b.position)

  // Step 2: Hidden tier pct
  const hiddenPct = config.hidden_tier?.enabled ? (config.hidden_tier.pct ?? 0) : 0

  // Step 3: Total discount pct
  const visiblePct = activeTiers.reduce((sum, t) => sum + t.pct, 0)
  const totalPct = Math.min(visiblePct + hiddenPct, config.max_discount_pct ?? 100)

  // Step 4: Cash pct
  const cashPct =
    inputs.cash_enabled && config.cash_incentive?.enabled
      ? (config.cash_incentive.pct ?? 0)
      : 0

  // Step 5–6: Strip included fees from base before discounting, add all fees back after
  const includedFeeIds = inputs.included_fee_ids ?? []
  const feesBreakdown: { id: string; label: string; amount: number; included: boolean }[] = []

  const adminIncluded = includedFeeIds.includes('admin_fee')
  feesBreakdown.push({ id: 'admin_fee', label: 'Admin Fee', amount: config.admin_fee, included: adminIncluded })

  const additionalFees = config.fees ?? []
  let additionalFeesTotal = 0
  additionalFees.forEach(fee => {
    const isIncluded = includedFeeIds.includes(fee.id)
    additionalFeesTotal += fee.amount
    feesBreakdown.push({ id: fee.id, label: fee.label, amount: fee.amount, included: isIncluded })
  })

  const includedFeesTotal = feesBreakdown.filter(f => f.included).reduce((sum, f) => sum + f.amount, 0)
  const adjustedBase = inputs.base_price - includedFeesTotal

  const adjustedDiscountAmount = Math.floor(adjustedBase * (totalPct / 100))
  const adjustedSubtotal = adjustedBase - adjustedDiscountAmount

  const adjustedCashDiscount = Math.floor(adjustedSubtotal * (cashPct / 100))
  const adjustedAfterCash = adjustedSubtotal - adjustedCashDiscount

  // Admin fee and additional fees always added back — never discounted
  let customerPrice = adjustedAfterCash + config.admin_fee + additionalFeesTotal

  // Step 7: Financing fee
  // financed_down: NEVER add fee — financing = payment terms only
  // cash_up: ADD fee_pct to price if financing selected and fee_pct > 0
  let financingFee = 0
  let monthlyPayment: number | null = null

  if (inputs.financing_id) {
    const fin = config.financing_options.find(f => f.id === inputs.financing_id)
    if (fin) {
      if (config.pricing_model === 'cash_up' && fin.fee_pct > 0) {
        financingFee = Math.floor(customerPrice * fin.fee_pct)
        customerPrice += financingFee
      }
      // Monthly payment — works for both new schema (rate_pct/term_months) and old (monthly_factor)
      const factor = getMonthlyFactor(fin)
      if (factor > 0) {
        monthlyPayment = Math.ceil(customerPrice * factor)
      }
    }
  }

  // Step 8: Rebates — calculated off final customer_price including admin
  let rebates: RebateResult[] | null = null
  let totalRebate: number | null = null

  if (config.rebate_program?.enabled) {
    rebates = config.rebate_program.tiers.map(tier => {
      let amount = 0

      if (tier.type === 'pct_of_price') {
        const rebateBase = tier.base === 'subtotal' ? adjustedSubtotal : customerPrice
        amount = Math.floor(rebateBase * (tier.value / 100))
      } else if (tier.type === 'pct_of_charged') {
        amount = Math.floor((inputs.charged_amount ?? 0) * (tier.value / 100))
      } else if (tier.type === 'fixed') {
        amount = tier.value
      }

      if (tier.cap && amount > tier.cap) {
        amount = tier.cap
      }

      return { id: tier.id, name: tier.name, amount }
    })

    totalRebate = rebates.reduce((sum, r) => sum + r.amount, 0)
  }

  // Step 9: Per-tier breakdown for display
  const tiersApplied: TierResult[] = activeTiers.map(t => ({
    id: t.id,
    name: t.name,
    pct: t.pct,
    amount: Math.floor(adjustedBase * (t.pct / 100)),
  }))

  const hiddenTierAmount = hiddenPct > 0 ? Math.floor(adjustedBase * (hiddenPct / 100)) : 0

  return {
    base_price: base,
    admin_fee: config.admin_fee,
    tiers_applied: tiersApplied,
    hidden_tier_amount: hiddenTierAmount,
    total_discount_pct: totalPct,
    total_discount_amount: adjustedDiscountAmount,
    subtotal: adjustedSubtotal,
    cash_discount: adjustedCashDiscount,
    financing_fee: financingFee,
    customer_price: customerPrice,
    monthly_payment: monthlyPayment,
    rebates,
    total_rebate: totalRebate,
    fees_breakdown: feesBreakdown,
    included_fees_total: includedFeesTotal,
    adjusted_base: adjustedBase,
  }
}

export function calculateRebateAtPrice(program: RebateProgram, price: number): number {
  if (!program?.enabled) return 0
  return program.tiers.reduce((sum, tier) => {
    if (tier.type !== 'pct_of_price') return sum
    const amount = Math.floor(price * (tier.value / 100))
    return sum + (tier.cap ? Math.min(amount, tier.cap) : amount)
  }, 0)
}
