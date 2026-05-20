export const dynamic = 'force-dynamic'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logApiCall, API_COSTS } from '@/lib/api-logger'

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface RentcastData {
  squareFootage: number | null
  bedrooms: number | null
  bathrooms: number | null
  yearBuilt: number | null
  lotSize: number | null
  propertyType: string | null
  lastSalePrice: number | null
  lastSaleDate: string | null
  estimatedValue: number | null
  ownerOccupied: boolean | null
  ownerName: string | null
}

interface ApillowData {
  sqft: number | null
  zestimate: number | null
  photoUrl: string | null
  lastSoldPrice: number | null
  bedrooms: number | null
  bathrooms: number | null
  yearBuilt: number | null
  lotSize: number | null
  propertyType: string | null
  latitude: number | null
  longitude: number | null
  daysOnZillow: number | null
  hoaFee: number | null
}

interface PerplexityData {
  text: string
  citations: string[]
}

// ─── Helper: timed wrapper ────────────────────────────────────────────────────

function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t = Date.now()
  return fn().then(value => ({ value, ms: Date.now() - t }))
}

// ─── Helper: Elevation ────────────────────────────────────────────────────────

async function fetchElevation(lat: number, lng: number): Promise<number | null> {
  try {
    const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`)
    const json = await res.json()
    const meters = json.results?.[0]?.elevation
    return typeof meters === 'number' ? Math.round(meters * 3.28084) : null
  } catch {
    return null
  }
}

// ─── Helper: RentCast ─────────────────────────────────────────────────────────

async function fetchRentcast(address: string, apiKey: string): Promise<RentcastData | null> {
  try {
    const res = await fetch(
      `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' } },
    )
    if (!res.ok) {
      console.log(`RentCast: ${res.status} — no data found for address`)
      return null
    }
    const data = await res.json()
    const prop = Array.isArray(data) ? data[0] : (data?.properties?.[0] ?? data)
    if (!prop || typeof prop !== 'object' || !prop.squareFootage) {
      console.log('RentCast: no data found for address')
      return null
    }
    return {
      squareFootage: prop.squareFootage ?? null,
      bedrooms: prop.bedrooms ?? null,
      bathrooms: prop.bathrooms ?? null,
      yearBuilt: prop.yearBuilt ?? null,
      lotSize: prop.lotSize != null ? Number(prop.lotSize) : null,
      propertyType: prop.propertyType ?? null,
      lastSalePrice: prop.lastSalePrice ?? null,
      lastSaleDate: prop.lastSaleDate ?? null,
      estimatedValue: prop.estimatedValue ?? null,
      ownerOccupied: prop.ownerOccupied ?? null,
      ownerName: prop.ownerName ?? null,
    }
  } catch (err) {
    console.error('RentCast error:', err)
    return null
  }
}

// ─── Helper: APIllow ─────────────────────────────────────────────────────────

async function fetchApillow(
  address: string, city: string, state: string, zip: string,
): Promise<ApillowData | null> {
  const fullAddress = `${address}, ${city}, ${state} ${zip}`

  // Step 1: Submit job
  const submitRes = await fetch('https://api.apillow.co/v1/properties', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.APILLOW_API_KEY!,
    },
    body: JSON.stringify({ addresses: [fullAddress] }),
  })

  if (!submitRes.ok) {
    console.log('APIllow submit failed:', submitRes.status)
    return null
  }

  const { job_id } = await submitRes.json()
  if (!job_id) return null

  // Step 2: Poll for results (max 8 attempts, 2s apart = 16s max)
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 2000))

    const pollRes = await fetch(`https://api.apillow.co/v1/results/${job_id}`, {
      headers: { 'X-API-Key': process.env.APILLOW_API_KEY! },
    })

    if (!pollRes.ok) continue

    const data = await pollRes.json()

    if (data.status === 'complete') {
      const result = data.results?.[0]
      if (!result?.success) {
        console.log('APIllow: no result for address')
        return null
      }

      const p = result.property
      console.log('APILLOW SUCCESS:', {
        living_area: p.living_area,
        zestimate: p.zestimate,
        image: p.image_urls?.[0],
        lat: p.latitude,
        lng: p.longitude,
      })

      return {
        sqft: p.living_area ?? null,
        zestimate: p.zestimate ?? null,
        lastSoldPrice: p.last_sold_price ?? null,
        bedrooms: p.bedrooms ?? null,
        bathrooms: p.bathrooms ?? null,
        yearBuilt: p.year_built ?? null,
        lotSize: p.lot_size ?? null,
        propertyType: p.property_type ?? null,
        photoUrl: p.image_urls?.[0] ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        daysOnZillow: p.days_on_zillow ?? null,
        hoaFee: p.hoa_fee ?? null,
      }
    }

    if (data.status === 'failed') {
      console.log('APIllow job failed')
      return null
    }

    // status === 'processing', keep polling
    console.log(`APIllow polling... attempt ${i + 1}`)
  }

  console.log('APIllow: timed out after 16 seconds')
  return null
}

// ─── Helper: Perplexity Owner ─────────────────────────────────────────────────

async function fetchPerplexityOwner(
  firstName: string, lastName: string,
  address: string, city: string, state: string, zip: string, county: string,
  apiKey: string,
): Promise<PerplexityData | null> {
  try {
    const countyStr = county ? `${county} County, ` : ''
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a sales intelligence researcher. Find publicly available information about a specific homeowner. Only return info verified to match this exact person at this exact address. Never guess or infer. If nothing found, say clearly: "No public information found for this person at this address."`,
          },
          {
            role: 'user',
            content: `Find public information about this specific homeowner:

Name: ${firstName} ${lastName}
Address: ${address}
City: ${city}, ${countyStr}${state} ${zip}

Search: "${firstName} ${lastName} ${city} ${state}"

Only return results that match THIS person at THIS address in ${countyStr}${state}. Not anyone else with the same name.

Report:
- Years at this address (if found)
- Professional background or business
- Community involvement or news
- Any context useful for a home improvement sales call

If nothing found: say so clearly. Do not fabricate or guess.`,
          },
        ],
        max_tokens: 300,
        return_citations: true,
      }),
    })
    if (!res.ok) {
      console.error(`Perplexity Owner: ${res.status}`)
      return null
    }
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    console.log('PERPLEXITY OWNER length:', text.length)
    return { text, citations: data.citations ?? [] }
  } catch (err) {
    console.error('Perplexity Owner error:', err)
    return null
  }
}

// ─── Helper: Perplexity Property ─────────────────────────────────────────────

async function fetchPerplexityProperty(
  address: string, city: string, state: string, zip: string, county: string,
  apiKey: string,
): Promise<PerplexityData | null> {
  try {
    const countyStr = county ? `${county} County, ` : ''
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a property research assistant. Find publicly available information about a specific property address. Be factual and specific.`,
          },
          {
            role: 'user',
            content: `Research this property:
${address}, ${city}, ${countyStr}${state} ${zip}

Find:
1. Any building permits pulled for this address in the last 10 years (roofing, windows, siding, HVAC, additions, renovations)
2. HOA or community association name and any relevant rules
3. Any recent listing history (was it listed for sale recently?)
4. Neighborhood characteristics relevant to home improvement (age of homes, common renovations, weather exposure at this elevation)
5. Any news or public records about this specific property address

Search: "${address} ${city} ${state}" and "${address} permits ${city}"

Be specific to this address only.`,
          },
        ],
        max_tokens: 400,
        return_citations: true,
      }),
    })
    if (!res.ok) {
      console.error(`Perplexity Property: ${res.status}`)
      return null
    }
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    console.log('PERPLEXITY PROPERTY length:', text.length)
    return { text, citations: data.citations ?? [] }
  } catch (err) {
    console.error('Perplexity Property error:', err)
    return null
  }
}

// ─── Helper: Claude synthesis ─────────────────────────────────────────────────

async function synthesizeWithClaude(params: {
  lead: any
  county: string
  elevationFeet: number | null
  rentcastData: RentcastData | null
  apillowData: ApillowData | null
  perplexityOwnerText: string
  perplexityPropertyText: string
  displaySqft: number | null
  sqftSource: 'zillow' | 'public_records' | 'verified' | null
  sqftDiscrepancy: boolean
  rentcastSqft: number | null
  apillowSqft: number | null
  allCitations: string[]
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')

  const {
    lead, county, elevationFeet,
    rentcastData, apillowData,
    perplexityOwnerText, perplexityPropertyText,
    displaySqft, sqftSource, sqftDiscrepancy, rentcastSqft, apillowSqft,
    allCitations,
  } = params

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const countyStr = county ? `${county} County, ` : ''

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You are a sales intelligence assistant. Create a concise, accurate property and person summary for a home improvement sales rep. Only include information that was actually returned by the research tools. Never invent or infer details not present in the data. If data is missing, use null. Return ONLY valid JSON with no markdown fencing or explanation. If no owner personal information was found, generate 2-3 sentences of sales context using only the verified property data: year built, sq footage, lot size, last sale date, estimated value, and elevation. Focus on what these facts suggest about likely home improvement needs. Start with: 'Based on property records:'`,
    messages: [{
      role: 'user',
      content: `Create a sales research summary using this verified data only. Never invent or infer anything not present in the source data.

PROPERTY DATA (RentCast — public records):
${JSON.stringify(rentcastData ?? null, null, 2)}

PROPERTY DATA (APIllow — Zillow source):
${JSON.stringify(apillowData ?? null, null, 2)}

SQUARE FOOTAGE RESOLUTION:
Primary sqft: ${displaySqft ?? 'not available'}
Source: ${sqftSource ?? 'none'}
RentCast sqft: ${rentcastSqft ?? 'not available'}
APIllow sqft: ${apillowSqft ?? 'not available'}
Discrepancy (>10% difference): ${sqftDiscrepancy}

OWNER RESEARCH (Perplexity web search):
${perplexityOwnerText || 'No data available'}

PROPERTY RESEARCH (Perplexity web search):
${perplexityPropertyText || 'No data available'}

ELEVATION: ${elevationFeet != null ? `${elevationFeet} feet` : 'not available'}

LOCATION:
${lead.first_name} ${lead.last_name}
${lead.address}, ${lead.city}, ${countyStr}${lead.state} ${lead.zip}

Return ONLY this JSON structure, no other text:
{
  "property": {
    "sqft": number or null,
    "sqftSource": "zillow" or "public_records" or "verified" or null,
    "sqftNote": string or null (describe discrepancy if sqftDiscrepancy is true, otherwise null),
    "sqftAlt": number or null (the non-primary sqft value when discrepancy is true, otherwise null),
    "sqftAltSource": "zillow" or "public_records" or null (source of sqftAlt),
    "beds": number or null,
    "baths": number or null,
    "yearBuilt": number or null,
    "lotSizeSqft": number or null (lot size in square feet as integer),
    "estimatedValue": number or null,
    "zestimate": number or null,
    "lastSalePrice": number or null,
    "lastSaleDate": string or null,
    "ownerOccupied": boolean or null,
    "elevation": number or null,
    "listingStatus": string or null
  },
  "owner": {
    "yearsAtAddress": string or null,
    "professionalBackground": string or null,
    "communityInvolvement": string or null,
    "otherContext": string or null,
    "dataFound": true if any owner personal info was found, false if not
  },
  "propertyIntel": {
    "recentPermits": string or null,
    "hoa": string or null,
    "recentListing": string or null,
    "neighborhoodContext": string or null
  },
  "salesContext": "2-3 sentences most relevant to a home improvement sales rep walking in the door",
  "dataSources": []
}`,
    }],
  })

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '')
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (allCitations.length) {
      parsed.dataSources = [...(parsed.dataSources ?? []), ...allCitations]
    }
    return JSON.stringify(parsed)
  } catch (err) {
    console.error('Claude returned non-JSON, storing raw text. First 100 chars:', cleaned.slice(0, 100))
    return text
  }
}

// ─── POST /api/leads/[id]/research ────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: lead, error: fetchError } = await admin
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (fetchError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  await admin.from('leads').update({ research_status: 'running' }).eq('id', id)

  try {
    // ── Step 1: Geocode → lat, lng, county (sequential — county needed by Perplexity) ──

    let lat: number | null = null
    let lng: number | null = null
    let county: string = (lead as any).county ?? ''
    const googleKey = process.env.GOOGLE_MAPS_API_KEY

    if (googleKey && lead.address && lead.city) {
      try {
        const addrParts = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(' ')
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addrParts)}&key=${googleKey}`,
        )
        const geoJson = await geoRes.json()
        const geoResult = geoJson.results?.[0]

        if (!county && geoResult?.address_components) {
          const countyComp = (geoResult.address_components as any[]).find(
            (c: any) => c.types.includes('administrative_area_level_2'),
          )
          if (countyComp) county = countyComp.long_name.replace(/ County$/i, '')
        }

        const loc = geoResult?.geometry?.location
        if (loc?.lat != null && loc?.lng != null) {
          lat = loc.lat
          lng = loc.lng
        }
      } catch (geoErr) {
        console.error('Geocode error:', geoErr)
      }
    }

    // Persist county if newly discovered
    if (county && !(lead as any).county) {
      const { error: countyErr } = await admin.from('leads').update({ county } as any).eq('id', id)
      if (countyErr) console.log('county column not yet in schema, skipping save:', countyErr.message)
    }

    if (googleKey && lead.address && lead.city) {
      logApiCall({ repId: user.id, service: 'google_maps', endpoint: 'geocode', costUsd: API_COSTS.google_maps_geocode }).catch(console.error)
    }

    // ── Step 2: Five parallel calls ──────────────────────────────────────────

    const rentcastAddress = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')

    const [
      elevationResult,
      rentcastResult,
      apillowResult,
      perplexityOwnerResult,
      perplexityPropertyResult,
    ] = await Promise.allSettled([

      // CALL 1 — Elevation
      lat != null && lng != null
        ? timed(() => fetchElevation(lat!, lng!))
        : Promise.resolve({ value: null as number | null, ms: 0 }),

      // CALL 2 — RentCast
      process.env.RENTCAST_API_KEY
        ? timed(() => fetchRentcast(rentcastAddress, process.env.RENTCAST_API_KEY!))
        : Promise.resolve({ value: null as RentcastData | null, ms: 0 }),

      // CALL 3 — APIllow (Zillow data source)
      process.env.APILLOW_API_KEY
        ? timed(() => fetchApillow(lead.address, lead.city, lead.state, lead.zip ?? ''))
        : Promise.resolve({ value: null as ApillowData | null, ms: 0 }),

      // CALL 4 — Perplexity: owner research
      process.env.PERPLEXITY_API_KEY
        ? timed(() => fetchPerplexityOwner(
            lead.first_name, lead.last_name,
            lead.address, lead.city, lead.state, lead.zip ?? '', county,
            process.env.PERPLEXITY_API_KEY!,
          ))
        : Promise.resolve({ value: null as PerplexityData | null, ms: 0 }),

      // CALL 5 — Perplexity: property research
      process.env.PERPLEXITY_API_KEY
        ? timed(() => fetchPerplexityProperty(
            lead.address, lead.city, lead.state, lead.zip ?? '', county,
            process.env.PERPLEXITY_API_KEY!,
          ))
        : Promise.resolve({ value: null as PerplexityData | null, ms: 0 }),
    ])

    // Extract results
    const elevTimed = elevationResult.status === 'fulfilled' ? elevationResult.value : { value: null as number | null, ms: 0 }
    const rentcastTimed = rentcastResult.status === 'fulfilled' ? rentcastResult.value : { value: null as RentcastData | null, ms: 0 }
    const apillowTimed = apillowResult.status === 'fulfilled' ? apillowResult.value : { value: null as ApillowData | null, ms: 0 }
    const ownerTimed = perplexityOwnerResult.status === 'fulfilled' ? perplexityOwnerResult.value : { value: null as PerplexityData | null, ms: 0 }
    const propertyTimed = perplexityPropertyResult.status === 'fulfilled' ? perplexityPropertyResult.value : { value: null as PerplexityData | null, ms: 0 }

    const elevationFeet = elevTimed.value
    const rentcastData = rentcastTimed.value
    const apillowData = apillowTimed.value
    const perplexityOwnerData = ownerTimed.value
    const perplexityPropertyData = propertyTimed.value

    if (elevationResult.status === 'rejected') console.error('Elevation failed:', elevationResult.reason)
    if (rentcastResult.status === 'rejected') console.error('RentCast failed:', rentcastResult.reason)
    if (apillowResult.status === 'rejected') console.error('APIllow failed:', apillowResult.reason)
    if (perplexityOwnerResult.status === 'rejected') console.error('Perplexity Owner failed:', perplexityOwnerResult.reason)
    if (perplexityPropertyResult.status === 'rejected') console.error('Perplexity Property failed:', perplexityPropertyResult.reason)

    const perplexityOwnerText = perplexityOwnerData?.text ?? ''
    const perplexityPropertyText = perplexityPropertyData?.text ?? ''
    const allCitations = [
      ...(perplexityOwnerData?.citations ?? []),
      ...(perplexityPropertyData?.citations ?? []),
    ]

    // ── Step 3: Photo priority — street view > zillow listing > satellite ────

    const hasStreetViewPhoto = lead.photo_type === 'street_view' && !!lead.street_view_url
    const apillowPhoto = apillowData?.photoUrl ?? null

    if (!hasStreetViewPhoto && apillowPhoto) {
      await admin.from('leads').update({
        street_view_url: apillowPhoto,
        photo_type: 'zillow_listing',
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    }

    // ── Step 4: Sqft resolution ───────────────────────────────────────────────

    const rentcastSqft = rentcastData?.squareFootage ?? null
    const apillowSqft = apillowData?.sqft ?? null
    let displaySqft: number | null = null
    let sqftSource: 'zillow' | 'public_records' | 'verified' | null = null
    let sqftDiscrepancy = false

    if (apillowSqft != null && rentcastSqft != null) {
      const diff = Math.abs(apillowSqft - rentcastSqft) / rentcastSqft
      if (diff > 0.10) {
        displaySqft = apillowSqft
        sqftSource = 'zillow'
        sqftDiscrepancy = true
      } else {
        displaySqft = apillowSqft
        sqftSource = 'verified'
      }
    } else if (apillowSqft != null) {
      displaySqft = apillowSqft
      sqftSource = 'zillow'
    } else if (rentcastSqft != null) {
      displaySqft = rentcastSqft
      sqftSource = 'public_records'
    }

    // ── Step 5: Log service calls (fire-and-forget) ───────────────────────────

    if (process.env.RENTCAST_API_KEY) {
      logApiCall({
        repId: user.id, service: 'rentcast', endpoint: 'property_lookup',
        costUsd: rentcastData ? API_COSTS.rentcast_property : 0,
        responseMs: rentcastTimed.ms, success: rentcastData !== null,
        errorMessage: rentcastResult.status === 'rejected' ? String(rentcastResult.reason) : null,
      }).catch(console.error)
    }
    if (process.env.APILLOW_API_KEY) {
      logApiCall({
        repId: user.id, service: 'apillow', endpoint: 'property_lookup',
        costUsd: apillowData ? 0.005 : 0,
        responseMs: apillowTimed.ms, success: apillowData !== null,
        errorMessage: apillowResult.status === 'rejected' ? String(apillowResult.reason) : null,
      }).catch(console.error)
    }
    if (process.env.PERPLEXITY_API_KEY) {
      logApiCall({
        repId: user.id, service: 'perplexity', endpoint: 'sonar_pro_owner',
        costUsd: perplexityOwnerData ? API_COSTS.perplexity_sonar_pro : 0,
        responseMs: ownerTimed.ms, success: perplexityOwnerData !== null,
        errorMessage: perplexityOwnerResult.status === 'rejected' ? String(perplexityOwnerResult.reason) : null,
      }).catch(console.error)
      logApiCall({
        repId: user.id, service: 'perplexity', endpoint: 'sonar_pro_property',
        costUsd: perplexityPropertyData ? API_COSTS.perplexity_sonar_pro : 0,
        responseMs: propertyTimed.ms, success: perplexityPropertyData !== null,
        errorMessage: perplexityPropertyResult.status === 'rejected' ? String(perplexityPropertyResult.reason) : null,
      }).catch(console.error)
    }

    // ── Step 6: Claude synthesis ──────────────────────────────────────────────

    const synthesisStart = Date.now()
    const summary = await synthesizeWithClaude({
      lead, county, elevationFeet,
      rentcastData, apillowData,
      perplexityOwnerText, perplexityPropertyText,
      displaySqft, sqftSource, sqftDiscrepancy,
      rentcastSqft, apillowSqft,
      allCitations,
    })
    const synthesisMs = Date.now() - synthesisStart

    await admin.from('leads').update({
      ai_summary: summary,
      research_status: 'complete',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    logApiCall({
      repId: user.id, service: 'anthropic', endpoint: 'lead_research',
      costUsd: API_COSTS.anthropic_research, responseMs: synthesisMs,
    }).catch(console.error)

    const updatedPhotoUrl = (!hasStreetViewPhoto && apillowPhoto) ? apillowPhoto : lead.street_view_url
    const updatedPhotoType = (!hasStreetViewPhoto && apillowPhoto) ? 'zillow_listing' : lead.photo_type

    return NextResponse.json({ summary, street_view_url: updatedPhotoUrl, photo_type: updatedPhotoType })
  } catch (err: any) {
    console.error('AI research error:', err)
    await admin.from('leads').update({ research_status: 'failed' }).eq('id', id)
    return NextResponse.json({ error: err.message ?? 'Research failed' }, { status: 500 })
  }
}
