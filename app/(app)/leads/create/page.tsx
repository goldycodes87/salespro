import LeadForm from '@/components/leads/lead-form'
import Link from 'next/link'

export default function CreateLeadPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
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
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Save as draft or save and run AI research</p>
        </div>
      </div>

      <LeadForm />
    </div>
  )
}
