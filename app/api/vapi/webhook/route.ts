export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function last10(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || body.type !== 'end-of-call-report') return NextResponse.json({ received: true })

  const admin = getSupabaseAdmin()
  const assistantId = body.call?.assistantId
  const metaRepId = body.call?.metadata?.rep_id

  // 1. Find rep — fast path via metadata, fallback via assistant ID
  let rep: Record<string, any> | null = null
  if (metaRepId) {
    const { data } = await admin.from('reps').select('*').eq('id', metaRepId).single()
    rep = data ?? null
  }
  if (!rep && assistantId) {
    const { data } = await admin.from('reps').select('*').eq('vapi_assistant_id', assistantId).maybeSingle()
    rep = data ?? null
  }
  if (!rep) return NextResponse.json({ received: true })

  const callerNumber = body.call?.customer?.number ?? ''
  const durationSeconds = body.call?.durationSeconds ?? 0
  const summary = body.summary ?? ''
  const transcript = body.transcript ?? ''
  const recordingUrl = body.recordingUrl ?? null

  // 2. Find matching lead by phone
  const callerLast10 = last10(callerNumber)
  let lead: Record<string, any> | null = null
  if (callerLast10) {
    const { data: leads } = await admin
      .from('leads')
      .select('*')
      .eq('rep_id', rep.id)
      .is('merged_into', null)
      .ilike('phone', `%${callerLast10}%`)
      .limit(1)
    lead = leads?.[0] ?? null
  }

  // 3. Log activity to matched lead
  if (lead) {
    await admin.from('lead_activity').insert({
      lead_id: lead.id,
      rep_id: rep.id,
      event_type: 'call',
      description: `AI Assistant call — ${Math.round(durationSeconds / 60)} min`,
      notes: summary,
      metadata: {
        transcript,
        recording_url: recordingUrl,
        duration_seconds: durationSeconds,
        ended_reason: body.call?.endedReason,
        caller_number: callerNumber,
      },
      created_at: new Date().toISOString(),
    })
  } else if ((rep.assistant_config?.capabilities ?? []).includes('qualify_leads')) {
    // 4. No lead found — create one if qualify_leads enabled
    let parsedName = 'Unknown'
    try {
      const ai = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: `Extract caller name from this transcript. Return ONLY the name or 'Unknown' if not found.\nTranscript: ${transcript.slice(0, 2000)}`,
          }],
        }),
      })
      const aiData = await ai.json()
      parsedName = aiData.content?.[0]?.text?.trim() ?? 'Unknown'
    } catch {}

    const { data: newLead } = await admin.from('leads').insert({
      rep_id: rep.id,
      first_name: parsedName,
      last_name: 'Caller',
      phone: callerNumber,
      lead_source: 'ai_assistant_call',
      status: 'new',
      notes: `Called via AI Assistant.\n\nSummary: ${summary}`,
    }).select().single()

    if (newLead) {
      lead = newLead
      await admin.from('lead_activity').insert({
        lead_id: newLead.id,
        rep_id: rep.id,
        event_type: 'call',
        description: `AI Assistant call — ${Math.round(durationSeconds / 60)} min`,
        notes: summary,
        metadata: { transcript, recording_url: recordingUrl, duration_seconds: durationSeconds, caller_number: callerNumber },
        created_at: new Date().toISOString(),
      })
    }
  }

  // 5. Send summary email
  void (async () => {
    if (!process.env.RESEND_API_KEY || !rep.email) return
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozrhq.com'
      const mins = Math.round(durationSeconds / 60)
      const subjectSuffix = lead ? ` · ${lead.first_name} ${lead.last_name}` : ''
      await resend.emails.send({
        from: 'Clozr <noreply@clozrhq.com>',
        to: rep.email,
        subject: `Call summary — ${mins} min${subjectSuffix}`,
        html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0A0F1E;font-family:-apple-system,sans-serif;color:#F9FAFB;">
  <div style="max-width:540px;margin:0 auto;">
    <h2 style="color:#60A5FA;margin:0 0 20px;">📞 AI Assistant Call Summary</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 0;color:#9CA3AF;width:140px;">Duration</td><td style="padding:8px 0;font-weight:600;">${mins} min</td></tr>
      <tr><td style="padding:8px 0;color:#9CA3AF;">Caller</td><td style="padding:8px 0;">${callerNumber}</td></tr>
      ${lead ? `<tr><td style="padding:8px 0;color:#9CA3AF;">Lead</td><td style="padding:8px 0;font-weight:600;">${lead.first_name} ${lead.last_name}</td></tr>` : ''}
    </table>
    <div style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="color:#9CA3AF;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Summary</p>
      <p style="color:#D1D5DB;font-size:14px;line-height:1.6;margin:0;">${summary}</p>
    </div>
    <details style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:20px;">
      <summary style="color:#6B7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;">Full Transcript</summary>
      <pre style="color:#9CA3AF;font-size:12px;line-height:1.6;white-space:pre-wrap;margin:12px 0 0;font-family:monospace;">${transcript}</pre>
    </details>
    ${lead ? `<a href="${baseUrl}/leads/${lead.id}" style="display:inline-block;background:linear-gradient(135deg,#1D4ED8,#06B6D4);color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:14px;">View Lead →</a>` : ''}
  </div>
</body>
</html>`,
      })
    } catch (e) {
      console.error('Call summary email failed:', e)
    }
  })()

  // 6. Log usage
  void admin.from('api_usage_log').insert({
    rep_id: rep.id,
    service: 'vapi',
    endpoint: 'inbound_call',
    tokens_used: 0,
    estimated_cost_usd: (durationSeconds / 60) * 0.05,
    metadata: {
      rep_name: rep.full_name,
      assistant_name: body.call?.metadata?.assistant_name ?? rep.assistant_config?.name ?? 'Assistant',
      duration_seconds: durationSeconds,
      caller_number: callerNumber,
    },
  })

  return NextResponse.json({ received: true })
}
