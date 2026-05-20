export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [usageRes, repsRes] = await Promise.all([
    admin
      .from('api_usage_log')
      .select('rep_id, service, estimated_cost_usd, created_at, response_time_ms, error_message')
      .gte('created_at', monthStart),
    admin.from('reps').select('id, full_name, email'),
  ])

  const rows = usageRes.data ?? []
  const reps = repsRes.data ?? []

  // ─── By-service aggregates ──────────────────────────────────────────────────
  const serviceMap: Record<string, {
    calls_today: number; calls_mtd: number
    cost_today: number; cost_mtd: number
    response_times: number[]; errors: number
  }> = {}

  // ─── By-rep aggregates ──────────────────────────────────────────────────────
  const repMap: Record<string, {
    anthropic: number; google: number; openai: number; total: number
    cost_today: number; calls_today: number
    service_counts: Record<string, number>
  }> = {}

  let totalToday = 0

  for (const row of rows) {
    const cost = row.estimated_cost_usd ?? 0
    const svc = row.service ?? 'unknown'
    const isToday = row.created_at >= todayStart

    if (!serviceMap[svc]) {
      serviceMap[svc] = { calls_today: 0, calls_mtd: 0, cost_today: 0, cost_mtd: 0, response_times: [], errors: 0 }
    }
    serviceMap[svc].calls_mtd++
    serviceMap[svc].cost_mtd += cost
    if (isToday) {
      serviceMap[svc].calls_today++
      serviceMap[svc].cost_today += cost
      totalToday += cost
    }
    if ((row as any).response_time_ms) serviceMap[svc].response_times.push((row as any).response_time_ms)
    if (row.error_message) serviceMap[svc].errors++

    if (!repMap[row.rep_id]) {
      repMap[row.rep_id] = { anthropic: 0, google: 0, openai: 0, total: 0, cost_today: 0, calls_today: 0, service_counts: {} }
    }
    repMap[row.rep_id].total += cost
    if (svc === 'anthropic') repMap[row.rep_id].anthropic += cost
    else if (svc === 'google_maps') repMap[row.rep_id].google += cost
    else if (svc === 'openai') repMap[row.rep_id].openai += cost
    if (isToday) {
      repMap[row.rep_id].cost_today += cost
      repMap[row.rep_id].calls_today++
    }
    repMap[row.rep_id].service_counts[svc] = (repMap[row.rep_id].service_counts[svc] ?? 0) + 1
  }

  const summary = {
    total: rows.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0),
    anthropic: serviceMap['anthropic']?.cost_mtd ?? 0,
    google: serviceMap['google_maps']?.cost_mtd ?? 0,
    openai: serviceMap['openai']?.cost_mtd ?? 0,
    today: totalToday,
  }

  const byService = Object.entries(serviceMap).map(([service, d]) => ({
    service,
    calls_today: d.calls_today,
    calls_mtd: d.calls_mtd,
    cost_today: d.cost_today,
    cost_mtd: d.cost_mtd,
    avg_response_ms: d.response_times.length
      ? Math.round(d.response_times.reduce((a, b) => a + b, 0) / d.response_times.length)
      : null,
    success_rate: d.calls_mtd > 0
      ? ((d.calls_mtd - d.errors) / d.calls_mtd * 100).toFixed(1)
      : '100.0',
  })).sort((a, b) => b.cost_mtd - a.cost_mtd)

  const repUsage = reps
    .map((rep: any) => {
      const d = repMap[rep.id]
      if (!d) return null
      const topService = Object.entries(d.service_counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      return {
        rep_id: rep.id,
        full_name: rep.full_name,
        email: rep.email,
        anthropic: d.anthropic,
        google: d.google,
        openai: d.openai,
        total: d.total,
        cost_today: d.cost_today,
        calls_today: d.calls_today,
        top_service: topService,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.total - a.total)

  const repAlerts = repUsage.filter((r: any) => r.cost_today > 5)
  const platformAlert = totalToday > 20

  return NextResponse.json({
    summary,
    byService,
    reps: repUsage,
    alerts: { repAlerts, platformAlert },
  })
}
