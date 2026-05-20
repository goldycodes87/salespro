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

  // Fetch the lead to get address and current photo state
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('address, city, state, zip, photo_type, street_view_url')
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

  let streetViewFound = false
  let streetViewUrl = ''

  try {
    const svCheckUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${locationStr}&key=${googleKey}&return_error_code=true`
    const svResponse = await fetch(svCheckUrl)
    if (svResponse.ok && svResponse.status === 200) {
      console.log('Street View found')
      streetViewFound = true
      streetViewUrl = svCheckUrl
    } else {
      console.log('No Street View available')
    }
  } catch (err: any) {
    console.error('Street View check failed:', err.message)
  }

  // Street view found — save it
  if (streetViewFound) {
    console.log('SAVED URL:', streetViewUrl)
    const { data: updated, error: updateError } = await admin
      .from('leads')
      .update({ street_view_url: streetViewUrl, photo_type: 'street_view', updated_at: new Date().toISOString() })
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

  // No street view — keep Zillow photo if one already exists
  if (lead.photo_type === 'zillow_listing' && lead.street_view_url) {
    console.log('Keeping existing Zillow photo — no Street View available')
    return NextResponse.json({ street_view_url: lead.street_view_url, photo_type: 'zillow_listing' })
  }

  // Fall back to satellite
  const satelliteUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${locationStr}&zoom=19&size=640x400&maptype=satellite&key=${googleKey}`
  console.log('SAVED URL:', satelliteUrl)

  const { data: updated, error: updateError } = await admin
    .from('leads')
    .update({ street_view_url: satelliteUrl, photo_type: 'satellite', updated_at: new Date().toISOString() })
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
