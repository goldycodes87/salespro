import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeadDetail from '@/components/leads/lead-detail'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lead) notFound()

  const [referrerResult, referralsResult] = await Promise.all([
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
  ])

  return (
    <LeadDetail
      lead={lead}
      referrer={referrerResult.data ?? null}
      referrals={referralsResult.data ?? []}
    />
  )
}
