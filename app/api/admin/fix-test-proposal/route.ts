export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const PROPOSAL_ID = '133cdfee-cb9b-4feb-a101-cd8aa77a6cfd'

export async function GET() {
  const admin = getSupabaseAdmin()

  // Fetch current pricing_data
  const { data: proposal, error: fetchError } = await admin
    .from('proposals')
    .select('pricing_data, package_price, your_price')
    .eq('id', PROPOSAL_ID)
    .single()

  if (fetchError || !proposal) {
    return NextResponse.json({ error: fetchError?.message ?? 'Proposal not found' }, { status: 404 })
  }

  const existingPd = proposal.pricing_data ?? {}
  const packagePrice = existingPd.package_price ?? proposal.package_price ?? 44766
  const adminFeeAmount = existingPd.admin_fee_amount ?? existingPd.admin_fee ?? 850

  const updatedPricingData = {
    ...existingPd,
    // Ensure PricingInputs-compatible fields for present-view
    proposal_type: existingPd.proposal_type ?? 'windows',
    windows_project_value: packagePrice,
    num_windows: existingPd.num_windows ?? 10,
    num_doors: existingPd.num_doors ?? 0,
    line_items: [],
    project_value: 0,
    admin_fee_enabled: true,
    admin_fee_amount: adminFeeAmount,
    lead_paint_enabled: false,
    lead_paint_amount: 500,
    costco_revealed: false,
    costco_member: false,
    costco_executive: false,
    financing: 'none',
    deposit: 0,
    package_price: packagePrice,
    vendo_imported: true,
    // Corrected toggle state matching 37% total discount
    toggle_state: {
      promotion: '20_off',
      bnsn: '10_off',
      cash_incentive: true,
      costco_shop: false,
      costco_executive: false,
      financing: 'none',
    },
  }

  const { error: updateError } = await admin
    .from('proposals')
    .update({ pricing_data: updatedPricingData })
    .eq('id', PROPOSAL_ID)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    proposal_id: PROPOSAL_ID,
    package_price: packagePrice,
    admin_fee: adminFeeAmount,
    toggle_state: updatedPricingData.toggle_state,
  })
}
