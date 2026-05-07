export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import ICAL from 'ical.js'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    return data.access_token ?? null
  } catch {
    return null
  }
}

async function syncGoogleCalendar(
  admin: ReturnType<typeof getSupabaseAdmin>,
  connection: { id: string; rep_id: string; access_token: string; refresh_token: string | null },
) {
  let token = connection.access_token

  const now = new Date()
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const eventsUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  eventsUrl.searchParams.set('timeMin', now.toISOString())
  eventsUrl.searchParams.set('timeMax', future.toISOString())
  eventsUrl.searchParams.set('singleEvents', 'true')
  eventsUrl.searchParams.set('orderBy', 'startTime')
  eventsUrl.searchParams.set('maxResults', '100')

  let res = await fetch(eventsUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 401 && connection.refresh_token) {
    const newToken = await refreshGoogleToken(connection.refresh_token)
    if (newToken) {
      token = newToken
      await admin.from('calendar_connections').update({ access_token: newToken }).eq('id', connection.id)
      res = await fetch(eventsUrl.toString(), { headers: { Authorization: `Bearer ${token}` } })
    }
  }

  if (!res.ok) return 0

  const data = await res.json()
  const items = data.items ?? []

  const events = items.map((item: any) => ({
    rep_id: connection.rep_id,
    connection_id: connection.id,
    external_id: item.id,
    title: item.summary ?? 'Untitled',
    start_at: item.start?.dateTime ?? item.start?.date + 'T00:00:00Z',
    end_at: item.end?.dateTime ?? item.end?.date + 'T00:00:00Z',
    all_day: !item.start?.dateTime,
    description: item.description ?? null,
    location: item.location ?? null,
  }))

  await admin.from('calendar_events').delete().eq('connection_id', connection.id)
  if (events.length) await admin.from('calendar_events').insert(events)

  await admin
    .from('calendar_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connection.id)

  return events.length
}

async function syncIcalConnection(
  admin: ReturnType<typeof getSupabaseAdmin>,
  connection: { id: string; rep_id: string; ical_url: string },
) {
  try {
    const res = await fetch(connection.ical_url, {
      headers: { 'User-Agent': 'SalesPro/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return 0
    const icalText = await res.text()
    const jCal = ICAL.parse(icalText)
    const comp = new ICAL.Component(jCal)
    const vevents = comp.getAllSubcomponents('vevent')

    const now = new Date()
    const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    const events = vevents
      .map((vevent: ICAL.Component) => {
        try {
          const ev = new ICAL.Event(vevent)
          const start = ev.startDate?.toJSDate()
          const end = ev.endDate?.toJSDate()
          if (!start || start < now || start > future) return null
          return {
            rep_id: connection.rep_id,
            connection_id: connection.id,
            external_id: ev.uid ?? null,
            title: ev.summary ?? 'Untitled',
            start_at: start.toISOString(),
            end_at: end?.toISOString() ?? start.toISOString(),
            all_day: ev.startDate?.isDate ?? false,
            description: ev.description ?? null,
            location: ev.location ?? null,
          }
        } catch {
          return null
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)

    await admin.from('calendar_events').delete().eq('connection_id', connection.id)
    if (events.length) await admin.from('calendar_events').insert(events)

    await admin
      .from('calendar_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id)

    return events.length
  } catch {
    return 0
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: connections } = await admin
    .from('calendar_connections')
    .select('*')
    .eq('rep_id', user.id)

  if (!connections?.length) return NextResponse.json({ ok: true, synced: 0 })

  let total = 0
  for (const conn of connections) {
    if (conn.provider === 'google') {
      total += await syncGoogleCalendar(admin, conn)
    } else if (conn.provider === 'ical' && conn.ical_url) {
      total += await syncIcalConnection(admin, conn)
    }
  }

  return NextResponse.json({ ok: true, synced: total })
}
