export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

const COACH_VOICES: Record<string, string> = {
  jordan:    '7WggD3IoWTIPT19PNyrW',
  victoria:  'NHRgOEwqx5WZNClv5sat',
  coach_ray: '3jR9BuQAOPMWUjWpi0ll',
  noel:      'X03mvPuTfprif8QBAVeJ',
}

const WELCOME_MESSAGES: Record<string, (name: string) => string> = {
  jordan:    (n) => `Hey ${n}. I'm Jordan. I've been watching sales reps like you for 25 years. I already know you're capable of more. Let's prove it.`,
  victoria:  (n) => `Let's be direct, ${n}. I don't do average and neither should you. I'm here to make you the top closer on your team. Ready?`,
  coach_ray: (n) => `LET'S GO ${n}! Coach Ray here and I am FIRED UP to work with you. Every appointment is a game. I'm your coach. Let's WIN some games!`,
  noel:      (n) => `Hello ${n}. I've already been thinking about your strategy. The data doesn't lie and neither do I. Let's build a system that closes.`,
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    firstName, lastName, phone, company, position, territory, industry,
    coachPersona, headshotUrl,
    assistantEnabled, assistantName, assistantVoiceId,
    assistantCapabilities, assistantQualifyingCriteria,
    phoneNumberType, selectedPhoneNumber,
    subscriptionTier,
  } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`
  const persona  = coachPersona || 'jordan'
  const admin    = getSupabaseAdmin()

  // 1. Upsert rep
  const { error: repError } = await admin.from('reps').upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      position: position?.trim() || null,
      territory: territory?.trim() || null,
      industry: industry || null,
      headshot_url: headshotUrl || null,
      subscription_tier: subscriptionTier || 'payg',
      trial_started_at: new Date().toISOString(),
      assistant_config: {
        enabled: assistantEnabled ?? true,
        name: assistantName || 'Alex',
        voice_id: assistantVoiceId || null,
        capabilities: assistantCapabilities || [],
        qualifying_criteria: assistantQualifyingCriteria || null,
        phone_type: phoneNumberType || null,
        business_number: selectedPhoneNumber || null,
      },
      settings: {
        company_name: company?.trim() || null,
        rep_title: position?.trim() || null,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (repError) return NextResponse.json({ error: repError.message }, { status: 500 })

  // 2. Upsert coach_config with 11Labs voice
  await admin.from('coach_config').upsert(
    {
      rep_id: user.id,
      active_persona_id: persona,
      persona,
      voice_id: COACH_VOICES[persona] ?? COACH_VOICES.jordan,
    },
    { onConflict: 'rep_id' },
  )

  // 3. Insert coach welcome message
  const welcomeContent = (WELCOME_MESSAGES[persona] ?? WELCOME_MESSAGES.jordan)(firstName.trim())
  void admin.from('coach_messages').insert({
    rep_id: user.id,
    persona_id: persona,
    role: 'assistant',
    content: welcomeContent,
  })

  // 4. Send admin notification (fire and forget)
  void (async () => {
    if (!process.env.RESEND_API_KEY) return
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozrhq.com'
      await resend.emails.send({
        from: 'Clozr <onboarding@clozrhq.com>',
        to: 'grant@goldberglawcenter.com',
        subject: `New rep joined Clozr: ${fullName}`,
        html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0A0F1E;font-family:-apple-system,sans-serif;color:#F9FAFB;">
  <div style="max-width:480px;margin:0 auto;">
    <h2 style="color:#60A5FA;margin:0 0 16px;">New Rep Joined Clozr</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#9CA3AF;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${fullName}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Company</td><td style="padding:8px 0;">${company || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Industry</td><td style="padding:8px 0;">${industry || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Plan</td><td style="padding:8px 0;font-weight:600;color:#06B6D4;">${subscriptionTier === 'unlimited' ? 'Unlimited' : 'Pay As You Go'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Coach</td><td style="padding:8px 0;">${persona}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Phone type</td><td style="padding:8px 0;">${phoneNumberType || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Trial started</td><td style="padding:8px 0;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>
    </table>
    <div style="margin-top:24px;">
      <a href="${baseUrl}/admin/reps"
         style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#06B6D4);color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:14px;">
        View in Admin →
      </a>
    </div>
  </div>
</body>
</html>`,
      })
    } catch (e) {
      console.error('Admin notification email failed:', e)
    }
  })()

  // 5. Check if admin
  const { data: repRow } = await admin.from('reps').select('is_admin').eq('id', user.id).single()

  const res = NextResponse.json({ success: true })
  res.cookies.set('clozr_onboarded', 'true', { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false, sameSite: 'lax' })
  res.cookies.set('clozr_admin', repRow?.is_admin ? 'true' : 'false', { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false, sameSite: 'lax' })
  return res
}
