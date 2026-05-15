export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

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

const COACH_DEBRIEF_PROMPTS: Record<string, string> = {
  jordan: `You are Jordan, a wise sales mentor. Review this appointment transcript and give specific, actionable coaching feedback. Be encouraging but honest. 3-5 sentences. Reference specific moments.`,
  victoria: `You are Victoria, a direct sales closer. Give blunt, specific feedback on this appointment. What worked? What needs to improve? 3-5 sentences.`,
  coach_ray: `You are Coach Ray, high energy sales coach. Break down this appointment like film review. What plays worked? What needs work? Motivate for next time. 3-5 sentences.`,
  noel: `You are Noel, data-driven strategist. Analyze the patterns in this appointment. What does the data suggest about how to improve? 3-5 sentences.`,
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: meeting } = await admin
    .from('meeting_recordings')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const [{ data: rep }, { data: coachConfig }, leadResult] = await Promise.all([
    admin.from('reps').select('*').eq('id', user.id).single(),
    admin.from('coach_config').select('active_persona_id').eq('rep_id', user.id).maybeSingle(),
    meeting.lead_id
      ? admin.from('leads').select('first_name, last_name, address, email, phone').eq('id', meeting.lead_id).single()
      : Promise.resolve({ data: null }),
  ])

  const lead = leadResult.data

  const setError = async (msg: string) => {
    await admin.from('meeting_recordings').update({ status: 'error', processing_error: msg }).eq('id', id)
  }

  // STEP 1 — Download audio from storage
  if (!meeting.audio_url) {
    await setError('No audio file found')
    return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  }

  const { data: audioData, error: downloadError } = await admin.storage
    .from('meeting-audio')
    .download(meeting.audio_url)

  if (downloadError || !audioData) {
    await setError('Failed to download audio')
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }

  const audioBuffer = Buffer.from(await audioData.arrayBuffer())
  const ext = meeting.audio_url.split('.').pop() ?? 'webm'
  const mimeType = ext === 'mp4' ? 'audio/mp4' : ext === 'webm' ? 'audio/webm' : 'audio/ogg'

  // STEP 2 — Transcribe with Whisper
  let transcript = ''
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')

    const whisperForm = new FormData()
    whisperForm.append('file', new Blob([audioBuffer], { type: mimeType }), `recording.${ext}`)
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'en')
    whisperForm.append('response_format', 'json')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Whisper API error')
    }

    const whisperData = await whisperRes.json()
    transcript = whisperData.text ?? ''
  } catch (e: any) {
    console.error('Whisper error:', e)
    await setError('Transcription failed: ' + e.message)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  await admin.from('meeting_recordings').update({ transcript }).eq('id', id)

  // STEP 3 — Analyze with Claude Sonnet
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const config = (meeting.meeting_mode_config ?? {}) as Record<string, boolean>
  const durationMins = Math.round((meeting.duration_seconds ?? 0) / 60)

  const analysisPrompt = `Analyze this sales appointment transcript for ${rep?.full_name ?? 'the rep'} at ${rep?.company ?? 'the company'}.

Lead info:
${lead ? `Customer: ${lead.first_name} ${lead.last_name}\nAddress: ${lead.address || 'not provided'}` : 'Not linked to a lead'}
Industry: ${rep?.industry ?? 'home improvement'}
Duration: approximately ${durationMins} minutes

Transcript:
${transcript}

Return ONLY valid JSON (no markdown, no explanation):
{
  "executive_summary": "3-4 sentence overview",
  "key_moments": [{"timestamp_estimate": "~X min", "moment": "description"}],
  "objections": ["objection 1"],
  "what_worked": ["positive 1"],
  "what_to_improve": ["improvement 1"],
  "action_items": [{"task": "follow up action", "priority": "high|medium|low", "due": "timeline"}],
  "customer_sentiment": "positive|neutral|negative",
  "likely_outcome": "likely_to_close|undecided|unlikely",
  "price_objection": false,
  "financing_interest": false,
  "next_steps": "recommended next steps"
}`

  let summary: Record<string, any> = {}
  try {
    const analysisResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: analysisPrompt }],
    })
    const rawText = analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text : ''
    summary = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch (e) {
    console.error('Analysis error:', e)
    summary = { executive_summary: 'Analysis unavailable', action_items: [] }
  }

  // STEP 4 — Coach debrief
  let coachDebrief: string | null = null
  if (config.coachDebrief || config.coach_debrief) {
    try {
      const persona = coachConfig?.active_persona_id ?? 'jordan'
      const prompt = COACH_DEBRIEF_PROMPTS[persona] ?? COACH_DEBRIEF_PROMPTS.jordan
      const debriefResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `${prompt}\n\nRep: ${rep?.full_name}\n\nTranscript:\n${transcript}\n\nAnalysis:\n${JSON.stringify(summary)}`,
        }],
      })
      coachDebrief = debriefResponse.content[0].type === 'text' ? debriefResponse.content[0].text : null
    } catch (e) {
      console.error('Coach debrief error:', e)
    }
  }

  // STEP 5 — Save everything
  await admin.from('meeting_recordings').update({
    summary,
    action_items: summary.action_items ?? [],
    coach_debrief: coachDebrief,
    status: 'completed',
  }).eq('id', id)

  // STEP 6 — Log to lead activity
  if (meeting.lead_id) {
    await admin.from('lead_activity').insert({
      lead_id: meeting.lead_id,
      rep_id: user.id,
      event_type: 'meeting_recorded',
      description: `Meeting recorded — ${durationMins} min${summary.executive_summary ? ': ' + String(summary.executive_summary).slice(0, 100) : ''}`,
    })
  }

  // STEP 7 — SMS to rep (fire-and-forget)
  if (rep?.phone && rep?.assistant_config?.business_number) {
    void (async () => {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        const leadName = lead ? `${lead.first_name} ${lead.last_name}` : 'your appointment'
        await twilio.messages.create({
          to: rep.phone,
          from: rep.assistant_config.business_number,
          body: `🎙️ Meeting summary ready!\n\n${leadName} — ${durationMins} min\n\n${String(summary.executive_summary ?? '').slice(0, 160) || 'Summary ready in Clozr'}\n\nView: clozrhq.com/leads/${meeting.lead_id}`,
        })
        await admin.from('meeting_recordings').update({ sms_sent: true }).eq('id', id)
      } catch (e) {
        console.error('SMS error:', e)
      }
    })()
  }

  // STEP 8 — Email to customer (fire-and-forget)
  if ((config.sendToCustomer || config.send_to_customer) && lead?.email) {
    void (async () => {
      try {
        const { Resend } = require('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const actionItemsHtml = (summary.action_items ?? [])
          .slice(0, 5)
          .map((a: any) => `<li>${a.task}</li>`)
          .join('')

        await resend.emails.send({
          from: 'Clozr <noreply@clozrhq.com>',
          to: lead.email,
          subject: `Summary from your appointment with ${rep?.full_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;color:#111">
              <h2 style="margin:0 0 8px">Meeting Summary</h2>
              <p style="color:#666;margin:0 0 24px">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · ${durationMins} min</p>
              <p style="line-height:1.6;margin:0 0 24px">${summary.executive_summary ?? ''}</p>
              ${actionItemsHtml ? `<h3 style="margin:0 0 8px">Our Next Steps</h3><ul style="padding-left:20px;line-height:1.8">${actionItemsHtml}</ul>` : ''}
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
              <p style="margin:0;font-size:13px;color:#666">${rep?.full_name} · ${rep?.company ?? ''}</p>
              ${rep?.phone ? `<p style="margin:4px 0 0;font-size:13px;color:#666">${rep.phone}</p>` : ''}
            </div>`,
        })
      } catch (e) {
        console.error('Customer email error:', e)
      }
    })()
  }

  return NextResponse.json({ success: true })
}
