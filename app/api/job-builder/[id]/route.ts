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

// GET /api/job-builder/[id]
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
    .not('job_type_config_id', 'is', null)
    .neq('status', 'archived')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PUT /api/job-builder/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  const calcResult = body.calculator_result ?? {}

  // Build pricing_data for update
  const pricing_data = {
    source: 'job_builder',
    base_price: body.base_price,
    enabled_tier_ids: body.enabled_tier_ids ?? [],
    cash_enabled: body.cash_enabled ?? false,
    financing_id: body.financing_id ?? null,
    charged_amount: body.charged_amount ?? null,
    rebate_enabled: body.rebate_enabled ?? false,
    rebate_tier_ids: body.rebate_tier_ids ?? [],
    calculator_result: calcResult,
  }

  const { data, error } = await admin
    .from('proposals')
    .update({
      customer_first_name: body.customer_first_name?.trim(),
      customer_last_name: body.customer_last_name?.trim(),
      customer_name: [body.customer_first_name, body.customer_last_name].filter(Boolean).join(' ').trim() || undefined,
      customer_email: body.customer_email || null,
      customer_phone: body.customer_phone || null,
      customer_address: body.customer_address || null,
      job_type_config_id: body.job_type_config_id,
      job_type_snapshot: body.job_type_snapshot,
      scope_of_work: body.scope_of_work || null,
      pricing_data,
      your_price: calcResult.customer_price ?? 0,
      status: body.status ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('rep_id', user.id)
    .not('job_type_config_id', 'is', null)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/job-builder/[id] — soft delete via archived status
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { error } = await admin
    .from('proposals')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('rep_id', user.id)
    .not('job_type_config_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
