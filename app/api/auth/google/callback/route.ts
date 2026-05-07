export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // repId
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL('/settings?tab=calendar&error=google_auth_failed', request.url),
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token')

    const admin = getSupabaseAdmin()
    await admin.from('calendar_connections').upsert(
      {
        rep_id: state,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'rep_id,provider' },
    )

    // Trigger initial sync
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(request.url).origin
      : 'http://localhost:3000'
    fetch(`${baseUrl}/api/calendar/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repId: state }),
    }).catch(() => {})

    return NextResponse.redirect(new URL('/settings?tab=calendar&connected=google', request.url))
  } catch {
    return NextResponse.redirect(
      new URL('/settings?tab=calendar&error=google_token_failed', request.url),
    )
  }
}
