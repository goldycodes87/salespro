export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { encryptCredentials } from '@/lib/crypto'
import { DAVClient } from 'tsdav'

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

  const { email, password } = await request.json()
  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  try {
    const client = new DAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username: email.trim(), password: password.trim() },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    })

    await client.login()
    const calendars = await client.fetchCalendars()
    if (!calendars || calendars.length === 0) {
      return NextResponse.json({ error: 'No calendars found on this iCloud account' }, { status: 400 })
    }

    const encrypted = encryptCredentials({ email: email.trim(), password: password.trim() })

    const admin = getSupabaseAdmin()
    await admin.from('calendar_connections').upsert(
      {
        rep_id: user.id,
        provider: 'caldav_icloud',
        encrypted_credentials: encrypted,
        account_email: email.trim(),
      },
      { onConflict: 'rep_id,provider' },
    )

    return NextResponse.json({ ok: true, calendarsFound: calendars.length })
  } catch (err: unknown) {
    console.error('CalDAV connect error:', err)
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
