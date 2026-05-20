export const dynamic = 'force-dynamic'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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
  lotSize: string | null
  propertyType: string | null
  lastSalePrice: number | null
  lastSaleDate: string | null
  estimatedValue: number | null
  ownerOccupied: boolean | null
  ownerName: string | null
}

interface PerplexityData {
  text: string
  citations: string[]
}

// ─── Helper: RentCast ─────────────────────────────────────────────────────────

async function fetchRentcast(lead: any, apiKey: string): Promise<RentcastData | null> {
  const address = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')
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
      lotSize: prop.lotSize != null ? String(prop.lotSize) : null,
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

// ─── Helper: Perplexity ───────────────────────────────────────────────────────

async function fetchPerplexity(lead: any, county: string, apiKey: string): Promise<PerplexityData | null> {
  try {
    const locationStr = `${lead.city}, ${county ? county + ' County, ' : ''}${lead.state}`
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a sales research assistant. Find publicly available information about a specific person at a specific address. Be precise — only return information that matches this exact person at this exact location. Do not return results for people with the same name in other states, cities, or counties. If you cannot find specific verified information, say so clearly rather than guessing.`,
          },
          {
            role: 'user',
            content: `Research this specific person for a home improvement sales call:

Full Name: ${lead.first_name} ${lead.last_name}
Street Address: ${lead.address}
City: ${lead.city}
State: ${lead.state}
Zip: ${lead.zip}
County: ${county}

Find only information that matches THIS person at THIS address in ${locationStr}. Not someone with the same name elsewhere.

Look for:
1. How long they have lived at this address
2. Any business ownership or professional background
3. Community involvement or local news mentions
4. Any other publicly available context relevant to a home improvement sales call

If unsure whether information matches this specific person at this address, omit it. Accuracy over completeness.`,
          },
        ],
        max_tokens: 500,
        return_citations: true,
      }),
    })
    if (!res.ok) {
      console.error(`Perplexity: ${res.status}`)
      return null
    }
    const data = await res.json()
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      citations: data.citations ?? [],
    }
  } catch (err) {
    console.error('Perplexity error:', err)
    return null
  }
}

// ─── Helper: Claude synthesis ─────────────────────────────────────────────────

async function synthesizeWithClaude(params: {
  lead: any
  county: string
  elevationFeet: number | null
  rentcastData: RentcastData | null
  perplexityData: PerplexityData | null
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')

  const { lead, county, elevationFeet, rentcastData, perplexityData } = params
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a sales intelligence assistant. Create a concise, accurate property and person summary for a home improvement sales rep. Only include information that was actually returned by the research tools. Never invent or infer details not present in the data. If data is missing, use null. Return ONLY valid JSON with no markdown fencing or explanation.`,
    messages: [{
      role: 'user',
      content: `Create a sales research summary using this verified data only:

PROPERTY DATA (from public records):
${JSON.stringify(rentcastData ?? null, null, 2)}

PERSON RESEARCH (web search results):
${perplexityData?.text || 'No data available'}

ELEVATION: ${elevationFeet != null ? `${elevationFeet} feet` : 'not available'}

LOCATION:
${lead.first_name} ${lead.last_name}
${lead.address}, ${lead.city}, ${county ? county + ' County, ' : ''}${lead.state} ${lead.zip}

Return ONLY this JSON structure, no other text:
{
  "property": {
    "sqft": number or null,
    "beds": number or null,
    "baths": number or null,
    "yearBuilt": number or null,
    "lotSize": string or null,
    "estimatedValue": number or null,
    "lastSalePrice": number or null,
    "lastSaleDate": string or null,
    "ownerOccupied": boolean or null,
    "elevation": number or null
  },
  "owner": {
    "yearsAtAddress": string or null,
    "businessOwner": boolean or null,
    "professionalBackground": string or null,
    "communityInvolvement": string or null,
    "otherContext": string or null,
    "confidence": "high" or "medium" or "low"
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
    if (perplexityData?.citations?.length) {
      parsed.dataSources = [...(parsed.dataSources ?? []), ...perplexityData.citations]
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
    // Step 1: Geocode → elevation + county (single API call, two outputs)
    let elevationFeet: number | null = null
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
          const elevRes = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${loc.lat},${loc.lng}`)
          const elevJson = await elevRes.json()
          const meters = elevJson.results?.[0]?.elevation
          if (typeof meters === 'number') elevationFeet = Math.round(meters * 3.28084)
        }
      } catch (geoErr) {
        console.error('Geocode/elevation error:', geoErr)
      }
    }

    // Persist county if newly discovered (best-effort — column may not exist)
    if (county && !(lead as any).county) {
      const { error: countyErr } = await admin.from('leads').update({ county } as any).eq('id', id)
      if (countyErr) console.log('county column not yet in schema, skipping save:', countyErr.message)
    }

    // Step 2: Parallel RentCast + Perplexity
    const [rentcastResult, perplexityResult] = await Promise.allSettled([
      process.env.RENTCAST_API_KEY
        ? fetchRentcast(lead, process.env.RENTCAST_API_KEY)
        : Promise.resolve(null),
      process.env.PERPLEXITY_API_KEY
        ? fetchPerplexity(lead, county, process.env.PERPLEXITY_API_KEY)
        : Promise.resolve(null),
    ])

    const rentcastData = rentcastResult.status === 'fulfilled' ? rentcastResult.value : null
    const perplexityData = perplexityResult.status === 'fulfilled' ? perplexityResult.value : null

    if (rentcastResult.status === 'rejected') console.error('RentCast failed:', rentcastResult.reason)
    if (perplexityResult.status === 'rejected') console.error('Perplexity failed:', perplexityResult.reason)

    // Step 3: Claude synthesis
    const summary = await synthesizeWithClaude({ lead, county, elevationFeet, rentcastData, perplexityData })

    await admin.from('leads').update({
      ai_summary: summary,
      research_status: 'complete',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    await admin.from('api_usage_log').insert({
      rep_id: user.id,
      service: 'anthropic',
      endpoint: 'lead_research',
      tokens_used: 0,
      estimated_cost_usd: 0.05,
    })

    return NextResponse.json({ summary })
  } catch (err: any) {
    console.error('AI research error:', err)
    await admin.from('leads').update({ research_status: 'failed' }).eq('id', id)
    return NextResponse.json({ error: err.message ?? 'Research failed' }, { status: 500 })
  }
}
