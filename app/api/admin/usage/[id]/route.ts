export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: recent } = await admin
    .from('api_usage_log')
    .select('id, service, endpoint, estimated_cost_usd, created_at, error_message')
    .eq('rep_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ recent: recent ?? [] })
}
