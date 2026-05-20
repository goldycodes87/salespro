import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import LeadDetail from '@/components/leads/lead-detail'

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ merged?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const merged = sp.merged === '1'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user?.id ?? '')
    .single()

  if (error || !lead) notFound()

  const admin = getSupabaseAdmin()
  const [referrerResult, referralsResult, proposalsResult, activityResult, repResult] = await Promise.all([
    lead.referred_by_lead_id
      ? supabase
          .from('leads')
          .select('id, first_name, last_name, city, state')
          .eq('id', lead.referred_by_lead_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('leads')
      .select('id, first_name, last_name, city, state')
      .eq('referred_by_lead_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('proposals')
      .select('id, type, status, your_price, created_at, job_type_config_id, pricing_data, job_type_snapshot')
      .eq('lead_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('lead_activity')
      .select('id, event_type, description, created_at')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    user ? admin.from('reps').select('id, full_name, company, phone, industry, assistant_config').eq('id', user.id).single() : Promise.resolve({ data: null }),
  ])

  return (
    <LeadDetail
      lead={lead}
      referrer={referrerResult.data ?? null}
      referrals={referralsResult.data ?? []}
      proposals={proposalsResult.data ?? []}
      activity={activityResult.data ?? []}
      rep={repResult.data ?? null}
      merged={merged}
    />
  )
}
