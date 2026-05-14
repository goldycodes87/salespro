export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
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

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  const { data: rep } = await admin
    .from('reps')
    .select('full_name, company, assistant_config')
    .eq('id', user.id)
    .single()

  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })

  const config = (rep.assistant_config ?? {}) as Record<string, any>
  const assistantName = config.name || 'Alex'
  const voiceId = config.voice_id || 'pNInz6obpgDQGcFmaJgB'
  const firstName = (rep.full_name ?? '').split(' ')[0]

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
  const systemPrompt = baseTemplate
    ? replaceVars(baseTemplate)
    : `You are ${assistantName}, the AI assistant for ${firstName} at ${rep.company}.
You help with quick sales tasks: summarizing pipeline, drafting follow-ups, answering scheduling questions.
Be concise and action-oriented. Keep responses under 100 words.`

  const greetingTemplate = getPrompt('greeting')
  const firstMessage = greetingTemplate
    ? replaceVars(greetingTemplate)
    : `Hi ${firstName}, what do you need?`

  return NextResponse.json({ systemPrompt, firstMessage, voiceId, assistantName })
}
