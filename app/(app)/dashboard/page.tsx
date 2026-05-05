import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="px-4 pt-14 pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>
          {greeting}, Eric
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>{dateStr}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { label: "Today's Proposals", value: '0', accent: '#1D4ED8' },
          { label: 'This Week', value: '0', accent: '#0F766E' },
          { label: 'Pipeline Value', value: '$0', accent: '#06B6D4', mono: true },
          { label: 'Signed', value: '0', accent: '#10B981' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4"
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>{stat.label}</p>
            <p
              className="text-2xl font-bold"
              style={{
                color: stat.accent,
                fontFamily: stat.mono ? "'JetBrains Mono', monospace" : 'inherit',
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Proposals */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Recent Proposals</h2>
          <a href="/proposals" className="text-xs font-medium" style={{ color: '#3B82F6' }}>See all</a>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-sm" style={{ color: '#6B7280' }}>No proposals yet</p>
        </div>
      </section>

      {/* Recent Leads */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Recent Leads</h2>
          <a href="/leads" className="text-xs font-medium" style={{ color: '#3B82F6' }}>See all</a>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-sm" style={{ color: '#6B7280' }}>No leads yet</p>
        </div>
      </section>

      {/* Vapi placeholder */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(17,24,39,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.37 6.37l.72-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>AI Call Assistant</p>
            <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>Coming Soon</p>
          </div>
          <div
            className="ml-auto text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Vapi
          </div>
        </div>
      </div>
    </div>
  )
}
