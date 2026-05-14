export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

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

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const admin = getSupabaseAdmin()

  const { data: rep } = await admin
    .from('reps')
    .select('full_name, company, assistant_config, industry')
    .eq('id', user.id)
    .single()

  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const config = (rep.assistant_config ?? {}) as Record<string, any>
  if (!config.enabled) return NextResponse.json({ error: 'Assistant not enabled' }, { status: 403 })

  const assistantName = config.name || 'Alex'
  const firstName = (rep.full_name ?? '').split(' ')[0]

  // Fetch base prompt from DB
  const { data: promptRows } = await admin
    .from('assistant_prompts')
    .select('prompt_key, system_prompt')

  const getPrompt = (key: string) =>
    promptRows?.find((p: any) => p.prompt_key === key)?.system_prompt ?? ''

  const replaceVars = (template: string) =>
    template
      .replace(/{repName}/g, rep.full_name ?? '')
      .replace(/{assistantName}/g, assistantName)
      .replace(/{company}/g, rep.company ?? '')
      .replace(/{capabilities}/g, (config.capabilities as string[] ?? []).join(', '))
      .replace(/{qualifyingCriteria}/g, config.qualifying_criteria ?? '')

  const baseTemplate = getPrompt('base_assistant')
  const basePrompt = baseTemplate
    ? replaceVars(baseTemplate)
    : `You are ${assistantName}, the AI assistant for ${firstName} at ${rep.company}.
You help with quick sales tasks: summarizing pipeline, drafting follow-ups, answering scheduling questions.
Be concise and action-oriented. Keep responses under 150 words.`

  // Build context: today's calendar events, recent proposals, recent leads
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const [calendarRes, proposalsRes, leadsRes] = await Promise.all([
    admin
      .from('calendar_events')
      .select('title, start_at, end_at, all_day, location')
      .eq('rep_id', user.id)
      .gte('start_at', todayStart.toISOString())
      .lte('start_at', todayEnd.toISOString())
      .order('start_at', { ascending: true })
      .limit(8),
    admin
      .from('proposals')
      .select('customer_name, status, your_price, type, created_at')
      .eq('rep_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('leads')
      .select('first_name, last_name, status, city, state, appointment_date')
      .eq('rep_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' })

  const calendarSummary = calendarRes.data?.length
    ? calendarRes.data.map((e: any) =>
        `- ${e.title} @ ${e.all_day ? 'All day' : fmtTime(e.start_at)}${e.location ? ` (${e.location})` : ''}`
      ).join('\n')
    : 'No appointments today.'

  const proposalsSummary = proposalsRes.data?.length
    ? proposalsRes.data.map((p: any) =>
        `- ${p.customer_name}: ${p.status} — $${(p.your_price ?? 0).toLocaleString()} (${p.type})`
      ).join('\n')
    : 'No proposals.'

  const leadsSummary = leadsRes.data?.length
    ? leadsRes.data.map((l: any) =>
        `- ${l.first_name} ${l.last_name} (${l.status}) — ${l.city}, ${l.state}${l.appointment_date ? ` — appt ${l.appointment_date}` : ''}`
      ).join('\n')
    : 'No recent leads.'

  const contextBlock = `
## Current Context (as of ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Denver' })})

### Today's Schedule
${calendarSummary}

### Recent Proposals (last 10)
${proposalsSummary}

### Recent Leads (last 5)
${leadsSummary}
`.trim()

  const systemPrompt = `${basePrompt}\n\n${contextBlock}`

  // Fetch last 10 messages for context
  const { data: history } = await admin
    .from('assistant_messages')
    .select('role, content')
    .eq('rep_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const historyMessages = (history ?? []).reverse().map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
  }))

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      ...historyMessages,
      { role: 'user', content: message.trim() },
    ],
  })

  const replyContent = response.content[0].type === 'text' ? response.content[0].text : ''

  // Save both turns
  await admin.from('assistant_messages').insert([
    { rep_id: user.id, role: 'user', content: message.trim() },
    { rep_id: user.id, role: 'assistant', content: replyContent },
  ])

  // Log usage (fire-and-forget)
  void (async () => {
    try {
      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      const cost = (inputTokens / 1_000_000) * 0.80 + (outputTokens / 1_000_000) * 4.0
      await admin.from('api_usage_log').insert({
        rep_id: user.id,
        model: 'claude-haiku-4-5-20251001',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: cost,
        source: 'assistant_chat',
      })
    } catch {}
  })()

  return NextResponse.json({ message: replyContent, model_used: 'claude-haiku-4-5-20251001' })
}
