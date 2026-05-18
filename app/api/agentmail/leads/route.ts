export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

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

export async function POST(request: Request) {
  console.log('=== AGENTMAIL HIT ===', new Date().toISOString())

  const rawBody = await request.text()

  const svixId        = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  console.log('SVIX HEADERS:', { svixId, svixTimestamp, hasSignature: !!svixSignature })

  if (process.env.AGENTMAIL_WEBHOOK_SECRET) {
    try {
      const wh = new Webhook(process.env.AGENTMAIL_WEBHOOK_SECRET)
      wh.verify(rawBody, {
        'svix-id':        svixId        ?? '',
        'svix-timestamp': svixTimestamp ?? '',
        'svix-signature': svixSignature ?? '',
      })
      console.log('AGENTMAIL: Svix signature verified')
    } catch (err) {
      console.error('AGENTMAIL: Svix verification failed:', err)
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const payload = JSON.parse(rawBody)

  console.log('AGENTMAIL WEBHOOK RAW:', JSON.stringify(payload).slice(0, 500))

  // AgentMail's actual structure: event_type at top level, message.from is a plain string
  const message = payload.message || {}

  // from is a direct string: "Name <email>" or just "email"
  const fromRaw: string = message.from || ''
  const fromEmail = fromRaw.includes('<')
    ? (fromRaw.match(/<(.+)>/)?.[1] ?? fromRaw)
    : fromRaw.trim()
  const fromName = fromRaw.includes('<') ? fromRaw.split('<')[0].trim() : ''

  const subject: string = message.subject || ''

  // extracted_text is cleanest; fall back through available fields
  const emailContent: string =
    message.extracted_text ||
    message.text ||
    message.extracted_html ||
    message.html ||
    message.preview ||
    ''

  console.log('AGENTMAIL PARSED:', {
    eventType: payload.event_type,
    fromRaw,
    fromEmail,
    fromName,
    subject,
    contentLength: emailContent.length,
    contentPreview: emailContent.slice(0, 200),
  })

  // Check event type — field is event_type, not type
  if (payload.event_type !== 'message.received') {
    console.log('Ignoring event type:', payload.event_type)
    return NextResponse.json({ received: true, skipped: true })
  }

  if (!emailContent) {
    console.warn('AGENTMAIL WEBHOOK: No email content found in payload')
    return NextResponse.json({ received: true })
  }

  const admin = getSupabaseAdmin()

  // Identify rep by the sender's email address
  const { data: rep } = await admin
    .from('reps')
    .select('*')
    .ilike('email', fromEmail)
    .single()

  if (!rep) {
    console.log('AGENTMAIL: No rep found for:', fromEmail)
    return NextResponse.json({ received: true, error: `Rep not found: ${fromEmail}` })
  }

  if (rep.email_parsing_enabled === false) {
    console.log('AGENTMAIL: Email parsing disabled for rep:', rep.email)
    return NextResponse.json({ received: true, skipped: 'parsing disabled' })
  }

  // Parse lead data from email content
  let parsed: Record<string, any> = {}
  try {
    parsed = await parseLeadWithAI(emailContent, subject)
    console.log('AGENTMAIL AI RESULT:', parsed)
  } catch (e) {
    console.error('AGENTMAIL: AI parsing failed:', e)
    return NextResponse.json({ received: true, error: 'Parsing failed' })
  }

  // Try to get street view photo
  const googleKey = process.env.GOOGLE_MAPS_API_KEY
  let streetViewUrl: string | null = null
  let photoType = 'street_view'
  if (googleKey && parsed.address && parsed.city) {
    const parts = [parsed.address, parsed.city, parsed.state, parsed.zip].filter(Boolean)
    const locationStr = encodeURIComponent(parts.join(' '))
    try {
      const metaRes = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${locationStr}&key=${googleKey}`)
      const metaJson = await metaRes.json()
      if (metaJson.status === 'OK') {
        streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${locationStr}&key=${googleKey}`
        photoType = 'street_view'
      } else {
        streetViewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${locationStr}&zoom=19&size=800x400&maptype=satellite&key=${googleKey}`
        photoType = 'satellite'
      }
    } catch {}
  }

  // Create lead
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .insert({
      rep_id: rep.id,
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
      street_view_url: streetViewUrl,
      photo_type: photoType,
    })
    .select()
    .single()

  if (leadError || !lead) {
    console.error('AGENTMAIL: Failed to create lead:', leadError)
    return NextResponse.json({ received: true, error: 'Lead creation failed' })
  }

  // Log activity
  await admin.from('lead_activity').insert({
    lead_id: lead.id,
    rep_id: rep.id,
    event_type: 'lead_created',
    description: `Lead created via AgentMail — "${subject}"`,
    metadata: { from_email: fromEmail, from_name: fromName, subject, parsed },
  })

  // Log street view usage
  if (streetViewUrl) {
    await admin.from('api_usage_log').insert({
      rep_id: rep.id,
      service: 'google_maps',
      endpoint: photoType === 'satellite' ? 'staticmap' : 'streetview',
      tokens_used: 0,
      estimated_cost_usd: 0.007,
    })
  }

  // SMS to rep (fire-and-forget)
  if (rep.phone && rep.assistant_config?.business_number) {
    void (async () => {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        const leadName = `${lead.first_name} ${lead.last_name}`.trim()
        const apptDate = parsed.appointment_date
          ? new Date(parsed.appointment_date).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })
          : 'Date TBD'
        await twilio.messages.create({
          to: rep.phone,
          from: rep.assistant_config.business_number,
          body: `📅 New appointment!\n\n${leadName}\n${[parsed.address, parsed.city].filter(Boolean).join(', ')}\n${apptDate}\n\nView: https://www.clozrhq.com/leads/${lead.id}`,
        })
      } catch (e) {
        console.error('AGENTMAIL SMS error:', e)
      }
    })()
  }

  return NextResponse.json({ received: true, lead_id: lead.id })
}
