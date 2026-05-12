export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_REF = 'aaahfcbksuigvcxmcwyc'

export async function GET() {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/002_proposal_number_lead_files.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Try Supabase Management API with service role key
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    })
    const body = await res.json()
    if (res.ok) {
      return NextResponse.json({ success: true, method: 'management_api', result: body })
    }
    // Management API failed — try rpc fallback
    console.log('Management API failed:', body)
  } catch (e) {
    console.log('Management API error:', e)
  }

  // Try direct RPC exec_sql if available
  const admin = getSupabaseAdmin()
  try {
    const { error } = await (admin as any).rpc('exec_sql', { query: sql })
    if (!error) {
      return NextResponse.json({ success: true, method: 'rpc_exec_sql' })
    }
  } catch {}

  // Check current state
  const admin2 = getSupabaseAdmin()
  const checks: Record<string, boolean> = {}
  
  try {
    await admin2.from('lead_files' as any).select('id').limit(1)
    checks.lead_files_table = true
  } catch {
    checks.lead_files_table = false
  }

  const { data: propTest } = await admin2
    .from('proposals')
    .select('proposal_number')
    .limit(1)
  checks.proposal_number_column = propTest !== null

  return NextResponse.json({
    success: false,
    message: 'Auto-migration failed. Run the SQL manually in the Supabase SQL editor.',
    sql_editor_url: `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`,
    current_state: checks,
    sql,
  })
}
