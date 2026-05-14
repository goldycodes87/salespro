export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { renderToStream } from '@react-pdf/renderer'
import ProposalPDF from '@/components/pdf/ProposalPDF'
import React from 'react'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function fetchHeadshotData(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    return `data:${contentType};base64,${b64}`
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: proposal, error } = await admin
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (error || !proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  console.log('=== PDF DEBUG START ===')
  console.log('PROPOSAL ID:', id)
  const pd = proposal.pricing_data || {}
  const toggles = pd.toggle_state || {}
  console.log('RAW PRICING_DATA:', JSON.stringify(proposal.pricing_data))
  console.log('PARSED PD:', JSON.stringify(pd))
  console.log('TOGGLE STATE:', JSON.stringify(toggles))
  console.log('PROMOTION:', toggles.promotion)
  console.log('BNSN:', toggles.bnsn)
  console.log('CASH:', toggles.cash_incentive)
  console.log('PACKAGE PRICE:', pd.package_price, proposal.package_price)
  console.log('YOUR PRICE:', pd.your_price, proposal.your_price)
  console.log('DISCOUNT AMOUNT:', pd.discount_amount)

  const adminFee = pd.admin_fee_enabled !== false
    ? (pd.admin_fee_amount || pd.admin_fee || 850)
    : 0
  const packagePrice =
    pd.package_price > 0
      ? pd.package_price
      : pd.windows_project_value > 0
        ? pd.windows_project_value
        : Number(proposal.package_price) || 0
  const discountableBase = packagePrice - adminFee

  const discountLines: { label: string; amount: number }[] = []
  if (toggles.promotion === '20_off') {
    discountLines.push({ label: 'Package Discount (20%)', amount: Math.round(discountableBase * 0.20) })
  }
  if (toggles.promotion === '25_off') {
    discountLines.push({ label: 'Package Discount (25%)', amount: Math.round(discountableBase * 0.25) })
  }
  if (toggles.bnsn === '10_off') {
    discountLines.push({ label: 'Buy Now Save Now (10%)', amount: Math.round(discountableBase * 0.10) })
  }
  if (toggles.bnsn === '5_off') {
    discountLines.push({ label: 'Buy Now Save Now (5%)', amount: Math.round(discountableBase * 0.05) })
  }
  if (toggles.cash_incentive === true) {
    discountLines.push({ label: 'Cash Incentive (7%)', amount: Math.round(discountableBase * 0.07) })
  }
  if (discountLines.length === 0 && pd.discount_amount > 0) {
    discountLines.push({ label: pd.discount_name || 'Promotional Discount', amount: pd.discount_amount })
  }
  const totalSavings = discountLines.reduce((sum, d) => sum + d.amount, 0)

  console.log('DISCOUNT LINES:', JSON.stringify(discountLines))
  console.log('TOTAL SAVINGS:', totalSavings)
  console.log('DISCOUNTABLE BASE:', discountableBase)
  console.log('=== PDF DEBUG END ===')

  const { data: rep } = await admin
    .from('reps')
    .select('full_name, name, company, phone, email, settings, headshot_url, industry')
    .eq('id', user.id)
    .single()

  const repName = rep?.full_name ?? rep?.name ?? ''
  const headshotData = rep?.headshot_url ? await fetchHeadshotData(rep.headshot_url) : null

  const repSettings = {
    ...(rep?.settings ?? {}),
    rep_name: repName,
    company: rep?.company ?? '',
    phone: rep?.phone ?? '',
    email: rep?.email ?? '',
    industry: rep?.industry ?? '',
    headshot_data: headshotData ?? undefined,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(
    React.createElement(ProposalPDF, { proposal, repSettings, discountLines, totalSavings }) as any,
  )

  const customerName = (proposal.customer_name ?? proposal.customer_last_name ?? 'Proposal')
    .replace(/[^a-zA-Z0-9]/g, '_')

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Proposal_${customerName}.pdf"`,
    },
  })
}
