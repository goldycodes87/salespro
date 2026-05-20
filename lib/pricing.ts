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

export interface SidingScopeData {
  // Section 1: Removing Existing Material
  remove_siding?: boolean; remove_siding_type?: string
  remove_siding_addl?: boolean; remove_siding_addl_type?: string
  remove_trim?: boolean; remove_trim_type?: string
  remove_gutter?: boolean; remove_gutter_type?: string
  remove_sheathing?: boolean
  // Section 2: Removal Extras
  disposal_dumpster?: boolean; disposal_dumpster_qty?: number
  pre_1978_lead_test?: boolean
  // Section 3: Install New Material
  install_sheathing?: boolean; install_sheathing_type?: string; install_sheathing_sqft?: number
  moisture_barrier?: boolean
  fanfold?: boolean; fanfold_sqft?: number
  // Section 4: James Hardie Siding
  hardie_plank?: boolean; hardie_plank_location?: string; hardie_plank_profile?: string
  hardie_plank_reveal?: string; hardie_plank_collection?: string; hardie_plank_color?: string
  hardie_panel?: boolean; hardie_panel_location?: string; hardie_panel_profile?: string
  hardie_panel_reveal?: string; hardie_panel_collection?: string; hardie_panel_color?: string
  hardie_shingle?: boolean; hardie_shingle_location?: string; hardie_shingle_profile?: string
  hardie_shingle_reveal?: string; hardie_shingle_collection?: string; hardie_shingle_color?: string
  hardie_special?: boolean; hardie_special_location?: string; hardie_special_profile?: string
  hardie_special_reveal?: string; hardie_special_collection?: string; hardie_special_color?: string
  // Section 5: James Hardie Trim
  trim_windows_doors?: boolean; trim_windows_doors_type?: string
  trim_windows_doors_collection?: string; trim_windows_doors_color?: string
  trim_corners?: boolean; trim_corners_type?: string
  trim_corners_collection?: string; trim_corners_color?: string
  trim_garage?: boolean; trim_garage_type?: string
  trim_garage_collection?: string; trim_garage_color?: string; trim_garage_size?: '1_car' | '2_car'
  // Section 6: Roofline
  soffit?: boolean; soffit_type?: string; soffit_collection?: string; soffit_color?: string
  // Section 7: Seamless Gutters
  seamless_gutters?: boolean; gutters_size?: string; gutters_color?: string; gutters_leaf_guard?: boolean
  // Section 8: Accents
  gable_vent_qty?: number; gable_vent_color?: string
  shutter_qty?: number; shutter_color?: string
  // Section 9: Additional Items
  band_board?: boolean; band_board_lf?: number; band_board_location?: string
  band_board_collection?: string; band_board_color?: string
  frieze_board?: boolean; frieze_board_lf?: number; frieze_board_location?: string
  frieze_board_collection?: string; frieze_board_color?: string
  porch_ceiling?: boolean; porch_ceiling_sqft?: number; porch_ceiling_location?: string
  porch_ceiling_collection?: string; porch_ceiling_color?: string
  beams?: boolean; beams_description?: string; beams_location?: string
  beams_collection?: string; beams_color?: string
  // Section 10: Project Notes
  special_notes?: string
  offer_expiration_date?: string
}

export interface FinancingOptionSetting {
  id: string
  label: string
  method: 'factor' | 'months'
  factor?: number
  months?: number
  active: boolean
}

export interface DiscountOptionSetting {
  id: string
  name: string
  pct: number
  type: 'promotion' | 'bnsn' | 'cash'
  is_combined?: boolean
  active: boolean
}

export const DEFAULT_FINANCING_SETTINGS: FinancingOptionSetting[] = [
  { id: '12mo_0pct', label: '12-Month 0% Interest', method: 'months', months: 12, active: true },
  { id: '18mo_0pct', label: '18-Month 0% Interest', method: 'months', months: 18, active: true },
  { id: '24mo_0pct', label: '24-Month 0% Interest', method: 'months', months: 24, active: true },
  { id: '6.99_10yr', label: '6.99% / 10-Year', method: 'factor', factor: 0.01161, active: true },
  { id: '6.99_12yr', label: '6.99% / 12-Year', method: 'factor', factor: 0.00978, active: true },
  { id: '6.99_15yr', label: '6.99% / 15-Year', method: 'factor', factor: 0.00896, active: true },
  { id: '9.99_10yr', label: '9.99% / 10-Year', method: 'factor', factor: 0.01322, active: true },
]

export const DEFAULT_DISCOUNT_SETTINGS: DiscountOptionSetting[] = [
  { id: '20pct_promo', name: '20% Package Discount', pct: 20, type: 'promotion', active: true },
  { id: '25pct_promo', name: '25% Package Discount', pct: 25, type: 'promotion', active: true },
  { id: 'bnsn_10', name: 'Buy Now Save Now 10%', pct: 10, type: 'bnsn', active: true },
  { id: 'bnsn_5', name: 'Buy Now Save Now 5%', pct: 5, type: 'bnsn', active: true },
  { id: 'bnsn_30', name: 'Full 30% Combined', pct: 30, type: 'bnsn', is_combined: true, active: true },
  { id: 'cash_7', name: 'Cash Incentive', pct: 7, type: 'cash', active: true },
]

export interface SidingFinancingOption {
  id: string
  label: string
  fee: number  // decimal (0.105 = 10.5%)
}

export const SIDING_FINANCING: SidingFinancingOption[] = [
  { id: 'cash',        label: 'Cash',                fee: 0 },
  { id: '9.99_10yr',  label: '9.99% / 10 Years',    fee: 0 },
  { id: '6.99_10yr',  label: '6.99% / 10 Years',    fee: 0.0525 },
  { id: '6.99_5yr',   label: '6.99% / 5 Years',     fee: 0.06 },
  { id: '0pct_24mo',  label: '0% / 24 Months',      fee: 0.105 },
  { id: '0pct_18mo',  label: '0% / 18 Months',      fee: 0.085 },
  { id: '0pct_12mo',  label: '0% / 12 Months',      fee: 0.055 },
  { id: 'credit_card', label: 'Credit Card',         fee: 0.035 },
]

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
  costco_city_visa_enabled?: boolean
  costco_city_visa_amount?: number
  financing: FinancingOption
  deposit: number
  // Settings-based overrides (used instead of enum keys when set)
  promotion_pct?: number
  bnsn_pct?: number
  bnsn_is_combined?: boolean
  cash_pct?: number
  financing_factor?: number
  financing_months?: number
  selected_promo_id?: string
  selected_bnsn_id?: string
  selected_financing_id?: string
  // Siding scope of work
  siding_scope?: SidingScopeData
  // Simplified windows/doors input (replaces line_items sum)
  windows_project_value?: number
  num_windows?: number
  num_doors?: number
  // Siding financing
  siding_financing_id?: string
}

export interface PricingResult {
  package_price: number
  discountable_base: number
  discount_pct: number
  discount_amount: number
  cash_discount: number
  you_save: number
  subtotal: number
  admin_fee: number
  lead_paint: number
  your_price: number
  net_after_costco: number
  monthly_payment: number
  costco_member_savings: number
  costco_exec_savings: number
  costco_city_visa_savings: number
  total_windows: number
  // Siding-specific
  siding_financing_fee: number
  siding_financing_label: string
  siding_is_credit_card: boolean
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

function calcSidingPrice(inputs: PricingInputs): PricingResult {
  const base_price = inputs.project_value
  const fin = SIDING_FINANCING.find(f => f.id === (inputs.siding_financing_id ?? 'cash')) ?? SIDING_FINANCING[0]
  const cashAllowed = fin.id === 'cash' || fin.id === '9.99_10yr'
  const applyFee = !(inputs.cash_incentive && cashAllowed)
  const siding_financing_fee = applyFee ? Math.floor(base_price * fin.fee) : 0
  const siding_price = base_price + siding_financing_fee
  const admin_fee = inputs.admin_fee_enabled ? inputs.admin_fee_amount : 0
  const lead_paint = inputs.lead_paint_enabled ? inputs.lead_paint_amount : 0
  const your_price = siding_price + admin_fee + lead_paint
  return {
    package_price: base_price,
    discountable_base: base_price,
    discount_pct: 0,
    discount_amount: 0,
    cash_discount: 0,
    you_save: 0,
    subtotal: siding_price,
    admin_fee,
    lead_paint,
    your_price,
    net_after_costco: your_price,
    monthly_payment: 0,
    costco_member_savings: 0,
    costco_exec_savings: 0,
    costco_city_visa_savings: 0,
    total_windows: 0,
    siding_financing_fee,
    siding_financing_label: fin.label,
    siding_is_credit_card: fin.id === 'credit_card',
  }
}

export function calcPrice(inputs: PricingInputs): PricingResult {
  if (inputs.proposal_type === 'siding') return calcSidingPrice(inputs)

  const { line_items } = inputs

  let package_price = 0
  let non_disc_line_total = 0
  let total_windows = 0

  if (inputs.windows_project_value != null && inputs.windows_project_value > 0) {
    package_price = inputs.windows_project_value
    total_windows = inputs.num_windows ?? 0
  } else {
    for (const item of line_items) {
      const rowTotal = item.qty * item.unit_price
      total_windows += item.qty
      if (item.discountable) package_price += rowTotal
      else non_disc_line_total += rowTotal
    }
  }

  // Discount pct — settings overrides take priority over enum keys
  let discount_pct = 0
  if (inputs.bnsn === '30_combined' || (inputs.bnsn_pct != null && inputs.bnsn_is_combined)) {
    discount_pct = inputs.bnsn_pct ?? 30
  } else {
    const promo = inputs.promotion_pct ??
      (inputs.promotion === '20_off' ? 20 : inputs.promotion === '25_off' ? 25 : 0)
    const bnsn = inputs.bnsn_pct ??
      (inputs.bnsn === '10_off' ? 10 : inputs.bnsn === '5_off' ? 5 : 0)
    discount_pct = promo + bnsn
  }

  const admin_fee = inputs.admin_fee_enabled ? inputs.admin_fee_amount : 0
  const lead_paint = inputs.lead_paint_enabled ? inputs.lead_paint_amount : 0
  const discountable_base = package_price  // admin_fee and lead_paint are never discounted

  // Cash rolls into the combined discount so floor() is applied once across the full pct
  const cash_pct_val = inputs.cash_pct ?? 7
  const cash_component = inputs.cash_incentive ? cash_pct_val : 0
  const discount_amount = Math.floor(package_price * ((discount_pct + cash_component) / 100))
  const cash_discount = inputs.cash_incentive ? Math.floor(package_price * (cash_pct_val / 100)) : 0

  const you_save = discount_amount
  const subtotal = package_price - discount_amount + non_disc_line_total
  const your_price = subtotal + admin_fee + lead_paint

  // Financing — settings overrides take priority over enum keys
  let monthly_payment: number
  if (inputs.financing_factor != null) {
    monthly_payment = your_price * inputs.financing_factor
  } else if (inputs.financing_months != null) {
    monthly_payment = your_price / inputs.financing_months
  } else {
    monthly_payment = FINANCING_FACTORS[inputs.financing](your_price)
  }

  const costco_member_savings = inputs.costco_revealed && inputs.costco_member
    ? Math.floor(your_price * 0.10)
    : 0
  const costco_exec_savings = inputs.costco_revealed && inputs.costco_executive
    ? Math.min(Math.floor(your_price * 0.02), 1250)
    : 0
  const costco_city_visa_savings = inputs.costco_city_visa_enabled && inputs.costco_city_visa_amount
    ? Math.floor(inputs.costco_city_visa_amount * 0.02)
    : 0
  const net_after_costco = your_price - costco_member_savings - costco_exec_savings - costco_city_visa_savings

  return {
    package_price,
    discountable_base,
    discount_pct,
    discount_amount,
    cash_discount,
    you_save,
    subtotal,
    admin_fee,
    lead_paint,
    your_price,
    net_after_costco,
    monthly_payment,
    costco_member_savings,
    costco_exec_savings,
    costco_city_visa_savings,
    total_windows,
    siding_financing_fee: 0,
    siding_financing_label: '',
    siding_is_credit_card: false,
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
  costco_city_visa_enabled: false,
  costco_city_visa_amount: 0,
  financing: 'none',
  deposit: 0,
  siding_financing_id: 'cash',
}
