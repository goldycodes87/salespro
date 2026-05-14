export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import CoachPage from '@/components/coach/coach-page'

export default async function Coach() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const [repResult, configResult] = await Promise.all([
    supabase.from('reps').select('full_name').eq('id', user.id).single(),
    admin.from('coach_config').select('active_persona_id').eq('rep_id', user.id).maybeSingle(),
  ])

  const repName = repResult.data?.full_name ?? 'there'
  const activePersonaId = configResult.data?.active_persona_id ?? null

  return <CoachPage repName={repName} initialPersonaId={activePersonaId} />
}
