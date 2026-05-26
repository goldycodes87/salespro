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
  const search = searchParams.get('search')

  const admin = getSupabaseAdmin()
  let query = admin
    .from('leads')
    .select('*')
    .eq('rep_id', user.id)
    .is('merged_into', null)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status.toLowerCase())
  }

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
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

  // Insert lead immediately (no photo blocking the response)
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
      street_view_url: null,
      photo_type: null,
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

  // Fetch photo after responding (fire-and-forget)
  void (async () => {
    const googleKey = process.env.GOOGLE_MAPS_API_KEY
    if (!googleKey || googleKey.length <= 10 || !body.address || !body.city) return
    const parts = [body.address, body.city, body.state, body.zip].filter(Boolean)
    const locationStr = encodeURIComponent(parts.join(' '))
    let streetViewUrl: string | null = null
    let photoType = 'street_view'
    try {
      const svCheckUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${locationStr}&key=${googleKey}&return_error_code=true`
      const svResponse = await fetch(svCheckUrl)
      if (svResponse.ok && svResponse.status === 200) {
        streetViewUrl = svCheckUrl
        photoType = 'street_view'
      } else {
        streetViewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${locationStr}&zoom=19&size=800x400&maptype=satellite&key=${googleKey}`
        photoType = 'satellite'
      }
    } catch {
      streetViewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${locationStr}&zoom=19&size=800x400&maptype=satellite&key=${googleKey}`
      photoType = 'satellite'
    }
    if (!streetViewUrl) return
    await admin.from('leads').update({ street_view_url: streetViewUrl, photo_type: photoType }).eq('id', lead.id)
    await admin.from('api_usage_log').insert({
      rep_id: user.id,
      service: 'google_maps',
      endpoint: photoType === 'satellite' ? 'staticmap' : 'streetview',
      tokens_used: 0,
      estimated_cost_usd: 0.007,
    })
  })()

  return NextResponse.json({ id: lead.id }, { status: 201 })
}
