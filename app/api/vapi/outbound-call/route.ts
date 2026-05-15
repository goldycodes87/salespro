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

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { command, lead_id, contact_id, to_number, to_name, context } = body

  const admin = getSupabaseAdmin()
  const { data: rep } = await admin
    .from('reps')
    .select('id, full_name, company, phone, assistant_config, vapi_phone_number_id')
    .eq('id', user.id)
    .single()

  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  if (!rep.vapi_phone_number_id) {
    return NextResponse.json({
      error: 'no_phone_number',
      message: "Your business number hasn't been set up for outbound calls yet. Go to Settings → Assistant to provision a number.",
    }, { status: 400 })
  }

  const assistantName = rep.assistant_config?.name ?? 'Eva'
  const assistantVoiceId = rep.assistant_config?.voice_id ?? 'pNInz6obpgDQGcFmaJgB'

  // STEP 1 — Build call context
  const callContext: Record<string, any> = { context }

  let resolvedNumber = to_number ?? null
  let resolvedName = to_name ?? null

  if (lead_id) {
    const { data: lead } = await admin
      .from('leads')
      .select('id, first_name, last_name, phone, status, city, state')
      .eq('id', lead_id)
      .single()
    if (lead) {
      callContext.lead = lead
      resolvedNumber = resolvedNumber ?? lead.phone
      resolvedName = resolvedName ?? `${lead.first_name} ${lead.last_name}`
    }
  }

  if (contact_id) {
    const { data: contact } = await admin
      .from('rep_contacts')
      .select('*')
      .eq('id', contact_id)
      .single()
    if (contact) {
      callContext.contact = contact
      resolvedNumber = resolvedNumber ?? contact.phone
      resolvedName = resolvedName ?? contact.name
    }
  }

  // Try to find next appointment if command mentions it
  if (!resolvedNumber && command?.toLowerCase().includes('appointment')) {
    const { data: nextEvent } = await admin
      .from('calendar_events')
      .select('id, title, start_at, lead_id')
      .eq('rep_id', rep.id)
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextEvent?.lead_id) {
      const { data: apptLead } = await admin
        .from('leads')
        .select('id, first_name, last_name, phone')
        .eq('id', nextEvent.lead_id)
        .single()
      if (apptLead) {
        callContext.nextEvent = nextEvent
        callContext.lead = apptLead
        resolvedNumber = apptLead.phone
        resolvedName = `${apptLead.first_name} ${apptLead.last_name}`
      }
    }
  }

  // Fetch personal contacts/memories for context-aware calling
  const { data: memories } = await admin
    .from('coach_memory')
    .select('fact, category')
    .eq('rep_id', rep.id)
    .eq('category', 'personal')
    .limit(20)

  // Also search rep_contacts by relationship keyword in command
  if (!resolvedNumber && command) {
    const { data: contacts } = await admin
      .from('rep_contacts')
      .select('*')
      .eq('rep_id', rep.id)
    if (contacts) {
      const commandLower = command.toLowerCase()
      const matched = contacts.find(c =>
        c.relationship && commandLower.includes(c.relationship.toLowerCase())
      )
      if (matched) {
        callContext.contact = matched
        resolvedNumber = matched.phone
        resolvedName = matched.name
      }
    }
  }

  if (!resolvedNumber) {
    return NextResponse.json({
      error: 'no_number',
      message: "I couldn't find a phone number. Can you provide the number to call?",
    })
  }

  // STEP 2 — Build call script with Claude
  let callScript = `Hi, this is ${assistantName} calling on behalf of ${rep.full_name} at ${rep.company}.`
  try {
    const scriptRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are ${assistantName}, the AI assistant for ${rep.full_name} at ${rep.company}.\n\nRep's command: "${command}"\n\nCall context:\n${JSON.stringify(callContext, null, 2)}\n\nPersonal details:\n${memories?.map(m => m.fact).join('\n') || 'none'}\n\nWrite a natural, conversational opening for this call. 2-3 sentences max. Sound human. Return only the script text.`,
        }],
      }),
    })
    const scriptData = await scriptRes.json()
    callScript = scriptData.content?.[0]?.text ?? callScript
  } catch (e) {
    console.error('Script generation failed:', e)
  }

  // STEP 3 — Make the Vapi call (non-blocking)
  const vapiCallBody = {
    phoneNumberId: rep.vapi_phone_number_id,
    customer: { number: resolvedNumber, name: resolvedName ?? 'Unknown' },
    assistant: {
      model: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        messages: [{
          role: 'system',
          content: `You are ${assistantName}, calling on behalf of ${rep.full_name} at ${rep.company}.\n\nPurpose: ${command}\n\nContext: ${JSON.stringify(callContext)}\n\nKeep the call brief and professional. Complete the specific task requested. When done, end the call politely.`,
        }],
        maxTokens: 150,
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: assistantVoiceId,
        stability: 0.5,
        similarityBoost: 0.75,
      },
      firstMessage: callScript,
      endCallMessage: `I'll let ${rep.full_name} know. Have a great day!`,
      maxDurationSeconds: 300,
      serverUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozrhq.com'}/api/vapi/outbound-webhook`,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
      metadata: {
        rep_id: rep.id,
        rep_name: rep.full_name,
        lead_id: callContext.lead?.id ?? null,
        contact_id: contact_id ?? null,
        to_name: resolvedName,
        command,
        session_type: 'outbound_call',
        app: 'clozr',
      },
    },
  }

  let callData: any = null
  try {
    const callRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiCallBody),
    })
    if (callRes.ok) {
      callData = await callRes.json()
    } else {
      const err = await callRes.json()
      console.error('Vapi outbound call failed:', err)
      return NextResponse.json({ error: err.message ?? 'Call failed', details: err }, { status: 500 })
    }
  } catch (e) {
    console.error('Vapi call error:', e)
    return NextResponse.json({ error: 'Call initiation failed' }, { status: 500 })
  }

  // STEP 4 — Save outbound call record (fire-and-forget)
  void (async () => {
    try {
      await admin.from('outbound_calls').insert({
        rep_id: rep.id,
        lead_id: callContext.lead?.id ?? null,
        contact_id: contact_id ?? null,
        vapi_call_id: callData?.id,
        to_number: resolvedNumber,
        to_name: resolvedName,
        purpose: command,
        script: callScript,
        status: 'initiated',
      })
    } catch {}
  })()

  return NextResponse.json({
    success: true,
    callId: callData?.id,
    message: `Calling ${resolvedName ?? 'them'} now. I'll let you know how it goes.`,
  })
}
