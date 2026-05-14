import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LeadsListClient from '@/components/leads/leads-list-client'

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
    .is('merged_into', null)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status.toLowerCase())
  }

  const { data: leads = [] } = await query

  return (
    <div className="px-4 pt-6 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Leads</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            {leads?.length ?? 0} lead{leads?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/leads/create"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#0F766E', color: '#fff' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </Link>
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

      <LeadsListClient leads={leads ?? []} />
    </div>
  )
}
