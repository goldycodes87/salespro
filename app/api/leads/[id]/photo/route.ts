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

// POST /api/leads/[id]/photo — refresh street view or satellite photo
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()
  const googleKey = process.env.GOOGLE_MAPS_API_KEY

  console.log('KEY EXISTS:', !!googleKey)

  if (!googleKey) {
    console.error('GOOGLE_MAPS_API_KEY is not set')
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  // Fetch the lead to get the address
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('address, city, state, zip')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (leadError || !lead) {
    console.error('Lead not found:', leadError?.message)
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const addressStr = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(' ')
  console.log('ADDRESS:', addressStr)

  if (!addressStr.trim()) {
    console.error('Lead has no address')
    return NextResponse.json({ error: 'Lead has no address' }, { status: 400 })
  }

  const locationStr = encodeURIComponent(addressStr)

  // Check Street View metadata first
  const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${locationStr}&key=${googleKey}`

  let photoUrl: string
  let photoType: 'street_view' | 'satellite'

  try {
    const metaRes = await fetch(metaUrl)
    const metaJson = await metaRes.json()
    console.log('META STATUS:', metaJson.status)

    if (metaJson.status === 'OK') {
      photoUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${locationStr}&key=${googleKey}&fov=90&pitch=0`
      photoType = 'street_view'
    } else {
      photoUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${locationStr}&zoom=19&size=640x400&maptype=satellite&key=${googleKey}`
      photoType = 'satellite'
    }
  } catch (err: any) {
    console.error('Failed to fetch Street View metadata:', err.message)
    photoUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${locationStr}&zoom=19&size=640x400&maptype=satellite&key=${googleKey}`
    photoType = 'satellite'
    console.log('META STATUS: fetch_error — falling back to satellite')
  }

  console.log('SAVED URL:', photoUrl)

  // Update lead with new photo URL and type
  const { data: updated, error: updateError } = await admin
    .from('leads')
    .update({
      street_view_url: photoUrl,
      photo_type: photoType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('rep_id', user.id)
    .select('street_view_url, photo_type')
    .single()

  if (updateError) {
    console.error('Failed to update lead:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ street_view_url: updated.street_view_url, photo_type: updated.photo_type })
}
