export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // rep_id
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clozrhq.com'

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=calendar&error=${encodeURIComponent(error ?? 'oauth_failed')}`,
    )
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI!

  try {
    const tokenRes = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code,
          scope: 'Calendars.Read offline_access User.Read',
        }),
      },
    )

    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error(tokens.error_description ?? 'No access token')

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const admin = getSupabaseAdmin()
    await admin.from('calendar_connections').upsert(
      {
        rep_id: state,
        provider: 'microsoft',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry: expiresAt,
      },
      { onConflict: 'rep_id,provider' },
    )

    return NextResponse.redirect(`${baseUrl}/settings?tab=calendar&connected=true`)
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err)
    return NextResponse.redirect(`${baseUrl}/settings?tab=calendar&error=token_exchange_failed`)
  }
}
