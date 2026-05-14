export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { extractCoachMemory } from '@/lib/coach-memory'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { transcript?: string; summary?: string; durationSeconds?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { transcript = '', summary = '', durationSeconds = 0 } = body
  const admin = getSupabaseAdmin()

  const { data: coachConfig } = await admin
    .from('coach_config')
    .select('persona, active_persona_id')
    .eq('rep_id', user.id)
    .maybeSingle()

  const personaId = coachConfig?.persona || coachConfig?.active_persona_id || 'jordan'

  // Parse transcript lines into turns
  // Vapi format: "AI: ..." / "User: ..." or "Assistant: ..."
  const lines = transcript.split('\n').filter(Boolean)
  const turns: { rep_id: string; persona_id: string; role: 'user' | 'assistant'; content: string }[] = []

  for (const line of lines) {
    const assistantMatch = line.match(/^(?:AI|Assistant|Coach)[:\s]+(.+)/i)
    const userMatch = line.match(/^(?:User|You)[:\s]+(.+)/i)
    if (assistantMatch?.[1]?.trim()) {
      turns.push({ rep_id: user.id, persona_id: personaId, role: 'assistant', content: assistantMatch[1].trim() })
    } else if (userMatch?.[1]?.trim()) {
      turns.push({ rep_id: user.id, persona_id: personaId, role: 'user', content: userMatch[1].trim() })
    }
  }

  if (turns.length > 0) {
    await admin.from('coach_messages').insert(turns)
  }

  // Fire-and-forget memory extraction (direct call — no HTTP round-trip)
  void Promise.resolve(extractCoachMemory(user.id, personaId))

  // Log usage
  if (durationSeconds > 0) {
    void (async () => {
      try {
        await admin.from('api_usage_log').insert({
          rep_id: user.id,
          service: 'vapi',
          endpoint: 'voice_coach',
          estimated_cost_usd: (durationSeconds / 60) * 0.05,
        })
      } catch { /* non-critical */ }
    })()
  }

  return NextResponse.json({ success: true })
}
