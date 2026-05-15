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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozrhq.com'

export async function POST(_req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: rep } = await admin.from('reps').select('*').eq('id', user.id).single()
  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const config = rep.assistant_config ?? {}
  const assistantName = config.name || 'Alex'
  const voiceId = config.voice_id || 'pNInz6obpgDQGcFmaJgB'
  const capabilities: string[] = config.capabilities ?? []
  const qualifyingCriteria: string = config.qualifying_criteria ?? ''

  // Fetch editable prompts from DB
  const { data: promptRows } = await admin
    .from('assistant_prompts')
    .select('prompt_key, system_prompt')

  const getPrompt = (key: string) =>
    promptRows?.find((p: { prompt_key: string; system_prompt: string }) => p.prompt_key === key)?.system_prompt ?? ''

  const replaceVars = (template: string) =>
    template
      .replace(/{repName}/g, rep.full_name ?? '')
      .replace(/{assistantName}/g, assistantName)
      .replace(/{company}/g, rep.company ?? '')
      .replace(/{capabilities}/g, capabilities.join(', '))
      .replace(/{qualifyingCriteria}/g, qualifyingCriteria)

  const baseTemplate = getPrompt('base_assistant')
  const greetingTemplate = getPrompt('greeting')
  const voicemailTemplate = getPrompt('voicemail')

  const systemPrompt = baseTemplate
    ? replaceVars(baseTemplate)
    : `You are ${assistantName}, the AI assistant for ${rep.full_name} at ${rep.company}.

Your job is to help callers and represent ${rep.company} professionally.

${capabilities.includes('schedule_appointments') ? `You can schedule appointments. When someone wants to book, collect their full name, address, preferred date and time, and best callback number. Use the schedule_appointment function.` : 'Do not attempt to schedule appointments.'}

${capabilities.includes('qualify_leads') ? `You qualify leads based on these criteria: ${qualifyingCriteria}. Ask qualifying questions naturally. Use the capture_lead function when you have their information.` : ''}

${capabilities.includes('take_messages') ? `Always offer to take a message if you cannot fully help. Get their name, number, and reason for calling. Use the take_message function.` : ''}

Always:
- Be professional and friendly
- Represent ${rep.company} positively
- Let callers know ${rep.full_name} will follow up
- Keep calls under 3 minutes when possible
- End calls graciously`

  const firstMessage = greetingTemplate
    ? replaceVars(greetingTemplate)
    : `Hi, you've reached ${rep.full_name} at ${rep.company}. I'm ${assistantName}. How can I help you today?`

  const endCallMessage = voicemailTemplate
    ? replaceVars(voicemailTemplate)
    : `Thanks for calling ${rep.company}. I'll make sure ${rep.full_name} gets this message. Have a great day!`

  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET || 'clozr-webhook-secret'

  // Build tools based on capabilities
  const tools: any[] = []

  if (capabilities.includes('schedule_appointments')) {
    tools.push({
      type: 'function',
      function: {
        name: 'schedule_appointment',
        description: 'Schedule a sales appointment for the rep with a customer',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Full name of customer' },
            customer_phone: { type: 'string', description: 'Customer phone number' },
            customer_address: { type: 'string', description: 'Customer address' },
            preferred_date: { type: 'string', description: 'Preferred date YYYY-MM-DD' },
            preferred_time: { type: 'string', description: 'Preferred time HH:MM' },
            notes: { type: 'string', description: 'Any additional notes' },
          },
          required: ['customer_name', 'preferred_date'],
        },
      },
      server: { url: `${BASE_URL}/api/vapi/tools/schedule`, secret: webhookSecret },
    })
  }

  if (capabilities.includes('qualify_leads')) {
    tools.push({
      type: 'function',
      function: {
        name: 'capture_lead',
        description: 'Save caller information as a lead',
        parameters: {
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            interest: { type: 'string' },
            qualified: { type: 'boolean', description: 'Whether caller meets qualifying criteria' },
            notes: { type: 'string' },
          },
          required: ['first_name', 'phone'],
        },
      },
      server: { url: `${BASE_URL}/api/vapi/tools/capture-lead`, secret: webhookSecret },
    })
  }

  // take_message always available
  tools.push({
    type: 'function',
    function: {
      name: 'take_message',
      description: 'Record a message from caller for the rep to follow up on',
      parameters: {
        type: 'object',
        properties: {
          caller_name: { type: 'string' },
          caller_phone: { type: 'string' },
          message: { type: 'string' },
          urgency: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Urgency level' },
          callback_requested: { type: 'boolean' },
        },
        required: ['caller_name', 'message'],
      },
    },
    server: { url: `${BASE_URL}/api/vapi/tools/take-message`, secret: webhookSecret },
  })

  const vapiBody: Record<string, any> = {
    name: `${rep.full_name} — ${assistantName} (${rep.company})`,
    metadata: {
      rep_id: rep.id,
      rep_name: rep.full_name,
      company: rep.company,
      assistant_name: assistantName,
      session_type: 'business_assistant',
      app: 'clozr',
    },
    model: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      messages: [{ role: 'system', content: systemPrompt }],
      tools,
      temperature: 0.7,
      maxTokens: 200,
    },
    voice: {
      provider: 'elevenlabs',
      voiceId,
      stability: 0.5,
      similarityBoost: 0.75,
      optimizeStreamingLatency: 3,
    },
    firstMessage,
    endCallMessage,
    serverUrl: `${BASE_URL}/api/vapi/webhook`,
    serverUrlSecret: webhookSecret,
    recordingEnabled: true,
    hipaaEnabled: false,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800,
    backgroundSound: 'office',
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
  }

  if (rep.vapi_phone_number_id) {
    vapiBody.phoneNumberId = rep.vapi_phone_number_id
  }

  const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vapiBody),
  })

  if (!vapiResponse.ok) {
    const err = await vapiResponse.json()
    console.error('Vapi assistant creation failed:', err)
    return NextResponse.json({ success: false, error: err.message ?? 'Vapi error' }, { status: 500 })
  }

  const vapiData = await vapiResponse.json()
  await admin.from('reps').update({ vapi_assistant_id: vapiData.id }).eq('id', user.id)

  // Wire Twilio if phone number SID exists
  const sid = config.business_number_sid || config.assistant_number_sid
  if (sid) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      await twilio.incomingPhoneNumbers(sid).update({
        voiceUrl: `https://api.vapi.ai/twilio/${vapiData.id}`,
      })
    } catch (twilioErr) {
      console.error('Twilio update failed:', twilioErr)
    }
  }

  // Auto-import phone to Vapi if number exists but not imported yet
  if (!rep.vapi_phone_number_id && config.business_number) {
    void fetch(`${BASE_URL}/api/vapi/import-phone-number`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: config.business_number, sid }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, assistantId: vapiData.id })
}
