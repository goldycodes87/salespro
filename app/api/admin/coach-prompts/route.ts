export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const { data: prompts } = await admin.from('coach_prompts').select('*').order('persona_id')
  return NextResponse.json({ prompts: prompts ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const admin = getSupabaseAdmin()

  await admin.from('coach_prompts').upsert(
    { ...body, updated_at: new Date().toISOString(), updated_by: user.id },
    { onConflict: 'persona_id' }
  )

  return NextResponse.json({ ok: true })
}
