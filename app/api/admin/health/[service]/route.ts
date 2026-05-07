export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const { service } = await params

  if (service === 'supabase') {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('reps').select('id').limit(1)
    return NextResponse.json({ ok: !error, error: error?.message })
  }

  if (service === 'anthropic') {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] })
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  if (service === 'google-maps') {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=40.714728,-73.998672&key=${process.env.GOOGLE_MAPS_API_KEY}`)
      return NextResponse.json({ ok: res.ok, error: res.ok ? undefined : 'API error' })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  if (service === 'openai') {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      })
      return NextResponse.json({ ok: res.ok })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  if (service === 'resend') {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      })
      return NextResponse.json({ ok: res.ok })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown service' }, { status: 404 })
}
