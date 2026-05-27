export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/reps — current rep profile
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('reps')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const res = NextResponse.json(data)
  if (data?.is_admin) {
    res.cookies.set('clozr_admin', 'true', {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }
  return res
}

// PATCH /api/reps — update profile + settings
export async function PATCH(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const admin = getSupabaseAdmin()

  const allowed: Record<string, unknown> = {}
  if ('full_name' in body) allowed.full_name = body.full_name
  if ('phone' in body) allowed.phone = body.phone
  if ('settings' in body) allowed.settings = body.settings
  if ('assistant_config' in body) allowed.assistant_config = body.assistant_config
  if ('industries' in body) allowed.industries = body.industries
  if ('territory' in body) allowed.territory = body.territory
  if ('uses_external_quoting' in body) allowed.uses_external_quoting = body.uses_external_quoting

  const { data, error } = await admin
    .from('reps')
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
