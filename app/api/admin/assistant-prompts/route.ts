export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const { data: prompts } = await admin
    .from('assistant_prompts')
    .select('*')
    .order('prompt_key')
  return NextResponse.json({ prompts: prompts ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const admin = getSupabaseAdmin()

  await admin.from('assistant_prompts').upsert(
    { ...body, updated_at: new Date().toISOString(), updated_by: user.id },
    { onConflict: 'prompt_key' },
  )

  return NextResponse.json({ ok: true })
}
