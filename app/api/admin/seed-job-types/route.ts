export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const ERIC_REP_ID = 'c6fc9b34-2c2d-4b3b-a312-63fa24637c92'

export async function POST() {
  const admin = getSupabaseAdmin()

  const { data: existing } = await admin
    .from('job_type_configs')
    .select('id, name')
    .eq('rep_id', ERIC_REP_ID)

  if (existing && existing.length > 0) {
    return NextResponse.json({ message: 'Already seeded', configs: existing })
  }

  const { data: windows, error: windowsError } = await admin
    .from('job_type_configs')
    .insert({
      rep_id: ERIC_REP_ID,
      name: 'Windows',
      icon: '🪟',
      pricing_model: 'financed_down',
      admin_fee: 850,
      max_discount_pct: 37,
      cash_incentive: {
        enabled: true,
        pct: 7,
        label: 'Cash Incentive',
      },
      discount_tiers: [
        { id: 'promo', name: 'Promotional Discount', pct: 20, visible: true, enabled: true, position: 1 },
        { id: 'bnsn', name: 'Buy Now, Save Now', pct: 10, visible: true, enabled: true, position: 2 },
      ],
      hidden_tier: { enabled: false, pct: 0 },
      financing_options: [
        { id: 'cash', name: 'Cash / Check', fee_pct: 0, show_after_tier: 2 },
        { id: '9_99_10yr', name: '9.99% / 10 Years', fee_pct: 0, show_after_tier: 2, monthly_factor: 0.01053 },
        { id: '6_99_10yr', name: '6.99% / 10 Years', fee_pct: 0.0525, show_after_tier: 2, monthly_factor: 0.01163 },
        { id: '6_99_5yr', name: '6.99% / 5 Years', fee_pct: 0.06, show_after_tier: 2, monthly_factor: 0.01980 },
        { id: '0pct_18mo', name: '0% / 18 Months', fee_pct: 0.085, show_after_tier: 2, monthly_factor: 0.05556 },
        { id: '0pct_24mo', name: '0% / 24 Months', fee_pct: 0.105, show_after_tier: 2, monthly_factor: 0.04167 },
      ],
      rebate_program: {
        enabled: true,
        name: 'Costco',
        tiers: [
          { id: 'member', name: 'Costco Shop Card', type: 'pct_of_price', value: 10, base: 'customer_price' },
          { id: 'executive', name: 'Executive Reward', type: 'pct_of_price', value: 2, cap: 1250, base: 'customer_price' },
          { id: 'city_visa', name: 'City Visa (2%)', type: 'pct_of_charged', value: 2, base: 'charged_amount' },
        ],
      },
      is_default: true,
    })
    .select('id')
    .single()

  if (windowsError || !windows) {
    return NextResponse.json({ error: windowsError?.message ?? 'Failed to insert Windows config' }, { status: 500 })
  }

  const { data: siding, error: sidingError } = await admin
    .from('job_type_configs')
    .insert({
      rep_id: ERIC_REP_ID,
      name: 'Siding',
      icon: '🏠',
      pricing_model: 'cash_up',
      admin_fee: 850,
      max_discount_pct: 37,
      cash_incentive: {
        enabled: true,
        pct: 7,
        label: 'Cash Incentive',
      },
      discount_tiers: [
        { id: 'promo', name: 'Promotional Discount', pct: 20, visible: true, enabled: true, position: 1 },
        { id: 'bnsn', name: 'Buy Now, Save Now', pct: 10, visible: true, enabled: true, position: 2 },
      ],
      hidden_tier: { enabled: true, pct: 10 },
      financing_options: [
        { id: 'cash', name: 'Cash / Check', fee_pct: 0, show_after_tier: 2 },
        { id: 'credit_card', name: 'Credit Card', fee_pct: 0.035, show_after_tier: 2 },
        { id: '9_99_10yr', name: '9.99% / 10 Years', fee_pct: 0, show_after_tier: 2, monthly_factor: 0.01053 },
        { id: '6_99_10yr', name: '6.99% / 10 Years', fee_pct: 0.0525, show_after_tier: 2, monthly_factor: 0.01163 },
        { id: '6_99_5yr', name: '6.99% / 5 Years', fee_pct: 0.06, show_after_tier: 2, monthly_factor: 0.01980 },
        { id: '0pct_24mo', name: '0% / 24 Months', fee_pct: 0.105, show_after_tier: 2, monthly_factor: 0.04167 },
        { id: '0pct_18mo', name: '0% / 18 Months', fee_pct: 0.085, show_after_tier: 2, monthly_factor: 0.05556 },
        { id: '0pct_12mo', name: '0% / 12 Months', fee_pct: 0.055, show_after_tier: 2, monthly_factor: 0.08333 },
      ],
      rebate_program: {
        enabled: true,
        name: 'Costco',
        tiers: [
          { id: 'member', name: 'Costco Shop Card', type: 'pct_of_price', value: 10, base: 'customer_price' },
          { id: 'executive', name: 'Executive Reward', type: 'pct_of_price', value: 2, cap: 1250, base: 'customer_price' },
          { id: 'city_visa', name: 'City Visa (2%)', type: 'pct_of_charged', value: 2, base: 'charged_amount' },
        ],
      },
      is_default: false,
    })
    .select('id')
    .single()

  if (sidingError || !siding) {
    return NextResponse.json({ error: sidingError?.message ?? 'Failed to insert Siding config' }, { status: 500 })
  }

  return NextResponse.json({
    created: 2,
    windows_id: windows.id,
    siding_id: siding.id,
    message: 'Seeded successfully',
  })
}
