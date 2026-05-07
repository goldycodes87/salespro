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

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('coach_config')
    .select('active_persona_id')
    .eq('rep_id', user.id)
    .maybeSingle()

  console.log('COACH CONFIG FETCHED:', JSON.stringify({ data, error, userId: user.id }))

  return NextResponse.json({ active_persona_id: data?.active_persona_id ?? null })
}

export async function PATCH(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  console.log('SAVING CONFIG:', JSON.stringify({ body, userId: user.id }))

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('coach_config').upsert(
    { rep_id: user.id, active_persona_id: body.active_persona_id },
    { onConflict: 'rep_id' },
  ).select()

  console.log('SAVE RESULT:', JSON.stringify({ data, error }))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
