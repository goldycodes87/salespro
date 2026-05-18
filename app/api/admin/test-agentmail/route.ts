export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const TEST_PAYLOAD = {
  event_id: 'evt_test_001',
  event_type: 'message.received',
  type: 'event',
  message: {
    message_id: 'test_msg_001',
    inbox_id: 'clozrleads@agentmail.to',
    from: 'Eric Goldberg <eric@lifetimewindows.com>',
    to: ['clozrleads@agentmail.to'],
    subject: 'Appointment scheduled for: 5/16/2026, 2:00 PM',
    extracted_text: `TYPE:
Sales Appointment
DATE/TIME:
5/16/2026, 2:00 PM
DURATION:
1.5 hours
REP 1:
Eric Goldberg
REP 2:
COMMENTS:
Daniel is interested in replacing their SGD, a rock went through it. They also have about 15-20 windows. Daniel and Ruvini will be there. 14464550
NAME:
Daniel Shultz
ADDRESS:
4817 S Elk Way, Aurora, CO 80016
PHONE:
Phone: (719) 433-3902`,
    text: '',
    html: '',
    preview: 'TYPE: Sales Appointment DATE/TIME: 5/16/2026, 2:00 PM',
    created_at: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  },
  thread: {
    thread_id: 'thread_test_001',
    subject: 'Appointment scheduled for: 5/16/2026, 2:00 PM',
    senders: ['Eric Goldberg <eric@lifetimewindows.com>'],
    recipients: ['clozrleads@agentmail.to'],
    preview: 'TYPE: Sales Appointment DATE/TIME: 5/16/2026, 2:00 PM',
  },
}

async function parseLeadWithAI(emailContent: string, subject: string): Promise<Record<string, any>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Extract lead information from this appointment email. Return ONLY valid JSON, no markdown.

Email subject: ${subject}
Email body:
${emailContent.slice(0, 4000)}

Return this exact structure:
{
  "first_name": "first name only",
  "last_name": "last name only",
  "phone": "10 digits only, no formatting, empty string if none",
  "address": "street address only (no city/state/zip)",
  "city": "city name",
  "state": "2-letter state code",
  "zip": "5 digit zip",
  "appointment_date": "ISO 8601 datetime string or null if not found",
  "rep_name": "rep name from REP 1 field, empty string if none",
  "notes": "comments or notes about the appointment",
  "appointment_type": "type such as Sales Appointment"
}`,
    }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(rawText.replace(/```json|```/g, '').trim())
}

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const isDryRun = searchParams.get('dry_run') !== 'false'  // default true

  const message = TEST_PAYLOAD.message
  const subject = message.subject
  const emailContent = message.extracted_text || message.text || ''
  const fromRaw: string = message.from
  const fromEmail = fromRaw.includes('<')
    ? (fromRaw.match(/<(.+)>/)?.[1] ?? fromRaw)
    : fromRaw.trim()

  // Run AI parsing
  let parsed: Record<string, any> = {}
  let parseError: string | null = null
  try {
    parsed = await parseLeadWithAI(emailContent, subject)
  } catch (e: any) {
    parseError = e.message
  }

  // Find rep by sender email (matches live webhook logic)
  const admin = getSupabaseAdmin()
  let rep: Record<string, any> | null = null
  const { data: repByEmail } = await admin
    .from('reps')
    .select('id, full_name, phone, email')
    .ilike('email', fromEmail)
    .single()
  rep = repByEmail ?? null

  const wouldCreate = {
    rep_id: rep?.id ?? null,
    first_name: parsed.first_name || 'Unknown',
    last_name: parsed.last_name || '',
    phone: parsed.phone || null,
    address: parsed.address || null,
    city: parsed.city || null,
    state: parsed.state || null,
    zip: parsed.zip || null,
    appointment_date: parsed.appointment_date || null,
    notes: parsed.notes || null,
    lead_source: 'agentmail',
    status: 'new',
  }

  const dryRunResult = {
    dry_run: true,
    test_payload: TEST_PAYLOAD,
    from_email: fromEmail,
    parsed,
    parse_error: parseError,
    rep_found: rep ? { id: rep.id, full_name: rep.full_name } : null,
    would_create: wouldCreate,
    sms_would_send: !!(rep?.phone),
    note: 'Pass ?dry_run=false to actually create the lead',
  }

  if (isDryRun) {
    return NextResponse.json(dryRunResult)
  }

  // Live run — call the real webhook handler
  const webhookUrl = new URL('/api/agentmail/leads', request.url)
  let webhookResult: any = null
  let webhookError: string | null = null
  try {
    const webhookRes = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-secret': process.env.AGENTMAIL_WEBHOOK_SECRET ?? '',
      },
      body: JSON.stringify(TEST_PAYLOAD),
    })
    webhookResult = await webhookRes.json()
  } catch (e: any) {
    webhookError = e.message
  }

  return NextResponse.json({
    dry_run: false,
    test_payload: TEST_PAYLOAD,
    from_email: fromEmail,
    parsed,
    parse_error: parseError,
    rep_found: rep ? { id: rep.id, full_name: rep.full_name } : null,
    would_create: wouldCreate,
    sms_would_send: !!(rep?.phone),
    webhook_response: webhookResult,
    webhook_error: webhookError,
  })
}
