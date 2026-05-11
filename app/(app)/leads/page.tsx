import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:       { bg: 'rgba(29,78,216,0.15)',  text: '#60A5FA' },
  contacted: { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  proposed:  { bg: 'rgba(6,182,212,0.15)',  text: '#22D3EE' },
  closed:    { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

const FILTERS = ['All', 'New', 'Contacted', 'Proposed', 'Closed']

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('leads')
    .select('*')
    .eq('rep_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status.toLowerCase())
  }

  const { data: leads = [] } = await query

  return (
    <div className="px-4 pt-6 pb-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Leads</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
          {leads?.length ?? 0} lead{leads?.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map(f => {
          const val = f.toLowerCase()
          const active = status === val || (f === 'All' && (!status || status === 'all'))
          return (
            <Link
              key={f}
              href={f === 'All' ? '/leads' : `/leads?status=${val}`}
              className="flex-shrink-0 px-4 h-9 rounded-xl text-sm font-medium flex items-center"
              style={{
                background: active ? '#0F766E' : 'rgba(255,255,255,0.06)',
                color: active ? '#fff' : '#9CA3AF',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {f}
            </Link>
          )
        })}
      </div>

      {/* Leads list */}
      {!leads?.length ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>No leads yet</p>
          <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Add your first lead to get started</p>
          <Link
            href="/leads/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#0F766E', color: '#fff' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add First Lead
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead: any) => {
            const c = STATUS_COLORS[lead.status] ?? STATUS_COLORS.new
            const name = lead.is_married && lead.spouse_first_name
              ? `${lead.first_name} & ${lead.spouse_first_name} ${lead.last_name}`
              : `${lead.first_name} ${lead.last_name}`
            const apptDate = lead.appointment_date
              ? new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })
              : null

            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA' }}
                >
                  {lead.first_name[0]}{lead.last_name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
                    {lead.city}, {lead.state}
                    {apptDate ? ` · ${apptDate}` : ''}
                  </p>
                  {lead.lead_source && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#4B5563' }}>{lead.lead_source}</p>
                  )}
                </div>

                {/* Status + chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase"
                    style={{ background: c.bg, color: c.text }}
                  >
                    {lead.status}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
