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
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// PUT /api/settings/job-types/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: existing } = await admin
    .from('job_type_configs')
    .select('id')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { id: _id, rep_id: _rep_id, created_at: _ca, ...rest } = body

  const { data, error } = await admin
    .from('job_type_configs')
    .update({ ...rest, rep_id: user.id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('rep_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/settings/job-types/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: existing } = await admin
    .from('job_type_configs')
    .select('id')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const { data: proposals } = await admin
      .from('proposals')
      .select('id')
      .eq('job_type_config_id', id)
      .limit(1)

    if (proposals && proposals.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: proposals exist using this job type' },
        { status: 409 },
      )
    }
  } catch {
    // job_type_config_id column may not exist yet — allow delete
  }

  const { error } = await admin
    .from('job_type_configs')
    .delete()
    .eq('id', id)
    .eq('rep_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
