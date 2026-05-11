export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { researchLead } from '@/lib/anthropic'

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

// POST /api/leads/[id]/research
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const [{ data: lead, error: fetchError }, { data: repRow }] = await Promise.all([
    admin.from('leads').select('*').eq('id', id).eq('rep_id', user.id).single(),
    admin.from('reps').select('industry').eq('id', user.id).maybeSingle(),
  ])

  if (fetchError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  try {
    const summary = await researchLead({
      firstName: lead.first_name,
      lastName: lead.last_name,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      appointmentDate: lead.appointment_date ?? 'Not scheduled',
      leadSource: lead.lead_source ?? 'Unknown',
      spouseFirstName: lead.is_married ? lead.spouse_first_name : null,
      spouseLastName: lead.is_married ? lead.spouse_last_name : null,
      industry: repRow?.industry ?? null,
    })

    await admin
      .from('leads')
      .update({ ai_summary: summary, updated_at: new Date().toISOString() })
      .eq('id', id)

    await admin.from('api_usage_log').insert({
      rep_id: user.id,
      service: 'anthropic',
      endpoint: 'lead_research',
      tokens_used: 0,
      estimated_cost_usd: 0.015,
    })

    return NextResponse.json({ summary })
  } catch (err: any) {
    console.error('AI research error:', err)
    return NextResponse.json({ error: err.message ?? 'Research failed' }, { status: 500 })
  }
}
