export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { buildVoiceCoachConfig } from '@/lib/coach-prompt-builder'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const [repResult, configResult] = await Promise.all([
    admin
      .from('reps')
      .select('id, full_name, company, territory, industry')
      .eq('id', user.id)
      .single(),
    admin
      .from('coach_config')
      .select('persona, active_persona_id')
      .eq('rep_id', user.id)
      .maybeSingle(),
  ])

  if (!repResult.data) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const persona =
    configResult.data?.persona ||
    configResult.data?.active_persona_id ||
    'jordan'

  const config = await buildVoiceCoachConfig(repResult.data, persona, admin)

  return NextResponse.json({
    systemPrompt: config.systemPrompt,
    firstMessage: config.firstMessage,
    voiceId: config.voiceId,
    persona,
    repId: repResult.data.id,
    repName: repResult.data.full_name,
    company: repResult.data.company,
  })
}
