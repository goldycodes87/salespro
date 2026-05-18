export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: targetRep } = await admin
    .from('reps')
    .select('is_admin, assistant_config')
    .eq('id', id)
    .single()

  if (!targetRep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  if (targetRep.is_admin) {
    const { count } = await admin
      .from('reps')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true)
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 })
    }
  }

  // 1. Release Twilio number
  const businessNumber = (targetRep.assistant_config as any)?.business_number
  if (businessNumber && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      const numbers = await twilio.incomingPhoneNumbers.list({ phoneNumber: businessNumber })
      await Promise.all(numbers.map((n: any) => n.remove()))
    } catch (e) {
      console.error('Twilio cleanup:', e)
    }
  }

  // 2. Delete Vapi assistant
  const vapiAssistantId = (targetRep.assistant_config as any)?.vapi_assistant_id
  if (vapiAssistantId && process.env.VAPI_API_KEY) {
    try {
      await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
      })
    } catch (e) {
      console.error('Vapi cleanup:', e)
    }
  }

  // 3. Delete DB data in FK order (child tables first)
  const repId = id
  await admin.from('api_usage_log').delete().eq('rep_id', repId)
  await admin.from('coach_messages').delete().eq('rep_id', repId)
  await admin.from('coach_config').delete().eq('rep_id', repId)
  await admin.from('rep_contacts').delete().eq('rep_id', repId)
  await admin.from('voice_configs').delete().eq('rep_id', repId)
  await admin.from('outbound_calls').delete().eq('rep_id', repId)
  await admin.from('meeting_recordings').delete().eq('rep_id', repId)

  // Delete lead-related data: activity and proposals before leads
  const { data: leadRows } = await admin.from('leads').select('id').eq('rep_id', repId)
  const leadIds = (leadRows ?? []).map((l: any) => l.id)
  if (leadIds.length > 0) {
    await admin.from('lead_activity').delete().in('lead_id', leadIds)
    await admin.from('proposals').delete().in('lead_id', leadIds)
  }
  await admin.from('lead_activity').delete().eq('rep_id', repId)
  await admin.from('proposals').delete().eq('rep_id', repId)
  await admin.from('leads').delete().eq('rep_id', repId)
  await admin.from('reps').delete().eq('id', repId)

  // 4. Delete auth user
  const { error: authError } = await admin.auth.admin.deleteUser(repId)
  if (authError) console.error('Auth delete error:', authError)

  return NextResponse.json({ ok: true })
}
