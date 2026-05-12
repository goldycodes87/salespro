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

  const pd = proposal.pricing_data || {}
  console.log('PDF PRICING DATA:', JSON.stringify(pd, null, 2))
  console.log('TOGGLE STATE:', JSON.stringify(pd.toggle_state))
  console.log('DISCOUNT AMOUNT:', pd.discount_amount)
  console.log('YOUR PRICE:', proposal.your_price, pd.your_price)

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
    React.createElement(ProposalPDF, { proposal, repSettings }) as any,
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
