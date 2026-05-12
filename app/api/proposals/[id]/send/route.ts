export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'
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
    return `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const type: 'ours' | 'vendo' | 'both' = body.type ?? 'ours'

  const admin = getSupabaseAdmin()

  const { data: proposal, error } = await admin
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (error || !proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const toEmail = proposal.customer_email
  if (!toEmail) return NextResponse.json({ error: 'No customer email on file' }, { status: 400 })

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

  const firstName = proposal.customer_first_name || proposal.customer_name?.split(' ')[0] || 'there'
  const address = [proposal.customer_address, proposal.customer_city, proposal.customer_state].filter(Boolean).join(', ')
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clozrhq.com'}/p/${proposal.public_token}`
  const proposalNum = proposal.proposal_number ?? ('SP-' + (proposal.id ?? '').slice(-4).toUpperCase())

  const pricing = proposal.pricing_data ?? {}
  let monthlyLine = ''
  if (pricing.financing && pricing.financing !== 'none') {
    const { calcPrice } = await import('@/lib/pricing')
    const calc = calcPrice(pricing)
    if (calc.monthly_payment > 0) {
      monthlyLine = `<p style="text-align:center;font-size:18px;color:#9CA3AF;margin:8px 0;">Or as low as <strong>$${Math.ceil(calc.monthly_payment).toLocaleString()}/mo</strong></p>`
    }
  }

  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#06B6D4);border-radius:16px;padding:12px 24px;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">Clozr</span>
      </div>
    </div>
    <div style="background:#111827;border-radius:24px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
      <p style="color:#9CA3AF;font-size:15px;margin:0 0 8px;">Hi ${firstName},</p>
      <p style="color:#F9FAFB;font-size:17px;margin:0 0 24px;">Here's the proposal we reviewed together — attached to this email and available online.</p>
      <div style="text-align:center;margin:24px 0;">
        <p style="color:#6B7280;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Your Investment</p>
        <p style="color:#F9FAFB;font-size:40px;font-weight:700;font-family:'Courier New',monospace;margin:0;">$${(proposal.your_price ?? 0).toLocaleString()}</p>
        ${monthlyLine}
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${publicUrl}" style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#0F766E);color:#fff;text-decoration:none;padding:14px 32px;border-radius:14px;font-weight:600;font-size:15px;">View Your Full Proposal →</a>
      </div>
    </div>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
      <p style="color:#6B7280;font-size:13px;margin:0 0 4px;font-weight:600;">${repName || 'Your Rep'}</p>
      <p style="color:#4B5563;font-size:12px;margin:0;">${rep?.email ?? ''} &nbsp;|&nbsp; ${rep?.phone ?? ''}</p>
    </div>
  </div>
</body>
</html>`

  const attachments: Array<{ filename: string; content: Buffer }> = []

  // Generate our proposal PDF
  if (type === 'ours' || type === 'both') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = await renderToStream(
        React.createElement(ProposalPDF, { proposal, repSettings }) as any,
      )
      const buf = await streamToBuffer(stream as NodeJS.ReadableStream)
      const customerName = (proposal.customer_name ?? proposal.customer_last_name ?? 'Proposal')
        .replace(/[^a-zA-Z0-9]/g, '_')
      attachments.push({ filename: `Proposal_${customerName}.pdf`, content: buf })
    } catch (err) {
      console.error('PDF generation error:', err)
    }
  }

  // Download Vendo PDF from storage
  if (type === 'vendo' || type === 'both') {
    const storagePath = pricing.vendo_pdf_storage_path as string | null
    if (storagePath) {
      try {
        const { data: fileData, error: dlError } = await admin.storage
          .from('lead-photos')
          .download(storagePath)
        if (!dlError && fileData) {
          const buf = Buffer.from(await fileData.arrayBuffer())
          attachments.push({ filename: `Vendo_Report_${proposalNum}.pdf`, content: buf })
        }
      } catch (err) {
        console.error('Vendo PDF download error:', err)
      }
    }
  }

  const subjectLabel = type === 'vendo' ? 'Vendo Report' : `Proposal ${proposalNum}`
  const subject = `Your Home Improvement ${subjectLabel} — ${address || 'Your Project'}`

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: toEmail,
        subject,
        html: emailHtml,
        attachments: attachments.map(a => ({ filename: a.filename, content: a.content })),
      })
    }
  } catch (err) {
    console.error('Resend error:', err)
  }

  await admin.from('proposals').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', id)

  if (proposal.lead_id) {
    const desc = type === 'both'
      ? `Proposal ${proposalNum} + Vendo Report sent to ${toEmail}`
      : type === 'vendo'
        ? `Vendo Report sent to ${toEmail}`
        : `Proposal ${proposalNum} sent to ${toEmail}`
    try {
      await admin.from('lead_activity').insert({
        lead_id: proposal.lead_id,
        rep_id: user.id,
        event_type: 'proposal_sent',
        description: desc,
      })
    } catch {}
  }

  return NextResponse.json({ sent: true, to: toEmail, type })
}
