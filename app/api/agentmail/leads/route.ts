export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export function extractEmailContent(body: string): string {
  const markers = [
    'An appointment has been set',
    'From: Lifetime Home Remodeling',
    'From: admin@lifetimewindows.com',
    'Appointment scheduled for:',
  ]

  let startIdx = -1
  for (const marker of markers) {
    const idx = body.indexOf(marker)
    if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
      startIdx = idx
    }
  }

  if (startIdx === -1) return body

  const footerMarkers = [
    'Lifetime Home Remodeling\n9525',
    'DENVER, CO 80238',
    'Thank You,\nScheduling Team',
  ]

  let endIdx = body.length
  for (const marker of footerMarkers) {
    const idx = body.indexOf(marker)
    if (idx !== -1 && idx < endIdx) {
      endIdx = idx + marker.length
    }
  }

  return body.substring(startIdx, endIdx)
}

async function parseLeadWithAI(emailContent: string, subject: string): Promise<Record<string, any>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: `You are an appointment data extractor. Extract structured appointment and lead information from home improvement scheduling emails. Follow these rules exactly:

1. Extract ONLY from the structured fields in the email body (NAME:, ADDRESS:, PHONE:, etc.)
2. The REP field = the assigned sales rep from "REP 1:" field in the email body — NOT the sender, NOT the person who forwarded it
3. IGNORE all email signatures, headers, and footer content
4. IGNORE the From:, To:, and forwarding headers
5. Strip any prefixes from values: "Phone: (719)..." → "(719)...", "Address: 123..." → "123..."
6. If a field is blank or missing, return null for that field
7. Never use forwarding metadata as lead data`,
    messages: [{
      role: 'user',
      content: `Extract appointment data from this email. Return ONLY valid JSON.

Email content:
${emailContent}

Return this exact JSON structure:
{
  "lead": {
    "first_name": string | null,
    "last_name": string | null,
    "address": string | null,
    "city": string | null,
    "state": string | null,
    "zip": string | null,
    "phone": string | null,
    "email": string | null,
    "spouse_first_name": string | null
  },
  "appointment": {
    "date": string | null,
    "time": string | null,
    "duration": string | null,
    "type": string | null
  },
  "rep": {
    "name": string | null
  },
  "job": {
    "internal_id": string | null,
    "comments": string | null
  }
}

Rules for this specific email format:
- NAME field → split into first_name and last_name
- ADDRESS field → parse into address, city, state, zip
- PHONE field → strip "Phone: " prefix, keep number only
- COMMENTS field → capture full text as comments. Also look for a standalone number on its own line (like "14464550") — that is the internal job ID, extract it as job.internal_id
- REP 1 field → rep.name
- If two people mentioned in comments (e.g. "Daniel and Ruvini will be there") → second person = spouse_first_name
- DATE/TIME field → split into date and time
- DURATION field → duration`,
    }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  const cleaned = fenced ? fenced[1].trim() : rawText.trim()
  return JSON.parse(cleaned)
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

  const message = payload.message || {}

  const fromRaw: string = message.from || ''
  const fromEmail = fromRaw.includes('<')
    ? (fromRaw.match(/<(.+)>/)?.[1] ?? fromRaw)
    : fromRaw.trim()
  const fromName = fromRaw.includes('<') ? fromRaw.split('<')[0].trim() : ''

  const subject: string = message.subject || ''

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

  // Strip signature/footer before sending to AI
  const extractedContent = extractEmailContent(emailContent)
  console.log('AGENTMAIL EXTRACTED CONTENT:', extractedContent.slice(0, 400))

  // Parse lead data from extracted email content
  let parsed: Record<string, any> = {}
  try {
    parsed = await parseLeadWithAI(extractedContent, subject)
    console.log('AGENTMAIL AI RESULT:', JSON.stringify(parsed))
  } catch (e) {
    console.error('AGENTMAIL: AI parsing failed:', e)
    return NextResponse.json({ received: true, error: 'Parsing failed' })
  }

  // Map nested result to flat fields
  const leadData     = (parsed.lead        ?? {}) as Record<string, any>
  const apptData     = (parsed.appointment ?? {}) as Record<string, any>
  const repData      = (parsed.rep         ?? {}) as Record<string, any>
  const jobData      = (parsed.job         ?? {}) as Record<string, any>

  // Combine date + time for appointment_date
  const appointmentDate = apptData.date
    ? `${apptData.date}${apptData.time ? ' ' + apptData.time : ''}`
    : null

  // Build notes: comments, job ID, rep name, spouse
  const notesParts = [
    jobData.comments || null,
    jobData.internal_id ? `Job ID: ${jobData.internal_id}` : null,
    repData.name ? `Assigned rep: ${repData.name}` : null,
    leadData.spouse_first_name ? `Spouse: ${leadData.spouse_first_name}` : null,
  ].filter(Boolean)
  const notes = notesParts.length > 0 ? notesParts.join('\n') : null

  // Create lead
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .insert({
      rep_id: rep.id,
      first_name: leadData.first_name || 'Unknown',
      last_name: leadData.last_name || '',
      phone: leadData.phone || null,
      address: leadData.address || null,
      city: leadData.city || null,
      state: leadData.state || null,
      zip: leadData.zip || null,
      appointment_date: appointmentDate,
      notes,
      lead_source: 'agentmail',
      status: 'new',
      street_view_url: null,
      photo_type: null,
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

  // Fetch street view photo (fire-and-forget)
  void (async () => {
    const googleKey = process.env.GOOGLE_MAPS_API_KEY
    if (!googleKey || !leadData.address || !leadData.city) return
    const parts = [leadData.address, leadData.city, leadData.state, leadData.zip].filter(Boolean)
    const locationStr = encodeURIComponent(parts.join(' '))
    let streetViewUrl: string | null = null
    let photoType = 'street_view'
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
    if (!streetViewUrl) return
    await admin.from('leads').update({ street_view_url: streetViewUrl, photo_type: photoType }).eq('id', lead.id)
    await admin.from('api_usage_log').insert({
      rep_id: rep.id,
      service: 'google_maps',
      endpoint: photoType === 'satellite' ? 'staticmap' : 'streetview',
      tokens_used: 0,
      estimated_cost_usd: 0.007,
    })
  })()

  // SMS to rep (fire-and-forget)
  if (rep.phone && rep.assistant_config?.business_number) {
    void (async () => {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        const leadName = `${lead.first_name} ${lead.last_name}`.trim()
        const apptDateDisplay = appointmentDate
          ? (() => {
              try {
                return new Date(appointmentDate).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })
              } catch { return appointmentDate }
            })()
          : 'Date TBD'
        await twilio.messages.create({
          to: rep.phone,
          from: rep.assistant_config.business_number,
          body: `📅 New appointment!\n\n${leadName}\n${[leadData.address, leadData.city].filter(Boolean).join(', ')}\n${apptDateDisplay}\n\nView: https://www.clozrhq.com/leads/${lead.id}`,
        })
      } catch (e) {
        console.error('AGENTMAIL SMS error:', e)
      }
    })()
  }

  return NextResponse.json({ received: true, lead_id: lead.id })
}
