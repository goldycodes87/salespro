export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logApiCall } from '@/lib/api-logger'

export async function POST(req: Request) {
  const startTime = Date.now()

  const secret = req.headers.get('x-mailparser-secret')
  if (secret !== process.env.MAILPARSER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, string> = {}
  try {
    const text = await req.text()
    if (text && text.trim().length > 0) {
      body = JSON.parse(text)
    } else {
      return NextResponse.json({ received: true, skipped: 'empty body' })
    }
  } catch (e) {
    console.error('Mailparser: invalid JSON body:', e)
    return NextResponse.json({ received: true, skipped: 'invalid JSON' })
  }

  const repEmail    = body['REP EMAIL']        ?? ''
  const leadName    = body['LEAD NAME']         ?? ''
  const leadAddress = body['LEAD ADDRESS']      ?? ''
  const leadPhone   = body['LEAD PHONE']        ?? ''
  const apptInfo    = body['APPOINTMENT INFO']  ?? ''
  const apptNotes   = body['APPT NOTES']        ?? ''
  const apptType    = body['TYPE']              ?? ''
  const apptDuration = body['DURATION']         ?? ''

  console.log('Mailparser webhook received:', { repEmail, leadName, leadAddress, leadPhone, apptType })

  const admin = getSupabaseAdmin()

  // Find rep by email
  const { data: rep } = await admin
    .from('reps')
    .select('id, email, full_name')
    .ilike('email', repEmail.trim())
    .eq('active', true)
    .single()

  if (!rep) {
    console.error('Mailparser: rep not found for email:', repEmail)
    return NextResponse.json({ received: true, error: `Rep not found: ${repEmail}` })
  }

  // Parse lead name
  const nameParts = leadName.trim().split(' ')
  const firstName = nameParts[0] ?? 'Unknown'
  const lastName  = nameParts.slice(1).join(' ') ?? ''

  // Parse address — "17100 Waterhouse Cir Unit D, Parker, CO 80134"
  const addressParts = leadAddress.split(',').map((s: string) => s.trim())
  const street   = addressParts[0] ?? ''
  const city     = addressParts[1] ?? ''
  const stateZip = (addressParts[2] ?? '').trim().split(' ')
  const state    = stateZip[0] ?? ''
  const zip      = stateZip[1] ?? ''

  // Parse appointment date/time — "Appointment scheduled for: 5/16/2026, 10:00 AM"
  const apptMatch = apptInfo.match(/(\d{1,2}\/\d{1,2}\/\d{4}),?\s*(\d{1,2}:\d{2}\s*[AP]M)/i)
  const apptDate  = apptMatch?.[1] ?? null
  const apptTime  = apptMatch?.[2] ?? null
  const appointmentDate = apptDate && apptTime ? `${apptDate} ${apptTime}` : apptDate

  // Duplicate check — same rep + phone within last 24h
  const { data: existing } = await admin
    .from('leads')
    .select('id')
    .eq('rep_id', rep.id)
    .eq('phone', leadPhone)
    .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    .single()

  if (existing) {
    console.log('Mailparser: duplicate lead skipped', existing.id)
    return NextResponse.json({ received: true, skipped: 'duplicate', lead_id: existing.id })
  }

  // Build notes including type and duration if present
  const notesParts = [
    apptNotes || null,
    apptType ? `Type: ${apptType}` : null,
    apptDuration ? `Duration: ${apptDuration}` : null,
  ].filter(Boolean)
  const notes = notesParts.length > 0 ? notesParts.join('\n') : null

  // Create lead
  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      rep_id:           rep.id,
      first_name:       firstName,
      last_name:        lastName,
      address:          street,
      city:             city,
      state:            state,
      zip:              zip,
      phone:            leadPhone,
      notes:            [
        apptType ? `Type: ${apptType}` : '',
        apptDuration ? `Duration: ${apptDuration}` : '',
        apptNotes,
      ].filter(Boolean).join('\n'),
      appointment_date: apptDate,
      appointment_time: apptTime,
      source:           'mailparser',
      status:           'new',
    })
    .select()
    .single()

  if (error) {
    console.error('Mailparser: lead insert failed:', error)
    return NextResponse.json({ received: true, error: 'Lead creation failed' })
  }

  // Auto photo (fire-and-forget)
  setImmediate(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/leads/${lead.id}/photo`, { method: 'POST' })
    } catch (e) {
      console.error('Mailparser: photo fetch failed:', e)
    }
  })

  // SMS to rep (fire-and-forget)
  setImmediate(async () => {
    try {
      const msg = apptDate
        ? `New lead: ${leadName} — ${apptDate} at ${apptTime}. ${leadAddress}`
        : `New lead: ${leadName}. ${leadAddress}`

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rep_id: rep.id, message: msg }),
      })
    } catch (e) {
      console.error('Mailparser: SMS failed:', e)
    }
  })

  // Log usage
  logApiCall({
    repId:      rep.id,
    service:    'mailparser',
    endpoint:   'leads_webhook',
    costUsd:    0,
    success:    true,
    responseMs: Date.now() - startTime,
  }).catch(console.error)

  return NextResponse.json({
    received: true,
    lead_id:  lead.id,
    rep:      rep.full_name,
    lead:     `${firstName} ${lastName}`,
  })
}
