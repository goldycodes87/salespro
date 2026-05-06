import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (error || !proposal) notFound()

  return <PresentView proposal={proposal} />
}
