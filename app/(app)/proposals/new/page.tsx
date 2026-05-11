import { createClient } from '@/lib/supabase/server'
import ProposalWizard from '@/components/proposals/proposal-wizard'
import Link from 'next/link'

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string; id?: string }>
}) {
  const { lead_id, id } = await searchParams
  const supabase = await createClient()
  let defaultCustomer: Record<string, any> = {}
  let existingProposal: Record<string, any> | null = null
  let repSettings: Record<string, any> | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: rep } = await supabase.from('reps').select('settings').eq('id', user.id).single()
    repSettings = rep?.settings ?? null
  }

  if (id) {
    const { data } = await supabase.from('proposals').select('*').eq('id', id).eq('rep_id', user?.id ?? '').single()
    if (data) existingProposal = data
  } else if (lead_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name, email, phone, spouse_first_name, spouse_last_name, address, city, state, zip')
      .eq('id', lead_id)
      .eq('rep_id', user?.id ?? '')
      .single()
    if (lead) defaultCustomer = lead
  }

  const backHref = existingProposal ? `/proposals/${id}` : lead_id ? `/leads/${lead_id}` : '/proposals'

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={backHref}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
            {existingProposal ? 'Edit Proposal' : 'New Proposal'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {existingProposal ? 'Update proposal details' : '3 steps to a complete proposal'}
          </p>
        </div>
      </div>

      <ProposalWizard
        leadId={lead_id}
        defaultCustomer={defaultCustomer}
        editId={id}
        existingProposal={existingProposal}
        repSettings={repSettings}
      />
    </div>
  )
}
