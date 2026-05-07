export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = 'Sp'
  for (let i = 0; i < 6; i++) password += chars[Math.floor(Math.random() * chars.length)]
  return password
}

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [repsRes, proposalStatsRes, usageRes] = await Promise.all([
    admin.from('reps').select('id, full_name, email, phone, settings, is_admin, is_active, created_at').order('created_at', { ascending: false }),
    admin.from('proposals').select('rep_id, status'),
    admin.from('api_usage_log').select('rep_id, estimated_cost_usd').gte('created_at', monthStart),
  ])

  const reps = repsRes.data ?? []
  const proposals = proposalStatsRes.data ?? []
  const usage = usageRes.data ?? []

  // Compute stats per rep
  const stats = reps.map(rep => {
    const repProposals = proposals.filter((p: any) => p.rep_id === rep.id)
    const signed = repProposals.filter((p: any) => p.status === 'signed').length
    const monthCost = usage.filter((u: any) => u.rep_id === rep.id).reduce((s: number, u: any) => s + (u.estimated_cost_usd ?? 0), 0)
    return { rep_id: rep.id, proposal_count: repProposals.length, signed_count: signed, month_cost: monthCost }
  })

  return NextResponse.json({ reps, stats })
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, email, phone, company, sendWelcomeEmail } = await request.json()
  if (!full_name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const tempPassword = generateTempPassword()
  const admin = getSupabaseAdmin()

  // Create Supabase auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // Update reps row (trigger creates it)
  await new Promise(resolve => setTimeout(resolve, 500))
  await admin.from('reps').update({
    full_name,
    phone: phone?.replace(/\D/g, '') || null,
    settings: { company_name: company ?? 'Lifetime Home Remodeling' },
  }).eq('id', userId)

  // Send welcome email
  if (sendWelcomeEmail && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://salespro-lake.vercel.app'
    await resend.emails.send({
      from: 'SalesPro <noreply@salespro-lake.vercel.app>',
      to: email,
      subject: 'Welcome to SalesPro!',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0F1E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#06B6D4);border-radius:16px;padding:12px 24px;">
      <span style="color:#fff;font-size:20px;font-weight:700;">SalesPro</span>
    </div>
  </div>
  <div style="background:#111827;border-radius:24px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
    <p style="color:#9CA3AF;font-size:15px;margin:0 0 8px;">Hi ${full_name},</p>
    <p style="color:#F9FAFB;font-size:17px;font-weight:600;margin:0 0 24px;">Your SalesPro account is ready.</p>
    <div style="background:rgba(29,78,216,0.08);border:1px solid rgba(29,78,216,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Login Details</p>
      <p style="color:#D1D5DB;font-size:14px;margin:0 0 8px;">🌐 <strong>${siteUrl}</strong></p>
      <p style="color:#D1D5DB;font-size:14px;margin:0 0 8px;">📧 <strong>${email}</strong></p>
      <p style="color:#D1D5DB;font-size:14px;margin:0;">🔑 Temp password: <strong style="font-family:monospace;color:#60A5FA;">${tempPassword}</strong></p>
    </div>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;">Please change your password after first login.</p>
    <div style="text-align:center;">
      <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#0F766E);color:#fff;text-decoration:none;padding:14px 32px;border-radius:14px;font-weight:600;font-size:15px;">Login to SalesPro →</a>
    </div>
  </div>
</div></body></html>`,
    })
  }

  return NextResponse.json({ ok: true, userId })
}
