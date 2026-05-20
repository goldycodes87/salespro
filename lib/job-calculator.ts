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
}

export interface JobCalculatorInputs {
  base_price: number
  enabled_tier_ids: string[]
  cash_enabled: boolean
  financing_id: string | null
  charged_amount?: number
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

  // Step 4: Discount amount — applied to base_price only, admin fee never discounted
  const totalDiscountAmount = Math.floor(base * (totalPct / 100))
  const subtotal = base - totalDiscountAmount

  // Step 5: Cash incentive — applied to subtotal before admin
  const cashPct =
    inputs.cash_enabled && config.cash_incentive?.enabled
      ? (config.cash_incentive.pct ?? 0)
      : 0
  const cashDiscount = Math.floor(subtotal * (cashPct / 100))
  const afterCash = subtotal - cashDiscount

  // Step 6: Admin fee always added, never discounted
  let customerPrice = afterCash + config.admin_fee

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
      // Monthly payment — only if term_months > 0 (not a special case like Cash/Check)
      if (fin.term_months > 0) {
        const factor = calcMonthlyFactor(fin.rate_pct, fin.term_months)
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
        const rebateBase = tier.base === 'subtotal' ? subtotal : customerPrice
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
    amount: Math.floor(base * (t.pct / 100)),
  }))

  const hiddenTierAmount = hiddenPct > 0 ? Math.floor(base * (hiddenPct / 100)) : 0

  return {
    base_price: base,
    admin_fee: config.admin_fee,
    tiers_applied: tiersApplied,
    hidden_tier_amount: hiddenTierAmount,
    total_discount_pct: totalPct,
    total_discount_amount: totalDiscountAmount,
    subtotal,
    cash_discount: cashDiscount,
    financing_fee: financingFee,
    customer_price: customerPrice,
    monthly_payment: monthlyPayment,
    rebates,
    total_rebate: totalRebate,
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
