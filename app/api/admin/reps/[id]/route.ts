export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = getSupabaseAdmin()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [repRes, proposalsRes, coachConfigRes, messagesCountRes, lastMessageRes, usageRes] = await Promise.all([
    admin.from('reps').select('*').eq('id', id).single(),
    admin.from('proposals').select('id, customer_name, pricing_data, your_price, status, created_at').eq('rep_id', id).order('created_at', { ascending: false }).limit(10),
    admin.from('coach_config').select('active_persona_id').eq('rep_id', id).maybeSingle(),
    admin.from('coach_messages').select('id', { count: 'exact', head: true }).eq('rep_id', id),
    admin.from('coach_messages').select('created_at').eq('rep_id', id).order('created_at', { ascending: false }).limit(1),
    admin.from('api_usage_log').select('service, estimated_cost_usd').eq('rep_id', id).gte('created_at', monthStart),
  ])

  const usageByService: Record<string, { count: number; cost: number }> = {}
  for (const row of (usageRes.data ?? [])) {
    const svc = row.service ?? 'unknown'
    if (!usageByService[svc]) usageByService[svc] = { count: 0, cost: 0 }
    usageByService[svc].count++
    usageByService[svc].cost += row.estimated_cost_usd ?? 0
  }

  return NextResponse.json({
    rep: repRes.data,
    proposals: proposalsRes.data ?? [],
    coach: {
      active_persona_id: coachConfigRes.data?.active_persona_id,
      message_count: messagesCountRes.count ?? 0,
      last_session: lastMessageRes.data?.[0]?.created_at
        ? new Date(lastMessageRes.data[0].created_at).toLocaleDateString()
        : null,
    },
    usage: usageByService,
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  const updates: Record<string, any> = {}
  if ('is_active' in body) updates.is_active = body.is_active
  if ('active' in body) {
    updates.active = body.active
    updates.cancelled_at = body.active ? null : new Date().toISOString()
  }
  if ('is_admin' in body) updates.is_admin = body.is_admin
  if ('full_name' in body) updates.full_name = body.full_name
  if ('phone' in body) updates.phone = body.phone

  await admin.from('reps').update(updates).eq('id', id)
  return NextResponse.json({ ok: true })
}
