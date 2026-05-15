export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET
  if (!secret) return true
  return req.headers.get('x-vapi-secret') === secret
}

function getParams(body: any): any {
  return (
    body.parameters ??
    body.message?.toolCallList?.[0]?.function?.arguments ??
    body.message?.functionCall?.parameters ??
    {}
  )
}

function getToolCallId(body: any): string | undefined {
  return body.message?.toolCallList?.[0]?.id
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const repId = body.call?.metadata?.rep_id
  if (!repId) return NextResponse.json({ error: 'No rep_id in metadata' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: rep } = await admin
    .from('reps')
    .select('id, full_name, phone, assistant_config')
    .eq('id', repId)
    .single()

  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const params = getParams(body)
  const { caller_name, caller_phone, message, urgency, callback_requested } = params

  // Find lead by phone
  let leadId: string | null = null
  if (caller_phone) {
    const last10 = (caller_phone as string).replace(/\D/g, '').slice(-10)
    const { data: leads } = await admin
      .from('leads')
      .select('id')
      .eq('rep_id', rep.id)
      .ilike('phone', `%${last10}%`)
      .limit(1)
    leadId = leads?.[0]?.id ?? null
  }

  await admin.from('lead_activity').insert({
    rep_id: rep.id,
    lead_id: leadId,
    event_type: 'message',
    description: `Message from ${caller_name}`,
    notes: message,
    metadata: { urgency, caller_phone, callback_requested },
    created_at: new Date().toISOString(),
  })

  // SMS to rep (fire-and-forget)
  void (async () => {
    const businessNumber = rep.assistant_config?.business_number
    if (!rep.phone || !businessNumber) return
    try {
      const urgencyEmoji: Record<string, string> = { high: '🚨', medium: '📩', low: '💬' }
      const emoji = urgencyEmoji[urgency ?? 'medium'] ?? '📩'
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      await twilio.messages.create({
        to: rep.phone,
        from: businessNumber,
        body: `${emoji} Message from ${caller_name}${caller_phone ? ` (${caller_phone})` : ''}:\n\n"${message}"\n\nUrgency: ${urgency ?? 'medium'}`,
      })
    } catch (e) {
      console.error('SMS send failed:', e)
    }
  })()

  const responseMsg = `I've taken the message and notified ${rep.full_name}. Is there anything else I can help you with?`
  const toolCallId = getToolCallId(body)
  if (toolCallId) return NextResponse.json({ results: [{ toolCallId, result: responseMsg }] })
  return NextResponse.json({ success: true, message: responseMsg })
}
