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

async function verifyOwnership(proposalId: string, repId: string) {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('rep_id', repId)
    .single()
  return !!data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await verifyOwnership(id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('proposal_renders')
    .select('*')
    .eq('proposal_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await verifyOwnership(id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('proposal_renders')
    .insert({
      proposal_id: id,
      rep_id: user.id,
      image_url: body.image_url,
      color_name: body.color_name ?? null,
      color_hex: body.color_hex ?? null,
      lead_photo_path: body.lead_photo_path ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
