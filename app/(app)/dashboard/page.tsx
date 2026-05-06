import { createClient } from '@/lib/supabase/server'
import DashboardHero from '@/components/dashboard/dashboard-hero'
import StatCards from '@/components/dashboard/stat-cards'

export default async function DashboardPage() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  const now = new Date()

  // Mountain Time hour — avoids UTC offset being treated as local
  const mtHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: '2-digit',
      hour12: false,
    }).format(now),
    10
  ) % 24 // guard against rare '24' on midnight

  const greetingPrefix =
    mtHour < 12 ? 'Good morning'
    : mtHour < 17 ? 'Good afternoon'
    : 'Good evening'

  const motivationalLine =
    mtHour < 12 ? "Let's make today count. 💪"
    : mtHour < 17 ? 'Keep closing. 🔥'
    : 'Great work today. 🎯'

  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)

  return (
    <div className="px-4 pt-6 pb-6 max-w-2xl mx-auto">
      <DashboardHero
        greetingPrefix={greetingPrefix}
        dateStr={dateStr}
        motivationalLine={motivationalLine}
      />

      <StatCards />

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
