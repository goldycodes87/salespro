export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const admin = getSupabaseAdmin()
  const { data: meeting } = await admin
    .from('meeting_recordings')
    .select('rep_id')
    .eq('id', id)
    .single()

  if (!meeting || meeting.rep_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null
  const durationSecs = Number(formData.get('duration') ?? 0)

  if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 })

  // Check size limit (25MB)
  if (audioFile.size > 24 * 1024 * 1024) {
    return NextResponse.json({ error: 'Recording too large. Please keep meetings under 60 minutes.' }, { status: 413 })
  }

  const ext = audioFile.type === 'audio/mp4' ? 'mp4'
    : audioFile.type.includes('webm') ? 'webm'
    : 'ogg'

  const storagePath = `${user.id}/${id}/recording.${ext}`

  const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

  const { data: upload, error: uploadError } = await admin.storage
    .from('meeting-audio')
    .upload(storagePath, audioBuffer, {
      contentType: audioFile.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  await admin
    .from('meeting_recordings')
    .update({
      audio_url: upload.path,
      audio_size_bytes: audioFile.size,
      ended_at: new Date().toISOString(),
      duration_seconds: durationSecs || null,
      status: 'processing',
    })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
