import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import PresentView from '@/components/proposals/present-view'

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = getSupabaseAdmin()

  const { data: proposal, error } = await admin
    .from('proposals')
    .select('*')
    .eq('public_token', token)
    .single()

  if (error || !proposal) notFound()

  const [repResult, rendersResult] = await Promise.all([
    admin.from('reps').select('settings').eq('id', proposal.rep_id).single(),
    admin.from('proposal_renders').select('*').eq('proposal_id', proposal.id).order('created_at', { ascending: true }),
  ])

  return (
    <PresentView
      proposal={proposal}
      repSettings={repResult.data?.settings ?? {}}
      renders={rendersResult.data ?? []}
      downloadPdfUrl={`/api/proposals/public/${token}/pdf`}
    />
  )
}
