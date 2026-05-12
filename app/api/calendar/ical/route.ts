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

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { icalUrl } = await request.json()
  if (!icalUrl?.trim()) return NextResponse.json({ error: 'Missing icalUrl' }, { status: 400 })

  try {
    const res = await fetch(icalUrl.trim(), {
      headers: { 'User-Agent': 'Clozr/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const icalText = await res.text()

    const jCal = ICAL.parse(icalText)
    const comp = new ICAL.Component(jCal)
    const vevents = comp.getAllSubcomponents('vevent')

    const admin = getSupabaseAdmin()

    // Save/update iCal connection
    const { data: conn } = await admin
      .from('calendar_connections')
      .upsert(
        {
          rep_id: user.id,
          provider: 'ical',
          ical_url: icalUrl.trim(),
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'rep_id,ical_url' },
      )
      .select('id')
      .single()

    const connectionId = conn?.id

    // Parse events (next 60 days)
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
            rep_id: user.id,
            connection_id: connectionId ?? null,
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

    if (events.length && connectionId) {
      // Replace events for this connection
      await admin.from('calendar_events').delete().eq('connection_id', connectionId)
      await admin.from('calendar_events').insert(events)
    }

    return NextResponse.json({ ok: true, count: events.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to parse iCal' }, { status: 500 })
  }
}
