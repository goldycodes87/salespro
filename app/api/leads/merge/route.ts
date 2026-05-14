export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const MERGEABLE_FIELDS = [
  'first_name','last_name','spouse_first_name','spouse_last_name',
  'phone','email','address','city','state','zip',
  'lead_source','notes','status','is_married','appointment_date',
]

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { primaryLeadId, secondaryLeadId, fieldSelections } = await request.json()

  if (!primaryLeadId || !secondaryLeadId) {
    return NextResponse.json({ error: 'Missing lead IDs' }, { status: 400 })
  }
  if (primaryLeadId === secondaryLeadId) {
    return NextResponse.json({ error: 'Cannot merge a lead with itself' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Verify both leads belong to this rep
  const [{ data: primary }, { data: secondary }] = await Promise.all([
    admin.from('leads').select('*').eq('id', primaryLeadId).eq('rep_id', user.id).single(),
    admin.from('leads').select('*').eq('id', secondaryLeadId).eq('rep_id', user.id).single(),
  ])

  if (!primary) return NextResponse.json({ error: 'Primary lead not found' }, { status: 404 })
  if (!secondary) return NextResponse.json({ error: 'Secondary lead not found' }, { status: 404 })

  // Build update object from fieldSelections
  const updateObj: Record<string, unknown> = {}
  for (const field of MERGEABLE_FIELDS) {
    const sel = (fieldSelections ?? {})[field]
    if (sel === 'secondary') {
      updateObj[field] = (secondary as any)[field]
    } else if (sel === 'both' && field === 'notes') {
      const parts = [(primary as any).notes, (secondary as any).notes].filter(Boolean)
      updateObj[field] = parts.length > 1 ? parts.join('\n\n---\n\n') : parts[0] ?? null
    }
    // 'primary' or undefined → no change (keep primary's value)
  }

  // 1. Update primary lead with winning fields
  if (Object.keys(updateObj).length > 0) {
    const { error: updateErr } = await admin
      .from('leads')
      .update({ ...updateObj, updated_at: new Date().toISOString() })
      .eq('id', primaryLeadId)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 2. Move proposals
  await admin.from('proposals')
    .update({ lead_id: primaryLeadId })
    .eq('lead_id', secondaryLeadId)

  // 3. Move lead_activity
  await admin.from('lead_activity')
    .update({ lead_id: primaryLeadId })
    .eq('lead_id', secondaryLeadId)

  // 4. Move lead_files
  await admin.from('lead_files')
    .update({ lead_id: primaryLeadId })
    .eq('lead_id', secondaryLeadId)

  // 5. Log merge activity on primary
  const secondaryName = `${(secondary as any).first_name ?? ''} ${(secondary as any).last_name ?? ''}`.trim()
  await admin.from('lead_activity').insert({
    lead_id: primaryLeadId,
    rep_id: user.id,
    event_type: 'merge',
    description: `Lead merged: ${secondaryName} merged into this lead`,
  })

  // 6. Soft-delete secondary (mark as merged, never hard-delete)
  await admin.from('leads')
    .update({
      merged_into: primaryLeadId,
      merged_at: new Date().toISOString(),
    })
    .eq('id', secondaryLeadId)

  return NextResponse.json({ success: true, leadId: primaryLeadId })
}
