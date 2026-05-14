export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

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

export async function POST(
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

  const toEmail = proposal.customer_email
  if (!toEmail) return NextResponse.json({ error: 'No customer email on file' }, { status: 400 })

  const firstName = proposal.customer_first_name || proposal.customer_name?.split(' ')[0] || 'there'
  const address = [proposal.customer_address, proposal.customer_city, proposal.customer_state].filter(Boolean).join(', ')
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clozrhq.com'}/p/${proposal.public_token}`

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
      <div style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#06B6D4);border-radius:16px;padding:10px 22px;"><span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">Clozr</span></div>
    </div>
    <div style="background:#111827;border-radius:24px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
      <p style="color:#9CA3AF;font-size:15px;margin:0 0 8px;">Hi ${firstName},</p>
      <p style="color:#F9FAFB;font-size:17px;margin:0 0 24px;">Here's the proposal we reviewed together.</p>
      <div style="text-align:center;margin:24px 0;">
        <p style="color:#6B7280;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Your Price</p>
        <p style="color:#F9FAFB;font-size:40px;font-weight:700;font-family:'Courier New',monospace;margin:0;">$${(proposal.your_price ?? 0).toLocaleString()}</p>
        ${monthlyLine}
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${publicUrl}" style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#0F766E);color:#fff;text-decoration:none;padding:14px 32px;border-radius:14px;font-weight:600;font-size:15px;">View Your Full Proposal →</a>
      </div>
    </div>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
      <p style="color:#6B7280;font-size:13px;margin:0 0 4px;font-weight:600;">Eric Goldberg</p>
      <p style="color:#4B5563;font-size:12px;margin:0;">eric@lifetimewindows.com &nbsp;|&nbsp; Cell: 719-213-4566 &nbsp;|&nbsp; Office: 303-934-4508</p>
    </div>
  </div>
</body>
</html>`

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Clozr <noreply@clozrhq.com>',
        to: toEmail,
        subject: `Your Home Improvement Proposal — ${address || 'Your Project'}`,
        html: emailHtml,
      })
    }
  } catch (err) {
    console.error('Resend error:', err)
  }

  return NextResponse.json({ sent: true, to: toEmail })
}
