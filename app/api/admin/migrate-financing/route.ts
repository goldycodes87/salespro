export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { formatFinancingName } from '@/lib/job-calculator'

const ERIC_REP_ID = 'c6fc9b34-2c2d-4b3b-a312-63fa24637c92'

const WINDOWS_FINANCING = [
  { id: 'cash',      display_name: 'Cash / Check',                     rate_pct: 0,    term_months: 0,   fee_pct: 0,      show_after_tier: 2, is_special_case: true },
  { id: '9_99_10yr', display_name: formatFinancingName(9.99, 120),      rate_pct: 9.99, term_months: 120, fee_pct: 0,      show_after_tier: 2 },
  { id: '6_99_10yr', display_name: formatFinancingName(6.99, 120),      rate_pct: 6.99, term_months: 120, fee_pct: 0,      show_after_tier: 2 },
  { id: '6_99_5yr',  display_name: formatFinancingName(6.99, 60),       rate_pct: 6.99, term_months: 60,  fee_pct: 0,      show_after_tier: 2 },
  { id: '0pct_18mo', display_name: formatFinancingName(0, 18),          rate_pct: 0,    term_months: 18,  fee_pct: 0,      show_after_tier: 2 },
  { id: '0pct_24mo', display_name: formatFinancingName(0, 24),          rate_pct: 0,    term_months: 24,  fee_pct: 0,      show_after_tier: 2 },
]

const SIDING_FINANCING = [
  { id: 'cash',        display_name: 'Cash / Check',                 rate_pct: 0,    term_months: 0,   fee_pct: 0,      show_after_tier: 2, is_special_case: true },
  { id: 'credit_card', display_name: 'Credit Card',                  rate_pct: 0,    term_months: 0,   fee_pct: 0.035,  show_after_tier: 2, is_special_case: true },
  { id: '9_99_10yr',   display_name: formatFinancingName(9.99, 120), rate_pct: 9.99, term_months: 120, fee_pct: 0,      show_after_tier: 2 },
  { id: '6_99_10yr',   display_name: formatFinancingName(6.99, 120), rate_pct: 6.99, term_months: 120, fee_pct: 0.0525, show_after_tier: 2 },
  { id: '6_99_5yr',    display_name: formatFinancingName(6.99, 60),  rate_pct: 6.99, term_months: 60,  fee_pct: 0.06,   show_after_tier: 2 },
  { id: '0pct_24mo',   display_name: formatFinancingName(0, 24),     rate_pct: 0,    term_months: 24,  fee_pct: 0.105,  show_after_tier: 2 },
  { id: '0pct_18mo',   display_name: formatFinancingName(0, 18),     rate_pct: 0,    term_months: 18,  fee_pct: 0.085,  show_after_tier: 2 },
  { id: '0pct_12mo',   display_name: formatFinancingName(0, 12),     rate_pct: 0,    term_months: 12,  fee_pct: 0.055,  show_after_tier: 2 },
]

export async function POST() {
  const admin = getSupabaseAdmin()

  const { data: configs, error: fetchError } = await admin
    .from('job_type_configs')
    .select('id, name')
    .eq('rep_id', ERIC_REP_ID)

  if (fetchError || !configs || configs.length === 0) {
    return NextResponse.json({ error: fetchError?.message ?? 'No configs found' }, { status: 404 })
  }

  const results = []

  for (const config of configs) {
    const financing =
      config.name === 'Windows' ? WINDOWS_FINANCING :
      config.name === 'Siding'  ? SIDING_FINANCING  : null

    if (!financing) {
      results.push({ id: config.id, name: config.name, updated: false, reason: 'no mapping' })
      continue
    }

    const { error } = await admin
      .from('job_type_configs')
      .update({ financing_options: financing })
      .eq('id', config.id)

    results.push({ id: config.id, name: config.name, updated: !error, error: error?.message })
  }

  return NextResponse.json({ results })
}
