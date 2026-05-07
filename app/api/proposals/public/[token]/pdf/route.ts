export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { renderToStream } from '@react-pdf/renderer'
import ProposalPDF from '@/components/pdf/ProposalPDF'
import React from 'react'

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
    .select('full_name, name, settings')
    .eq('id', proposal.rep_id)
    .single()

  const repName = rep?.full_name ?? rep?.name ?? ''
  const repSettings = {
    ...(rep?.settings ?? {}),
    rep_name: repName,
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
