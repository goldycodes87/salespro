import { createClient } from '@/lib/supabase/server'
import ProposalWizard from '@/components/proposals/proposal-wizard'
import Link from 'next/link'

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string }>
}) {
  const { lead_id } = await searchParams
  let defaultCustomer = {}

  if (lead_id) {
    const supabase = await createClient()
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name, email, phone, spouse_first_name, spouse_last_name, address, city, state, zip')
      .eq('id', lead_id)
      .single()
    if (lead) defaultCustomer = lead
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={lead_id ? `/leads/${lead_id}` : '/proposals'}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>New Proposal</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>3 steps to a complete proposal</p>
        </div>
      </div>

      <ProposalWizard leadId={lead_id} defaultCustomer={defaultCustomer} />
    </div>
  )
}
