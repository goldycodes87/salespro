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

const WELCOME_MESSAGES: Record<string, (name: string) => string> = {
  jordan:   (n) => `Hey ${n}. I'm Jordan. I've been watching sales reps like you for 25 years. I already know you're capable of more. Let's prove it.`,
  victoria: (n) => `Let's be direct, ${n}. I don't do average and neither should you. I'm here to make you the top closer on your team. Ready?`,
  ray:      (n) => `LET'S GO ${n}! Coach Ray here and I am FIRED UP to work with you. Every appointment is a game. I'm your coach. Let's WIN some games!`,
  noel:     (n) => `Hello ${n}. I've already been thinking about your strategy. The data doesn't lie and neither do I. Let's build a system that closes.`,
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { firstName, lastName, company, position, territory, industry, coachPersona } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`
  const admin = getSupabaseAdmin()

  // 1. Upsert rep
  const { error: repError } = await admin.from('reps').upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email,
      company: company?.trim() || null,
      position: position?.trim() || null,
      territory: territory?.trim() || null,
      industry: industry || null,
      settings: { company_name: company?.trim() || null, rep_title: position?.trim() || null },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (repError) return NextResponse.json({ error: repError.message }, { status: 500 })

  // 2. Upsert coach_config
  const persona = coachPersona || 'jordan'
  await admin.from('coach_config').upsert(
    { rep_id: user.id, active_persona_id: persona },
    { onConflict: 'rep_id' },
  )

  // 3. Insert coach welcome message (so it's pre-loaded in /coach)
  const welcomeContent = (WELCOME_MESSAGES[persona] ?? WELCOME_MESSAGES.jordan)(firstName.trim())
  void admin.from('coach_messages').insert({
    rep_id: user.id,
    persona_id: persona,
    role: 'assistant',
    content: welcomeContent,
  })

  // 4. Send admin notification email (fire and forget)
  void (async () => {
    if (!process.env.RESEND_API_KEY) return
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'grant@goldberglawcenter.com',
        subject: `New rep joined Clozr: ${fullName}`,
        html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0A0F1E;font-family:-apple-system,sans-serif;color:#F9FAFB;">
  <div style="max-width:480px;margin:0 auto;">
    <h2 style="color:#60A5FA;margin:0 0 16px;">New Rep Joined Clozr</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#9CA3AF;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${fullName}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Company</td><td style="padding:8px 0;">${company || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Position</td><td style="padding:8px 0;">${position || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Industry</td><td style="padding:8px 0;">${industry || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Territory</td><td style="padding:8px 0;">${territory || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Coach</td><td style="padding:8px 0;">${persona}</td></tr>
    </table>
    <div style="margin-top:24px;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clozrhq.com'}/admin/reps"
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

  const res = NextResponse.json({ success: true })
  res.cookies.set('clozr_onboarded', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  })
  return res
}
