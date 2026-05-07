import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import PresentView from '@/components/proposals/present-view'

export default async function PresentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = getSupabaseAdmin()

  const [proposalResult, repResult] = await Promise.all([
    supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .eq('rep_id', user.id)
      .single(),
    admin.from('reps').select('settings').eq('id', user.id).single(),
  ])

  if (proposalResult.error || !proposalResult.data) notFound()

  return (
    <PresentView
      proposal={proposalResult.data}
      backHref={`/proposals/${id}`}
      repSettings={repResult.data?.settings ?? {}}
    />
  )
}
