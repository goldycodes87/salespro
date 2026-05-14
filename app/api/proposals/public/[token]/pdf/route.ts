export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { renderToStream } from '@react-pdf/renderer'
import ProposalPDF from '@/components/pdf/ProposalPDF'
import React from 'react'

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
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const admin = getSupabaseAdmin()

  const { data: proposal, error } = await admin
    .from('proposals')
    .select('*')
    .eq('public_token', token)
    .single()

  if (error || !proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: rep } = await admin
    .from('reps')
    .select('full_name, name, company, phone, email, settings, headshot_url, industry')
    .eq('id', proposal.rep_id)
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

  const pd2 = proposal.pricing_data || {}
  const tg2 = pd2.toggle_state || {}
  const af2 = pd2.admin_fee_enabled !== false ? (pd2.admin_fee_amount || pd2.admin_fee || 850) : 0
  const pp2 = pd2.package_price > 0 ? pd2.package_price : pd2.windows_project_value > 0 ? pd2.windows_project_value : Number(proposal.package_price) || 0
  const db2 = pp2 - af2
  const dl2: { label: string; amount: number }[] = []
  if (tg2.promotion === '20_off') dl2.push({ label: 'Package Discount (20%)', amount: Math.round(db2 * 0.20) })
  if (tg2.promotion === '25_off') dl2.push({ label: 'Package Discount (25%)', amount: Math.round(db2 * 0.25) })
  if (tg2.bnsn === '10_off') dl2.push({ label: 'Buy Now Save Now (10%)', amount: Math.round(db2 * 0.10) })
  if (tg2.bnsn === '5_off') dl2.push({ label: 'Buy Now Save Now (5%)', amount: Math.round(db2 * 0.05) })
  if (tg2.cash_incentive === true) dl2.push({ label: 'Cash Incentive (7%)', amount: Math.round(db2 * 0.07) })
  if (dl2.length === 0 && pd2.discount_amount > 0) dl2.push({ label: pd2.discount_name || 'Promotional Discount', amount: pd2.discount_amount })
  const ts2 = dl2.reduce((s, d) => s + d.amount, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(
    React.createElement(ProposalPDF, { proposal, repSettings, discountLines: dl2, totalSavings: ts2 }) as any,
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
