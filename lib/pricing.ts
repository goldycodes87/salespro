export type Promotion = 'none' | '20_off' | '25_off'
export type BNSN = 'none' | '10_off' | '5_off' | '30_combined'
export type FinancingOption =
  | 'none'
  | '12mo_0pct'
  | '18mo_0pct'
  | '24mo_0pct'
  | '6.99_10yr'
  | '6.99_12yr'
  | '6.99_15yr'
  | '9.99_10yr'

export interface LineItem {
  id: string
  location: string
  qty: number
  unit_price: number
  discountable: boolean
}

export interface PricingInputs {
  line_items: LineItem[]        // windows only; for siding use project_value
  project_value: number         // siding only
  proposal_type: 'windows' | 'siding' | 'both'
  promotion: Promotion
  bnsn: BNSN
  cash_incentive: boolean
  admin_fee_enabled: boolean
  admin_fee_amount: number
  lead_paint_enabled: boolean
  lead_paint_amount: number
  costco_revealed: boolean
  costco_member: boolean
  costco_executive: boolean
  financing: FinancingOption
  deposit: number
}

export interface PricingResult {
  package_price: number
  discount_pct: number
  discount_amount: number
  cash_discount: number
  you_save: number
  subtotal: number
  admin_fee: number
  lead_paint: number
  your_price: number
  monthly_payment: number
  costco_member_savings: number
  costco_exec_savings: number
  total_windows: number
}

const FINANCING_FACTORS: Record<FinancingOption, (p: number) => number> = {
  none: () => 0,
  '12mo_0pct': p => p / 12,
  '18mo_0pct': p => p / 18,
  '24mo_0pct': p => p / 24,
  '6.99_10yr': p => p * 0.01161,
  '6.99_12yr': p => p * 0.00978,
  '6.99_15yr': p => p * 0.00896,
  '9.99_10yr': p => p * 0.01322,
}

export const FINANCING_LABELS: Record<FinancingOption, string> = {
  none: 'No Financing',
  '12mo_0pct': '12-Month 0% Interest',
  '18mo_0pct': '18-Month 0% Interest',
  '24mo_0pct': '24-Month 0% Interest',
  '6.99_10yr': '6.99% / 10-Year',
  '6.99_12yr': '6.99% / 12-Year',
  '6.99_15yr': '6.99% / 15-Year',
  '9.99_10yr': '9.99% / 10-Year',
}

export function calcPrice(inputs: PricingInputs): PricingResult {
  const { line_items, project_value, proposal_type } = inputs

  // Base: discountable sum
  let package_price = 0
  let non_disc_line_total = 0
  let total_windows = 0

  if (proposal_type === 'siding') {
    package_price = project_value
  } else {
    for (const item of line_items) {
      const rowTotal = item.qty * item.unit_price
      total_windows += item.qty
      if (item.discountable) package_price += rowTotal
      else non_disc_line_total += rowTotal
    }
  }

  // Discount pct
  let discount_pct = 0
  if (inputs.bnsn === '30_combined') {
    discount_pct = 30
  } else {
    const promo = inputs.promotion === '20_off' ? 20 : inputs.promotion === '25_off' ? 25 : 0
    const bnsn_add = inputs.bnsn === '10_off' ? 10 : inputs.bnsn === '5_off' ? 5 : 0
    discount_pct = promo + bnsn_add
  }

  const discount_amount = package_price * (discount_pct / 100)
  const cash_discount = inputs.cash_incentive ? package_price * 0.06 : 0
  const you_save = discount_amount + cash_discount

  const discounted_package = package_price - discount_amount - cash_discount
  const admin_fee = inputs.admin_fee_enabled ? inputs.admin_fee_amount : 0
  const lead_paint = inputs.lead_paint_enabled ? inputs.lead_paint_amount : 0

  const subtotal = discounted_package + non_disc_line_total
  const your_price = subtotal + admin_fee + lead_paint

  // Financing
  const monthly_payment = FINANCING_FACTORS[inputs.financing](your_price)

  // Costco (always applied to your_price, after all other discounts)
  const costco_member_savings = inputs.costco_revealed && inputs.costco_member ? your_price * 0.10 : 0
  const costco_exec_savings = inputs.costco_revealed && inputs.costco_executive
    ? Math.min(your_price * 0.02, 1250)
    : 0

  return {
    package_price,
    discount_pct,
    discount_amount,
    cash_discount,
    you_save,
    subtotal,
    admin_fee,
    lead_paint,
    your_price,
    monthly_payment,
    costco_member_savings,
    costco_exec_savings,
    total_windows,
  }
}

export const DEFAULT_LINE_ITEM = (): LineItem => ({
  id: Math.random().toString(36).slice(2),
  location: '',
  qty: 1,
  unit_price: 0,
  discountable: true,
})

export const DEFAULT_PRICING: PricingInputs = {
  line_items: [DEFAULT_LINE_ITEM()],
  project_value: 0,
  proposal_type: 'windows',
  promotion: 'none',
  bnsn: 'none',
  cash_incentive: false,
  admin_fee_enabled: true,
  admin_fee_amount: 850,
  lead_paint_enabled: false,
  lead_paint_amount: 500,
  costco_revealed: false,
  costco_member: false,
  costco_executive: false,
  financing: 'none',
  deposit: 0,
}
