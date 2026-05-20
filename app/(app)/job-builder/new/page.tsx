import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import JobBuilderForm from '@/components/job-builder/job-builder-form'

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; lead_id?: string }>
}) {
  const { id, lead_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = getSupabaseAdmin()

  // Fetch rep's job type configs
  const { data: configs } = await admin
    .from('job_type_configs')
    .select('*')
    .eq('rep_id', user.id)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  // Fetch existing job if editing
  let existingJob: Record<string, any> | null = null
  if (id) {
    const { data } = await admin
      .from('proposals')
      .select('*')
      .eq('id', id)
      .eq('rep_id', user.id)
      .not('job_type_config_id', 'is', null)
      .single()
    if (!data) notFound()
    existingJob = data
  }

  const backHref = id ? `/job-builder/${id}` : lead_id ? `/leads/${lead_id}` : '/job-builder'

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6 lg:max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
            {existingJob ? 'Edit Job' : 'New Job'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {existingJob ? 'Update job details and pricing' : 'Configure job type, pricing, and customer'}
          </p>
        </div>
      </div>

      <JobBuilderForm
        configs={(configs ?? []) as any}
        existingJob={existingJob}
      />
    </div>
  )
}
