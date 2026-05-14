import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import DashboardHero from '@/components/dashboard/dashboard-hero'
import StatCards from '@/components/dashboard/stat-cards'
import CalendarSyncOnLoad from '@/components/dashboard/calendar-sync'
import WelcomeToast from '@/components/dashboard/welcome-toast'
import { getMTStartOfDay, getMTStartOfWeek, getMTHour } from '@/lib/time'
import { getTerminology } from '@/lib/platform-registry'

const COACH_META: Record<string, { name: string; color: string; photo: string }> = {
  jordan:    { name: 'Jordan',    color: '#1D4ED8', photo: '/coaches/jordan.png' },
  victoria:  { name: 'Victoria',  color: '#7C3AED', photo: '/coaches/victoria.png' },
  coach_ray: { name: 'Coach Ray', color: '#DC2626', photo: '/coaches/coach-ray.png' },
  noel:      { name: 'Noel',      color: '#0F766E', photo: '/coaches/noel.png' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new:       { bg: 'rgba(29,78,216,0.15)',  text: '#60A5FA', border: '#3B82F6' },
  contacted: { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: '#F59E0B' },
  proposed:  { bg: 'rgba(6,182,212,0.15)',  text: '#22D3EE', border: '#06B6D4' },
  closed:    { bg: 'rgba(16,185,129,0.15)', text: '#34D399', border: '#10B981' },
  draft:     { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF', border: 'rgba(255,255,255,0.15)' },
  sent:      { bg: 'rgba(29,78,216,0.15)',  text: '#60A5FA', border: 'rgba(29,78,216,0.6)' },
  signed:    { bg: 'rgba(16,185,129,0.15)', text: '#34D399', border: 'rgba(16,185,129,0.6)' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const repData = user
    ? await supabase.from('reps').select('headshot_url, full_name, industry, assistant_config').eq('id', user.id).single()
    : null
  const rep = repData?.data ?? null
  const terminology = getTerminology(rep?.industry)

  const now = new Date()
  const mtHour = getMTHour(now)
  const todayStart = getMTStartOfDay(now).toISOString()
  const weekStart = getMTStartOfWeek(now).toISOString()

  const greetingPrefix =
    mtHour < 12 ? 'Good morning'
    : mtHour < 17 ? 'Good afternoon'
    : 'Good evening'

  const motivationalLine =
    mtHour < 12 ? `Let's close some ${terminology.proposal.toLowerCase()}s today. 💪`
    : mtHour < 17 ? `Keep closing ${terminology.proposal.toLowerCase()}s. 🔥`
    : 'Great work today. 🎯'

  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now)

  const admin = getSupabaseAdmin()

  // Today's schedule: calendar events for today
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // Dashboard stats — all scoped to current rep via RLS
  const [todayProposals, weekProposals, pipeline, signed, recentProposals, recentLeads, followUps, todayEvents, calendarConnection] =
    await Promise.all([
      // Today's proposals
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('rep_id', user?.id ?? '')
        .gte('created_at', todayStart),

      // This week's proposals
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('rep_id', user?.id ?? '')
        .gte('created_at', weekStart),

      // Pipeline value (unsigned proposals)
      supabase
        .from('proposals')
        .select('your_price')
        .eq('rep_id', user?.id ?? '')
        .neq('status', 'signed'),

      // Signed proposals
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('rep_id', user?.id ?? '')
        .eq('status', 'signed'),

      // Recent proposals
      supabase
        .from('proposals')
        .select('id, customer_name, type, status, your_price, created_at')
        .eq('rep_id', user?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent leads
      supabase
        .from('leads')
        .select('id, first_name, last_name, spouse_first_name, is_married, city, state, status, appointment_date')
        .eq('rep_id', user?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(5),

      // Upcoming partial job follow-ups (within 30 days, including overdue)
      supabase
        .from('proposals')
        .select('id, customer_first_name, customer_last_name, customer_phone, followup_date, partial_job_notes')
        .eq('rep_id', user?.id ?? '')
        .eq('is_partial_job', true)
        .eq('status', 'signed')
        .not('followup_date', 'is', null)
        .lte('followup_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('followup_date', { ascending: true })
        .limit(10),

      // Today's calendar events
      user
        ? admin
            .from('calendar_events')
            .select('id, title, start_at, end_at, all_day, location')
            .eq('rep_id', user.id)
            .gte('start_at', todayStart)
            .lte('start_at', todayEnd.toISOString())
            .order('start_at', { ascending: true })
            .limit(8)
        : Promise.resolve({ data: [] }),

      // Calendar connection check
      user
        ? admin.from('calendar_connections').select('id').eq('rep_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  const pipelineValue = (pipeline.data ?? []).reduce(
    (sum: number, p: any) => sum + (p.your_price ?? 0),
    0,
  )

  const stats = [
    { label: "Today's Proposals", value: String(todayProposals.count ?? 0), accent: '#3B82F6', glow: 'rgba(29,78,216,0.25)', href: '/proposals?filter=today',  icon: 'file' as const },
    { label: 'This Week',         value: String(weekProposals.count ?? 0),  accent: '#14B8A6', glow: 'rgba(15,118,110,0.25)', href: '/proposals?filter=week', icon: 'calendar' as const },
    {
      label: 'Pipeline Value',
      value: pipelineValue >= 1000
        ? `$${(pipelineValue / 1000).toFixed(0)}k`
        : `$${pipelineValue.toFixed(0)}`,
      accent: '#06B6D4',
      glow: 'rgba(6,182,212,0.25)',
      mono: true,
      href: '/proposals?filter=pipeline',
      icon: 'trending' as const,
    },
    { label: 'Signed', value: String(signed.count ?? 0), accent: '#10B981', glow: 'rgba(16,185,129,0.25)', href: '/proposals?filter=signed', icon: 'check' as const },
  ]

  const statusBadge = (status: string) => {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.new
    return (
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
        style={{ background: c.bg, color: c.text }}
      >
        {status}
      </span>
    )
  }

  const leadBorderColor = (status: string) => (STATUS_COLORS[status] ?? STATUS_COLORS.new).border

  const coachConfigData = user
    ? await admin.from('coach_config').select('active_persona_id').eq('rep_id', user.id).maybeSingle()
    : null
  const coachPersona = (coachConfigData?.data as any)?.active_persona_id as string | null ?? null
  const coachMeta = coachPersona ? (COACH_META[coachPersona] ?? null) : null

  const assistantConfig = (rep as any)?.assistant_config as Record<string, any> | null
  const assistantEnabled = assistantConfig?.enabled === true

  return (
    <div style={{
      background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(15,118,110,0.08) 0%, transparent 70%)',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
    <img
      src="/clozr-icon.png"
      alt=""
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        height: 500,
        width: 'auto',
        opacity: 0.30,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
    <div style={{ position: 'relative', zIndex: 1 }}>
    <CalendarSyncOnLoad />
    <WelcomeToast />
    <div className="px-4 pt-6 pb-6 max-w-2xl mx-auto">
      <DashboardHero
        greetingPrefix={greetingPrefix}
        dateStr={dateStr}
        motivationalLine={motivationalLine}
        repName={rep?.full_name ?? undefined}
      />

      <StatCards stats={stats} />

      {/* Today's Schedule */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: '#F9FAFB' }}>Today&apos;s Schedule</h2>
          <Link href="/calendar" className="text-xs font-medium" style={{ color: '#3B82F6' }}>View calendar</Link>
        </div>
        {!calendarConnection?.data ? (
          <Link href="/calendar" className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(29,78,216,0.15)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Connect your calendar</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Sync Google Calendar to see your schedule here</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ) : todayEvents.data && todayEvents.data.length > 0 ? (
          <div className="space-y-2">
            {todayEvents.data.map((ev: any) => {
              const timeStr = ev.all_day
                ? 'All day'
                : new Date(ev.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' })
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '3px solid #3B82F6' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(29,78,216,0.15)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>{ev.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      {timeStr}{ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl p-4 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: '#6B7280' }}>No appointments today</p>
          </div>
        )}
      </section>

      {/* Recent Proposals */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: '#F9FAFB' }}>Recent Proposals</h2>
          <Link href="/proposals" className="text-xs font-medium" style={{ color: '#3B82F6' }}>See all</Link>
        </div>

        {!recentProposals.data?.length ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: '#6B7280' }}>No proposals yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProposals.data.map((p: any) => {
              const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft
              return (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl overflow-hidden"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${sc.border}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>{p.customer_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280', textTransform: 'capitalize' }}>{p.type}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {statusBadge(p.status)}
                    <span className="text-sm font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>
                      ${(p.your_price ?? 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Leads */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: '#F9FAFB' }}>Recent Leads</h2>
          <Link href="/leads" className="text-xs font-medium" style={{ color: '#3B82F6' }}>See all</Link>
        </div>

        {!recentLeads.data?.length ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: '#6B7280' }}>No leads yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLeads.data.map((lead: any) => {
              const name = lead.is_married && lead.spouse_first_name
                ? `${lead.first_name} & ${lead.spouse_first_name} ${lead.last_name}`
                : `${lead.first_name} ${lead.last_name}`
              const appt = lead.appointment_date
                ? new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null

              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl overflow-hidden"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${leadBorderColor(lead.status)}` }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA' }}
                  >
                    {lead.first_name[0]}{lead.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>
                      {lead.city}, {lead.state}{appt ? ` · ${appt}` : ''}
                    </p>
                  </div>
                  {statusBadge(lead.status)}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Upcoming Follow-ups */}
      {followUps.data && followUps.data.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Upcoming Follow-ups</h2>
          </div>
          <div className="space-y-2">
            {followUps.data.map((fu: any) => {
              const name = [fu.customer_first_name, fu.customer_last_name].filter(Boolean).join(' ') || 'Customer'
              const today = new Date(); today.setHours(0,0,0,0)
              const followDate = new Date(fu.followup_date + 'T12:00:00')
              const daysUntil = Math.round((followDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const isOverdue = daysUntil < 0
              const isUrgent = daysUntil >= 0 && daysUntil <= 7
              const color = isOverdue ? '#EF4444' : isUrgent ? '#FCD34D' : '#34D399'
              const colorBg = isOverdue ? 'rgba(239,68,68,0.1)' : isUrgent ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'
              const label = isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `In ${daysUntil}d`
              return (
                <Link key={fu.id} href={`/proposals/${fu.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>Partial job follow-up</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: colorBg, color }}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* AI Coach */}
      {coachMeta && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <img
              src={coachMeta.photo}
              alt={coachMeta.name}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Your coach is {coachMeta.name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>AI Sales Coach</p>
            </div>
            <Link
              href="/coach"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: `${coachMeta.color}20`, color: coachMeta.color, border: `1px solid ${coachMeta.color}40` }}
            >
              Chat now →
            </Link>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: assistantEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={assistantEnabled ? '#10B981' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.37 6.37l.72-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {assistantEnabled ? (
              <>
                <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#F9FAFB' }}>
                  AI Assistant — Active
                  <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  {assistantConfig?.name || 'Alex'}{(assistantConfig?.capabilities as string[] | null)?.length ? ` · ${(assistantConfig!.capabilities as string[]).length} capabilities` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>AI Assistant</p>
                <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>Set up your assistant</p>
              </>
            )}
          </div>
          <Link
            href="/settings?tab=assistant"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {assistantEnabled ? 'Configure →' : 'Set up →'}
          </Link>
        </div>
      </div>
    </div>
    </div>
    </div>
  )
}
