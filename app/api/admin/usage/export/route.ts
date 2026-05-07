export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const { data: rows } = await admin
    .from('api_usage_log')
    .select('created_at, rep_id, service, endpoint, tokens_used, estimated_cost_usd, reps(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(5000)

  const header = 'date,rep_name,rep_email,service,endpoint,tokens_used,cost\n'
  const csvRows = (rows ?? []).map((r: any) =>
    [
      new Date(r.created_at).toISOString(),
      (r.reps as any)?.full_name ?? '',
      (r.reps as any)?.email ?? '',
      r.service ?? '',
      r.endpoint ?? '',
      r.tokens_used ?? '',
      (r.estimated_cost_usd ?? 0).toFixed(6),
    ].join(',')
  ).join('\n')

  return new NextResponse(header + csvRows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="usage-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
