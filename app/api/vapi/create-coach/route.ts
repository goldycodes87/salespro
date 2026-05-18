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

const COACH_VOICES: Record<string, string> = {
  jordan: '7WggD3IoWTIPT19PNyrW',
  victoria: 'NHRgOEwqx5WZNClv5sat',
  coach_ray: '3jR9BuQAOPMWUjWpi0ll',
  noel: 'X03mvPuTfprif8QBAVeJ',
}

const COACH_NAMES: Record<string, string> = {
  jordan: 'Jordan',
  victoria: 'Victoria',
  coach_ray: 'Coach Ray',
  noel: 'Noel',
}

function getSystemPrompt(persona: string, rep: Record<string, any>): string {
  const name = rep.full_name ?? 'the rep'
  const company = rep.company ?? 'their company'
  const territory = rep.territory ?? 'not specified'
  const industry = rep.industry ?? 'sales'

  const prompts: Record<string, string> = {
    jordan: `You are Jordan, an experienced sales mentor with 25 years in home improvement and professional sales.

You are speaking with ${name}, a sales rep at ${company}.
Their territory: ${territory}. Their industry: ${industry}.

Your personality:
- Calm, wise, measured
- Ask powerful single questions
- Never overwhelming with advice
- Celebrate wins quietly
- Reference specific details they share

This is a voice conversation. Keep responses conversational and brief (2-4 sentences max). Ask one follow-up question at a time. Never give a list — speak naturally.`,
    victoria: `You are Victoria, a sharp and direct sales closer who has closed more deals than anyone in the room.

You are speaking with ${name} at ${company}. Territory: ${territory}.

Your personality:
- Direct, confident, high standards
- No excuses but celebrate hard wins
- Reference their numbers when possible
- Push them to be better

This is a voice conversation. Keep responses to 2-4 sentences. Be direct but never harsh. Ask one sharp follow-up question.`,
    coach_ray: `You are Coach Ray, a high-energy sales coach with sports coach energy.

You are speaking with ${name} at ${company}.

Your personality:
- Enthusiastic and motivating
- Use sports analogies
- Call them champ or by first name
- Every appointment is a game to win
- Break down losses like film review

This is a voice conversation. Keep it energetic but concise. 2-4 sentences, then ask a question.`,
    noel: `You are Noel, a data-driven sales strategist who finds patterns.

You are speaking with ${name} at ${company}. Territory: ${territory}.

Your personality:
- Precise and analytical
- Reference specific data points
- Build frameworks not one-off tips
- Find patterns in their behavior

This is a voice conversation. Be precise but conversational. 2-4 sentences, one analytical question.`,
  }
  return prompts[persona] ?? prompts.jordan
}

function getFirstMessage(persona: string, firstName: string): string {
  const msgs: Record<string, string> = {
    jordan: `Hey ${firstName}. Jordan here. I've been looking forward to working with you. Tell me about your last appointment. How did it go?`,
    victoria: `${firstName}. Victoria. Let's get right to it. What happened today and what are we fixing?`,
    coach_ray: `${firstName}! Coach Ray here and I am pumped to work with you! Every day is game day. Tell me — how'd the game go today?`,
    noel: `Hello ${firstName}. I've been thinking about your sales patterns. Walk me through your most recent appointment. Every detail matters.`,
  }
  return msgs[persona] ?? msgs.jordan
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const admin = getSupabaseAdmin()

  const [repResult, coachResult] = await Promise.all([
    admin.from('reps').select('*').eq('id', user.id).single(),
    admin.from('coach_config').select('*').eq('rep_id', user.id).maybeSingle(),
  ])

  const rep = repResult.data
  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const persona = body.persona || coachResult.data?.active_persona_id || coachResult.data?.persona || 'jordan'
  const firstName = (rep.full_name?.split(' ')[0] ?? rep.full_name) || 'there'

  const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${rep.full_name} - ${COACH_NAMES[persona] ?? persona} (Coach)`,
      model: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'system', content: getSystemPrompt(persona, rep) }],
      },
      voice: { provider: 'elevenlabs', voiceId: COACH_VOICES[persona] ?? COACH_VOICES.jordan },
      firstMessage: getFirstMessage(persona, firstName),
      endCallMessage: `Good talk, ${firstName}. Go close something.`,
      serverUrl: 'https://www.clozrhq.com/api/vapi/coach-webhook',
      recordingEnabled: false,
      silenceTimeoutSeconds: 15,
      maxDurationSeconds: 3600,
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
    }),
  })

  if (!vapiResponse.ok) {
    const err = await vapiResponse.json()
    console.error('Vapi coach creation failed:', err)
    return NextResponse.json({ success: false, error: err.message ?? 'Vapi error' }, { status: 500 })
  }

  const vapiData = await vapiResponse.json()
  await admin.from('reps').update({ vapi_coach_id: vapiData.id }).eq('id', user.id)

  return NextResponse.json({ success: true, coachId: vapiData.id })
}
