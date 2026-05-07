export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [usageRes, repsRes] = await Promise.all([
    admin.from('api_usage_log').select('rep_id, service, estimated_cost_usd').gte('created_at', monthStart),
    admin.from('reps').select('id, full_name, email'),
  ])

  const rows = usageRes.data ?? []
  const reps = repsRes.data ?? []

  const summary = { total: 0, anthropic: 0, google: 0, openai: 0 }
  const repMap: Record<string, { anthropic: number; google: number; openai: number; total: number }> = {}

  for (const row of rows) {
    const cost = row.estimated_cost_usd ?? 0
    summary.total += cost
    if (row.service === 'anthropic') summary.anthropic += cost
    else if (row.service === 'google_maps') summary.google += cost
    else if (row.service === 'openai') summary.openai += cost

    if (!repMap[row.rep_id]) repMap[row.rep_id] = { anthropic: 0, google: 0, openai: 0, total: 0 }
    repMap[row.rep_id].total += cost
    if (row.service === 'anthropic') repMap[row.rep_id].anthropic += cost
    else if (row.service === 'google_maps') repMap[row.rep_id].google += cost
    else if (row.service === 'openai') repMap[row.rep_id].openai += cost
  }

  const repUsage = reps.map((rep: any) => ({
    rep_id: rep.id,
    name: rep.full_name,
    email: rep.email,
    ...(repMap[rep.id] ?? { anthropic: 0, google: 0, openai: 0, total: 0 }),
  })).filter((r: any) => r.total > 0)

  return NextResponse.json({ summary, reps: repUsage })
}
