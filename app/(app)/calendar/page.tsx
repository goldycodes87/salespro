import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import CalendarPage from '@/components/calendar/calendar-page'

export default async function Calendar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()

  const now = new Date()
  const twoMonthsOut = new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString()

  const [eventsResult, connectionsResult] = await Promise.all([
    admin
      .from('calendar_events')
      .select('id, title, start_at, end_at, all_day, location')
      .eq('rep_id', user.id)
      .gte('start_at', now.toISOString().split('T')[0] + 'T00:00:00.000Z')
      .lte('start_at', twoMonthsOut)
      .order('start_at', { ascending: true }),
    admin
      .from('calendar_connections')
      .select('id, provider, ical_url, last_synced_at, connected_at')
      .eq('rep_id', user.id),
  ])

  return (
    <CalendarPage
      events={eventsResult.data ?? []}
      connections={connectionsResult.data ?? []}
    />
  )
}
