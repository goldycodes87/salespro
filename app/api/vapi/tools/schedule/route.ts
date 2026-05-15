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
    .select('id, full_name, phone, company, assistant_config')
    .eq('id', repId)
    .single()

  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const params = getParams(body)
  const {
    customer_name,
    customer_phone,
    customer_address,
    preferred_date,
    preferred_time,
    notes,
  } = params

  // Find or create lead
  let leadId: string | null = null
  if (customer_phone) {
    const last10 = customer_phone.replace(/\D/g, '').slice(-10)
    const { data: leads } = await admin
      .from('leads')
      .select('id')
      .eq('rep_id', rep.id)
      .ilike('phone', `%${last10}%`)
      .limit(1)
    if (leads?.[0]) {
      leadId = leads[0].id
    }
  }

  if (!leadId && customer_name) {
    const nameParts = (customer_name as string).split(' ')
    const { data: newLead } = await admin.from('leads').insert({
      rep_id: rep.id,
      first_name: nameParts[0] ?? customer_name,
      last_name: nameParts.slice(1).join(' ') || '',
      phone: customer_phone ?? '',
      address: customer_address ?? '',
      lead_source: 'ai_assistant_call',
      status: 'new',
    }).select('id').single()
    leadId = newLead?.id ?? null
  }

  // Build start datetime
  let startAt: string | null = null
  if (preferred_date) {
    const time = preferred_time ?? '09:00'
    startAt = `${preferred_date}T${time}:00`
    try {
      const d = new Date(startAt)
      startAt = d.toISOString()
    } catch {}
  }

  if (startAt) {
    const endAt = new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString()
    await admin.from('calendar_events').insert({
      rep_id: rep.id,
      lead_id: leadId,
      title: `Appointment — ${customer_name}`,
      start_at: startAt,
      end_at: endAt,
      location: customer_address ?? null,
      description: notes ?? null,
    })
  }

  // SMS to rep (fire-and-forget)
  void (async () => {
    const businessNumber = rep.assistant_config?.business_number
    if (!rep.phone || !businessNumber) return
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      await twilio.messages.create({
        to: rep.phone,
        from: businessNumber,
        body: `📅 ${rep.assistant_config?.name ?? 'Eva'} scheduled an appointment:\n${customer_name}\n${preferred_date}${preferred_time ? ` at ${preferred_time}` : ''}\n${customer_address ?? ''}`,
      })
    } catch (e) {
      console.error('SMS send failed:', e)
    }
  })()

  const message = `Appointment scheduled for ${preferred_date}${preferred_time ? ` at ${preferred_time}` : ''} with ${customer_name}. ${rep.full_name} has been notified.`

  const toolCallId = getToolCallId(body)
  if (toolCallId) {
    return NextResponse.json({ results: [{ toolCallId, result: message }] })
  }
  return NextResponse.json({ success: true, message })
}
