import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function extractCoachMemory(repId: string, personaId: string) {
  if (!process.env.ANTHROPIC_API_KEY) return

  const admin = getSupabaseAdmin()

  const { data: messages } = await admin
    .from('coach_messages')
    .select('role, content')
    .eq('rep_id', repId)
    .eq('persona_id', personaId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (!messages?.length) return

  const transcript = messages
    .reverse()
    .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
    .join('\n')

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Extract key facts about the sales rep from this coaching conversation transcript. Focus on: their goals, recent wins or losses, specific struggles mentioned, appointments or deals discussed, pricing challenges, and any personal context a coach should remember. Format as short bullet points. Max 12 bullets. Be specific and factual. Omit generic advice.`,
      messages: [{ role: 'user', content: transcript }],
    })

    const memoryText =
      response.content[0]?.type === 'text' ? response.content[0].text : ''
    if (!memoryText) return

    await admin.from('coach_memory').upsert(
      { rep_id: repId, persona_id: personaId, memory_text: memoryText },
      { onConflict: 'rep_id,persona_id' },
    )
  } catch {
    // Memory extraction is best-effort
  }
}
