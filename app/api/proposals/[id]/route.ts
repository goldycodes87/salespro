export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { calcPrice } from '@/lib/pricing'

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  const updates: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }

  if (body.pricing_data?.proposal_type) {
    const calc = calcPrice(body.pricing_data)
    updates.your_price = calc.your_price
  }

  if (body.status === 'signed' && body.lead_id) {
    await admin.from('leads').update({ status: 'closed' }).eq('id', body.lead_id).eq('rep_id', user.id)
    try {
      await admin.from('lead_activity').insert({
        lead_id: body.lead_id,
        rep_id: user.id,
        event_type: 'proposal_booked',
        description: 'Proposal marked as Booked',
      })
    } catch {}
  }

  const { data, error } = await admin
    .from('proposals')
    .update(updates)
    .eq('id', id)
    .eq('rep_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
