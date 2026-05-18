export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { voice_id, text } = body
  if (!voice_id) return NextResponse.json({ error: 'voice_id required' }, { status: 400 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 })

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text || "Hey there, I'm your Clozr assistant. Ready to help you close more deals.",
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('ElevenLabs error:', err)
      return NextResponse.json({ error: 'Voice preview failed' }, { status: 500 })
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('Voice preview error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
