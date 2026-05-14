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

  // Fetch editable prompts from DB, fall back to hardcoded defaults
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

  // Use DB prompts if available, else fall back to hardcoded
  const systemPrompt = baseTemplate
    ? replaceVars(baseTemplate)
    : `You are ${assistantName}, the AI assistant for ${rep.full_name} at ${rep.company}.

Your job is to help callers and represent ${rep.company} professionally.

${capabilities.includes('schedule_appointments') ? `You can schedule appointments. When someone wants to book, collect:
- Their full name
- Their address
- Preferred date and time
- Best callback number
Then confirm you will pass this to ${rep.full_name}.` : 'Do not attempt to schedule appointments.'}

${capabilities.includes('qualify_leads') ? `You qualify leads based on these criteria: ${qualifyingCriteria}
Ask qualifying questions naturally in conversation. Note whether the caller qualifies.` : ''}

${capabilities.includes('take_messages') ? `Always offer to take a message if you cannot fully help the caller.
Get their name, number, and reason for calling.` : ''}

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

  const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${rep.full_name} - Assistant`,
      model: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'system', content: systemPrompt }],
      },
      voice: { provider: 'elevenlabs', voiceId },
      firstMessage,
      endCallMessage,
      serverUrl: 'https://clozrhq.com/api/vapi/webhook',
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'clozr-webhook-secret',
      recordingEnabled: true,
      hipaaEnabled: false,
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 1800,
      backgroundSound: 'office',
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
    }),
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

  return NextResponse.json({ success: true, assistantId: vapiData.id })
}
