export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getMTStartOfDay } from '@/lib/time'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/reps/usage — API usage this calendar month
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('api_usage_log')
    .select('service, estimated_cost_usd')
    .eq('rep_id', user.id)
    .gte('created_at', monthStart)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const byService: Record<string, { count: number; cost: number }> = {}
  let totalCost = 0

  for (const row of rows) {
    const svc = row.service ?? 'unknown'
    if (!byService[svc]) byService[svc] = { count: 0, cost: 0 }
    byService[svc].count++
    byService[svc].cost += row.estimated_cost_usd ?? 0
    totalCost += row.estimated_cost_usd ?? 0
  }

  return NextResponse.json({ byService, totalCost, count: rows.length })
}
