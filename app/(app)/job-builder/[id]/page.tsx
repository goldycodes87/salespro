import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import JobBuilderView from '@/components/job-builder/job-builder-view'

export default async function JobViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const { saved } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = getSupabaseAdmin()
  const { data: job, error } = await admin
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .not('job_type_config_id', 'is', null)
    .neq('status', 'archived')
    .single()

  if (error || !job) notFound()

  return <JobBuilderView job={job} showSavedToast={!!saved} />
}
