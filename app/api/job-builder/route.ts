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

// GET /api/job-builder — list all jobs for rep
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = new URL(request.url).searchParams.get('status')
  const admin = getSupabaseAdmin()

  let query = admin
    .from('proposals')
    .select('id, customer_first_name, customer_last_name, customer_name, status, your_price, base_price, job_type_snapshot, created_at, updated_at')
    .eq('rep_id', user.id)
    .not('job_type_config_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/job-builder — create new job
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.job_type_config_id) return NextResponse.json({ error: 'Job type required' }, { status: 400 })
  if (!body.base_price || body.base_price <= 0) return NextResponse.json({ error: 'Base price required' }, { status: 400 })
  if (!body.customer_first_name?.trim()) return NextResponse.json({ error: 'First name required' }, { status: 400 })
  if (!body.customer_last_name?.trim()) return NextResponse.json({ error: 'Last name required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const customer_name = `${body.customer_first_name.trim()} ${body.customer_last_name.trim()}`
  const calcResult = body.calculator_result ?? {}

  const { data, error } = await admin
    .from('proposals')
    .insert({
      rep_id: user.id,
      lead_id: body.lead_id || null,
      customer_name,
      customer_first_name: body.customer_first_name.trim(),
      customer_last_name: body.customer_last_name.trim(),
      customer_email: body.customer_email || null,
      customer_phone: body.customer_phone || null,
      customer_address: body.customer_address || null,
      job_type_config_id: body.job_type_config_id,
      job_type_snapshot: body.job_type_snapshot || null,
      base_price: body.base_price,
      scope_of_work: body.scope_of_work || null,
      enabled_tier_ids: body.enabled_tier_ids ?? [],
      cash_enabled: body.cash_enabled ?? false,
      financing_id: body.financing_id || null,
      charged_amount: body.charged_amount || null,
      rebate_enabled: body.rebate_enabled ?? false,
      rebate_tier_ids: body.rebate_tier_ids ?? [],
      calculator_result: calcResult,
      your_price: calcResult.customer_price ?? 0,
      type: (body.job_type_snapshot?.name ?? 'job').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      status: 'draft',
      public_token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    })
    .select('id, your_price')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.lead_id) {
    await admin.from('leads').update({ status: 'proposed' }).eq('id', body.lead_id).eq('rep_id', user.id)
    try {
      await admin.from('lead_activity').insert({
        lead_id: body.lead_id,
        rep_id: user.id,
        event_type: 'proposal_created',
        description: `Job created — ${body.job_type_snapshot?.name ?? 'Job'} — $${(data.your_price ?? 0).toLocaleString()}`,
      })
    } catch {}
  }

  return NextResponse.json({ id: data.id, customer_price: data.your_price }, { status: 201 })
}
