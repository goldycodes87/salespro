export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getPersona } from '@/lib/coach-personas'
import { extractCoachMemory } from '@/lib/coach-memory'

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

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { personaId, content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const persona = getPersona(personaId)
  const admin = getSupabaseAdmin()

  // Fetch custom system prompt from DB, fall back to hardcoded persona
  const [{ data: dbPersona }, { data: repRow }] = await Promise.all([
    admin.from('coach_prompts').select('system_prompt').eq('persona_id', personaId).maybeSingle(),
    admin.from('reps').select('industry, full_name, company, position').eq('id', user.id).maybeSingle(),
  ])

  const baseSystemPrompt = dbPersona?.system_prompt ?? persona.systemPrompt

  const industryContext = repRow?.industry
    ? `\n\nREP CONTEXT: The rep works in the ${repRow.industry.replace(/_/g, ' ')} industry${repRow.company ? ` at ${repRow.company}` : ''}${repRow.position ? ` as a ${repRow.position}` : ''}. Tailor all advice to this industry context.`
    : ''

  // Save user message
  await admin.from('coach_messages').insert({
    rep_id: user.id,
    persona_id: personaId,
    role: 'user',
    content: content.trim(),
  })

  // Fetch recent history (includes message we just saved)
  const { data: historyRows } = await admin
    .from('coach_messages')
    .select('role, content')
    .eq('rep_id', user.id)
    .eq('persona_id', personaId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch persona memory
  const { data: memoryRow } = await admin
    .from('coach_memory')
    .select('memory_text')
    .eq('rep_id', user.id)
    .eq('persona_id', personaId)
    .maybeSingle()

  const systemPrompt = memoryRow?.memory_text
    ? `${baseSystemPrompt}${industryContext}\n\nREP MEMORY (facts from prior conversations):\n${memoryRow.memory_text}`
    : `${baseSystemPrompt}${industryContext}`

  const messages = (historyRows ?? [])
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  let replyContent = ''

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    })
    replyContent = response.content[0]?.type === 'text' ? response.content[0].text : ''
  } catch {
    try {
      const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 600,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      })
      const data = await oaiRes.json()
      replyContent = data.choices?.[0]?.message?.content ?? ''
    } catch {
      replyContent = "I'm having trouble responding right now. Please try again in a moment."
    }
  }

  if (!replyContent) replyContent = "I'm having trouble responding right now. Please try again."

  // Save assistant reply
  await admin.from('coach_messages').insert({
    rep_id: user.id,
    persona_id: personaId,
    role: 'assistant',
    content: replyContent,
  })

  // Fetch total message count — extract memory every 10 messages
  const { count } = await admin
    .from('coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('rep_id', user.id)
    .eq('persona_id', personaId)

  if ((count ?? 0) % 10 === 0) {
    void extractCoachMemory(user.id, personaId).catch(() => {})
  }

  return NextResponse.json({ role: 'assistant', content: replyContent })
}
