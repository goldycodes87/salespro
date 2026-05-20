export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'

type ServiceStatus = 'operational' | 'degraded' | 'down' | 'unconfigured'

interface ServiceCheck {
  name: string
  status: ServiceStatus
  responseMs: number | null
  lastChecked: string
  error?: string
}

// Module-level 5-minute cache
let cache: { data: ServiceCheck[]; expiresAt: number } | null = null

// ─── Individual service checks ────────────────────────────────────────────────

async function checkAnthropic(apiKey: string) {
  const start = Date.now()
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, ms: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

async function checkPerplexity(apiKey: string) {
  const start = Date.now()
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, ms: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

async function checkRentCast(apiKey: string) {
  const start = Date.now()
  try {
    const res = await fetch('https://api.rentcast.io/v1/properties?address=100+Main+St%2C+Denver%2C+CO&limit=1', {
      headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    // 404 (no results) and 200 both mean the service is up
    const ok = res.ok || res.status === 404
    return { ok, ms: Date.now() - start, error: ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

async function checkGoogleMaps(apiKey: string) {
  const start = Date.now()
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=New+York,NY&key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) },
    )
    const json = await res.json()
    const ok = json.status !== 'REQUEST_DENIED' && json.status !== 'INVALID_REQUEST'
    return { ok, ms: Date.now() - start, error: ok ? undefined : json.error_message ?? json.status }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

async function checkOpenAI(apiKey: string) {
  const start = Date.now()
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, ms: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

async function checkVapi(apiKey: string) {
  const start = Date.now()
  try {
    const res = await fetch('https://api.vapi.ai/assistant?limit=1', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, ms: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

async function checkElevenLabs(apiKey: string) {
  const start = Date.now()
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, ms: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

async function checkTwilio(accountSid: string, authToken: string) {
  const start = Date.now()
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { 'Authorization': `Basic ${credentials}` },
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, ms: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e.message }
  }
}

// ─── Status helper ────────────────────────────────────────────────────────────

function toStatus(result: { ok: boolean; ms: number }): ServiceStatus {
  if (!result.ok) return 'down'
  if (result.ms > 2000) return 'degraded'
  return 'operational'
}

type CheckResult = { ok: boolean; ms: number; error?: string }

async function svc(
  name: string,
  configured: boolean,
  fn: () => Promise<CheckResult>,
  now: string,
): Promise<ServiceCheck> {
  if (!configured) return { name, status: 'unconfigured', responseMs: null, lastChecked: now }
  try {
    const result = await fn()
    return {
      name,
      status: toStatus(result),
      responseMs: result.ms,
      lastChecked: now,
      ...(result.error ? { error: result.error } : {}),
    }
  } catch (e: any) {
    return { name, status: 'down', responseMs: null, lastChecked: now, error: e.message }
  }
}

async function runChecks(): Promise<ServiceCheck[]> {
  const now = new Date().toISOString()
  const e = process.env

  return Promise.all([
    svc('Anthropic', !!e.ANTHROPIC_API_KEY, () => checkAnthropic(e.ANTHROPIC_API_KEY!), now),
    svc('Perplexity', !!e.PERPLEXITY_API_KEY, () => checkPerplexity(e.PERPLEXITY_API_KEY!), now),
    svc('RentCast', !!e.RENTCAST_API_KEY, () => checkRentCast(e.RENTCAST_API_KEY!), now),
    svc('Google Maps', !!e.GOOGLE_MAPS_API_KEY, () => checkGoogleMaps(e.GOOGLE_MAPS_API_KEY!), now),
    svc('OpenAI', !!e.OPENAI_API_KEY, () => checkOpenAI(e.OPENAI_API_KEY!), now),
    svc('Vapi', !!e.VAPI_API_KEY, () => checkVapi(e.VAPI_API_KEY!), now),
    svc('ElevenLabs', !!e.ELEVENLABS_API_KEY, () => checkElevenLabs(e.ELEVENLABS_API_KEY!), now),
    svc('Twilio', !!(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN), () => checkTwilio(e.TWILIO_ACCOUNT_SID!, e.TWILIO_AUTH_TOKEN!), now),
    // AgentMail uses inbound webhooks only — report configured vs not
    svc('AgentMail', !!e.AGENTMAIL_WEBHOOK_SECRET, async () => ({ ok: true, ms: 0 }), now),
  ])
}

// ─── GET /api/admin/service-status ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const forceRefresh = new URL(req.url).searchParams.get('refresh') === '1'

  if (!forceRefresh && cache && Date.now() < cache.expiresAt) {
    return NextResponse.json({ services: cache.data, cached: true })
  }

  const services = await runChecks()
  cache = { data: services, expiresAt: Date.now() + 5 * 60 * 1000 }

  return NextResponse.json({ services, cached: false })
}
