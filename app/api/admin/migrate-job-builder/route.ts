export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const PROJECT_REF = 'aaahfcbksuigvcxmcwyc'

const SQL = `
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS enabled_tier_ids text[],
  ADD COLUMN IF NOT EXISTS cash_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS financing_id text,
  ADD COLUMN IF NOT EXISTS charged_amount numeric,
  ADD COLUMN IF NOT EXISTS rebate_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rebate_tier_ids text[],
  ADD COLUMN IF NOT EXISTS calculator_result jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
`

export async function POST() {
  // Try Supabase Management API
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    })
    const body = await res.json()
    if (res.ok) return NextResponse.json({ success: true, method: 'management_api', result: body })
  } catch {}

  // Try exec_sql RPC
  const admin = getSupabaseAdmin()
  try {
    const { error } = await (admin as any).rpc('exec_sql', { query: SQL })
    if (!error) return NextResponse.json({ success: true, method: 'rpc_exec_sql' })
  } catch {}

  // Verify columns exist by querying
  const { data, error } = await admin
    .from('proposals')
    .select('base_price, calculator_result')
    .limit(0)

  if (!error) {
    return NextResponse.json({ success: true, method: 'already_exists', note: 'Columns already exist' })
  }

  return NextResponse.json({
    success: false,
    message: 'Auto-migration failed. Run the SQL manually in the Supabase SQL editor.',
    sql_editor_url: `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`,
    sql: SQL,
  }, { status: 500 })
}

export async function GET() {
  return POST()
}
