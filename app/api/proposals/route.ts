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

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = new URL(request.url).searchParams.get('status')
  const admin = getSupabaseAdmin()

  let query = admin
    .from('proposals')
    .select('id, customer_name, customer_first_name, customer_last_name, type, status, your_price, lead_id, created_at, updated_at')
    .eq('rep_id', user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  console.log('STEP 1: Route hit')

  try {
    const body = await request.json()
    console.log('STEP 2: Body parsed')

    const user = await getUser()
    console.log('STEP 3: User result:', user?.id ?? 'null')
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    console.log('STEP 4: Admin client created')

  const pricing = body.pricing_data ?? {}
  const calc = pricing.proposal_type ? calcPrice(pricing) : null

  const customer_name = [body.customer_first_name, body.customer_last_name].filter(Boolean).join(' ')
    || body.customer_name || 'Unknown'

  const insertData = {
    rep_id: user.id,
    lead_id: body.lead_id || null,
    customer_name,
    customer_first_name: body.customer_first_name || null,
    customer_last_name: body.customer_last_name || null,
    customer_email: body.customer_email || null,
    customer_phone: body.customer_phone || null,
    customer_address: body.customer_address || null,
    customer_city: body.customer_city || null,
    customer_state: body.customer_state || null,
    customer_zip: body.customer_zip || null,
    spouse_first_name: body.spouse_first_name || null,
    spouse_last_name: body.spouse_last_name || null,
    type: body.type || 'windows',
    status: body.status || 'draft',
    your_price: calc?.your_price ?? body.your_price ?? 0,
    internal_notes: body.internal_notes || null,
    offer_expiration_date: body.offer_expiration_date || null,
    pricing_data: pricing,
    public_token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
  }

  console.log('INSERT ATTEMPT:', JSON.stringify(insertData, null, 2))

  const { data: proposal, error } = await admin
    .from('proposals')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('SUPABASE ERROR CODE:', error.code)
    console.error('SUPABASE ERROR MSG:', error.message)
    console.error('SUPABASE ERROR DETAILS:', error.details)
    console.error('SUPABASE ERROR HINT:', error.hint)
    console.error('INSERT DATA:', JSON.stringify(insertData))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!proposal?.id) {
    return NextResponse.json({ error: 'No proposal returned' }, { status: 500 })
  }

  // If linked to a lead, update lead status and log activity
  if (body.lead_id) {
    await admin.from('leads').update({ status: 'proposed' }).eq('id', body.lead_id).eq('rep_id', user.id)
    try {
      await admin.from('lead_activity').insert({
        lead_id: body.lead_id,
        rep_id: user.id,
        event_type: 'proposal_created',
        description: `Proposal created — ${proposal.type} — $${proposal.your_price?.toLocaleString()}`,
      })
    } catch {}
  }

    return NextResponse.json({ id: proposal.id }, { status: 201 })
  } catch (err: any) {
    console.error('STEP CRASHED:', err?.message ?? String(err))
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
