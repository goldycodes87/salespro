export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const admin_supabase = getSupabaseAdmin()
  const { data: voices } = await admin_supabase
    .from('voice_configs')
    .select('*')
    .order('sort_order')
  return NextResponse.json({ voices: voices ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const admin_supabase = getSupabaseAdmin()
  const { data, error } = await admin_supabase
    .from('voice_configs')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ voice: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { config_key, ...updates } = await req.json()
  const admin_supabase = getSupabaseAdmin()
  await admin_supabase.from('voice_configs').update(updates).eq('config_key', config_key)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { config_key } = await req.json()
  const admin_supabase = getSupabaseAdmin()
  await admin_supabase.from('voice_configs').delete().eq('config_key', config_key)
  return NextResponse.json({ ok: true })
}
