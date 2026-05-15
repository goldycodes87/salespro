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

export async function PATCH(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dnd, meeting_mode, meeting_options } = await req.json()

  const admin = getSupabaseAdmin()
  const { data: rep } = await admin.from('reps').select('assistant_config').eq('id', user.id).single()
  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const updates: Record<string, any> = {}
  if (typeof dnd === 'boolean') updates.dnd = dnd
  if (typeof meeting_mode === 'boolean') updates.meeting_mode = meeting_mode
  if (meeting_options) updates.meeting_options = meeting_options

  await admin.from('reps').update({
    assistant_config: { ...(rep.assistant_config ?? {}), ...updates },
  }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
