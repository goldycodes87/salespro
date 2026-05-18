export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface TranscriptTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

function parseTranscript(transcript: string): TranscriptTurn[] {
  const turns: TranscriptTurn[] = []
  const lines = transcript.split('\n').filter(Boolean)
  for (const line of lines) {
    if (line.startsWith('User:') || line.startsWith('user:')) {
      turns.push({ role: 'user', content: line.replace(/^[Uu]ser:\s*/, '').trim() })
    } else if (line.startsWith('Assistant:') || line.startsWith('assistant:') || line.startsWith('AI:')) {
      turns.push({ role: 'assistant', content: line.replace(/^(Assistant|assistant|AI):\s*/, '').trim() })
    }
  }
  return turns
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || body.type !== 'end-of-call-report') return NextResponse.json({ received: true })

  const admin = getSupabaseAdmin()
  const coachId = body.call?.assistantId
  const metaRepId = body.call?.metadata?.rep_id

  // Find rep — fast path via metadata, fallback via coach ID
  let rep: Record<string, any> | null = null
  if (metaRepId) {
    const { data } = await admin.from('reps').select('id, full_name').eq('id', metaRepId).single()
    rep = data ?? null
  }
  if (!rep && coachId) {
    const { data } = await admin.from('reps').select('id, full_name').eq('vapi_coach_id', coachId).maybeSingle()
    rep = data ?? null
  }
  if (!rep) return NextResponse.json({ received: true })

  const transcript = body.transcript ?? ''
  const durationSeconds = body.call?.durationSeconds ?? 0
  const turns = parseTranscript(transcript)

  if (turns.length > 0) {
    const now = new Date()
    await admin.from('coach_messages').insert(
      turns.map((turn, i) => ({
        rep_id: rep.id,
        persona_id: 'voice',
        role: turn.role,
        content: turn.content,
        created_at: new Date(now.getTime() + i * 1000).toISOString(),
      })),
    )
  }

  // Fire-and-forget memory extraction
  void fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clozrhq.com'}/api/coach/extract-memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: turns }),
  }).catch(() => {})

  void admin.from('api_usage_log').insert({
    rep_id: rep.id,
    service: 'vapi',
    endpoint: 'voice_coach',
    tokens_used: 0,
    estimated_cost_usd: (durationSeconds / 60) * 0.05,
    metadata: {
      rep_name: rep.full_name,
      persona: body.call?.metadata?.persona ?? 'unknown',
      duration_seconds: durationSeconds,
    },
  })

  return NextResponse.json({ received: true })
}
