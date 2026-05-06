import LeadForm from '@/components/leads/lead-form'
import Link from 'next/link'

export default async function CreateLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const fromProposal = from === 'proposal'

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
      {/* From-proposal banner */}
      {fromProposal && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5"
          style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-sm" style={{ color: '#93C5FD' }}>
            Creating lead for proposal — will be linked automatically after save
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/leads"
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>New Lead</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {fromProposal ? 'Save to link this lead to your proposal' : 'Run AI research after saving from the lead file'}
          </p>
        </div>
      </div>

      <LeadForm redirectAfterSave={fromProposal ? '/proposals/new' : undefined} />
    </div>
  )
}
