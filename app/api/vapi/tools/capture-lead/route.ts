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
    first_name,
    last_name,
    phone,
    email,
    address,
    city,
    state,
    zip,
    interest,
    qualified,
    notes,
  } = params

  if (!first_name || !phone) {
    const toolCallId = getToolCallId(body)
    const msg = "I'm sorry, I need at least a name and phone number to save your information."
    if (toolCallId) return NextResponse.json({ results: [{ toolCallId, result: msg }] })
    return NextResponse.json({ success: false, message: msg })
  }

  // Dedup check
  const last10 = (phone as string).replace(/\D/g, '').slice(-10)
  const { data: existing } = await admin
    .from('leads')
    .select('id')
    .eq('rep_id', rep.id)
    .ilike('phone', `%${last10}%`)
    .limit(1)

  let leadId: string | null = null

  if (existing?.[0]) {
    leadId = existing[0].id
  } else {
    const { data: newLead } = await admin.from('leads').insert({
      rep_id: rep.id,
      first_name,
      last_name: last_name ?? '',
      phone,
      email: email ?? null,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      zip: zip ?? null,
      lead_source: 'ai_assistant_call',
      status: qualified ? 'new' : 'unqualified',
      notes: [interest ? `Interest: ${interest}` : null, notes].filter(Boolean).join('\n') || null,
    }).select('id').single()
    leadId = newLead?.id ?? null
  }

  // Fire AI research (fire-and-forget)
  if (leadId) {
    void fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozrhq.com'}/api/leads/${leadId}/research`, {
      method: 'POST',
    }).catch(() => {})
  }

  // SMS to rep (fire-and-forget)
  void (async () => {
    const businessNumber = rep.assistant_config?.business_number
    if (!rep.phone || !businessNumber) return
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      const assistantName = rep.assistant_config?.name ?? 'Eva'
      await twilio.messages.create({
        to: rep.phone,
        from: businessNumber,
        body: `🎯 New lead captured by ${assistantName}:\n${first_name} ${last_name ?? ''}\n${phone}\n${qualified ? '✅ Qualified' : '⚠️ Not qualified'}\nAI research is running...`,
      })
    } catch (e) {
      console.error('SMS send failed:', e)
    }
  })()

  const message = `Got it. I've saved ${first_name}'s information and ${rep.full_name} will be notified right away.`
  const toolCallId = getToolCallId(body)
  if (toolCallId) return NextResponse.json({ results: [{ toolCallId, result: message }] })
  return NextResponse.json({ success: true, message })
}
