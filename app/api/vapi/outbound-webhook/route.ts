export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || body.type !== 'end-of-call-report') return NextResponse.json({ received: true })

  const secret = process.env.VAPI_WEBHOOK_SECRET
  if (secret && req.headers.get('x-vapi-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const repId = body.call?.metadata?.rep_id
  const leadId = body.call?.metadata?.lead_id
  const command = body.call?.metadata?.command
  const toName = body.call?.metadata?.to_name

  if (!repId) return NextResponse.json({ received: true })

  const { data: rep } = await admin
    .from('reps')
    .select('id, full_name, phone, assistant_config')
    .eq('id', repId)
    .single()

  if (!rep) return NextResponse.json({ received: true })

  const transcript = body.transcript ?? ''
  const summary = body.summary ?? ''
  const durationSeconds = body.call?.durationSeconds ?? 0
  const vapiCallId = body.call?.id

  // Update outbound_calls record
  void (async () => {
    try {
      await admin
        .from('outbound_calls')
        .update({
          status: 'completed',
          transcript,
          summary,
          duration_seconds: durationSeconds,
        })
        .eq('vapi_call_id', vapiCallId)
    } catch {}
  })()

  // Log to lead_activity if lead
  if (leadId) {
    void (async () => {
      try {
        await admin.from('lead_activity').insert({
          lead_id: leadId,
          rep_id: repId,
          event_type: 'outbound_call',
          description: `AI outbound call — ${Math.round(durationSeconds / 60)} min`,
          notes: summary,
          metadata: { transcript, purpose: command, duration: durationSeconds },
          created_at: new Date().toISOString(),
        })
      } catch {}
    })()
  }

  // Usage log
  void (async () => {
    try {
      await admin.from('api_usage_log').insert({
        rep_id: repId,
        service: 'vapi',
        endpoint: 'outbound_call',
        tokens_used: 0,
        estimated_cost_usd: (durationSeconds / 60) * 0.05,
        metadata: {
          rep_name: rep.full_name,
          to_name: toName,
          duration_seconds: durationSeconds,
          purpose: command,
        },
      })
    } catch {}
  })()

  // SMS to rep with summary (fire-and-forget)
  void (async () => {
    const businessNumber = rep.assistant_config?.business_number
    if (!rep.phone || !businessNumber) return
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      const assistantName = rep.assistant_config?.name ?? 'Eva'
      const duration = Math.round(durationSeconds / 60)
      const smsSummary = summary?.slice(0, 200) || 'Call completed.'

      await twilio.messages.create({
        to: rep.phone,
        from: businessNumber,
        body: `📞 ${assistantName} completed your call with ${toName ?? 'them'} (${duration} min):\n\n${smsSummary}`,
      })

      await admin.from('outbound_calls')
        .update({ sms_sent: true })
        .eq('vapi_call_id', vapiCallId)
    } catch (e) {
      console.error('Outbound SMS failed:', e)
    }
  })()

  return NextResponse.json({ received: true })
}
