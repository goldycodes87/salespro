export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { firstName, lastName, phone, company, personaId } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`
  const admin = getSupabaseAdmin()

  const { error: repError } = await admin.from('reps').upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email,
      phone: phone?.replace(/\D/g, '') || null,
      settings: { company: company?.trim() || 'Lifetime Home Remodeling' },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (repError) return NextResponse.json({ error: repError.message }, { status: 500 })

  if (personaId) {
    await admin.from('coach_config').upsert(
      { rep_id: user.id, active_persona_id: personaId },
      { onConflict: 'rep_id' },
    )
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('sp_onboarded', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  })
  return res
}
