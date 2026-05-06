export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/leads
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const admin = getSupabaseAdmin()
  let query = admin
    .from('leads')
    .select('*')
    .eq('rep_id', user.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status.toLowerCase())
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/leads
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const admin = getSupabaseAdmin()

  // Build photo URL — try Street View first, fall back to satellite
  const googleKey = process.env.GOOGLE_MAPS_API_KEY
  let streetViewUrl: string | null = null
  let photoType: string = 'street_view'
  if (googleKey && googleKey.length > 10) {
    const parts = [body.address, body.city, body.state, body.zip].filter(Boolean)
    const locationStr = encodeURIComponent(parts.join(' '))
    const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${locationStr}&key=${googleKey}`
    try {
      const metaRes = await fetch(metaUrl)
      const metaJson = await metaRes.json()
      if (metaJson.status === 'OK') {
        streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${locationStr}&key=${googleKey}`
        photoType = 'street_view'
      } else {
        streetViewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${locationStr}&zoom=19&size=800x400&maptype=satellite&key=${googleKey}`
        photoType = 'satellite'
      }
    } catch {
      streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${locationStr}&key=${googleKey}`
      photoType = 'street_view'
    }
  } else {
    console.log('[Photo] GOOGLE_MAPS_API_KEY not set — skipping')
  }

  // Insert lead row
  const { data: lead, error: insertError } = await admin
    .from('leads')
    .insert({
      rep_id: user.id,
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone || null,
      email: body.email || null,
      is_married: body.is_married ?? false,
      spouse_first_name: body.spouse_first_name || null,
      spouse_last_name: body.spouse_last_name || null,
      spouse_phone: body.spouse_phone || null,
      spouse_email: body.spouse_email || null,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      appointment_date: body.appointment_date || null,
      lead_source: body.lead_source || null,
      notes: body.notes || null,
      street_view_url: streetViewUrl,
      photo_type: photoType,
      status: 'new',
    })
    .select()
    .single()

  if (insertError || !lead) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to create lead' },
      { status: 500 },
    )
  }

  if (streetViewUrl) {
    await admin.from('api_usage_log').insert({
      rep_id: user.id,
      service: 'google_maps',
      endpoint: photoType === 'satellite' ? 'staticmap' : 'streetview',
      tokens_used: 0,
      estimated_cost_usd: 0.007,
    })
  }

  return NextResponse.json({ id: lead.id }, { status: 201 })
}
