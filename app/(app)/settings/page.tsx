import { createClient } from '@/lib/supabase/server'
import SettingsPage from '@/components/settings/settings-page'
import { redirect } from 'next/navigation'

export default async function Settings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [repResult, usageResult] = await Promise.all([
    supabase.from('reps').select('*').eq('id', user.id).single(),
    supabase
      .from('api_usage_log')
      .select('service, estimated_cost_usd')
      .eq('rep_id', user.id)
      .gte('created_at', monthStart),
  ])

  const rep = repResult.data ?? { id: user.id, email: user.email }

  const rows = usageResult.data ?? []
  const byService: Record<string, { count: number; cost: number }> = {}
  let totalCost = 0
  for (const row of rows) {
    const svc = row.service ?? 'unknown'
    if (!byService[svc]) byService[svc] = { count: 0, cost: 0 }
    byService[svc].count++
    byService[svc].cost += row.estimated_cost_usd ?? 0
    totalCost += row.estimated_cost_usd ?? 0
  }

  return (
    <SettingsPage
      rep={rep}
      usage={{ byService, totalCost, count: rows.length }}
    />
  )
}
