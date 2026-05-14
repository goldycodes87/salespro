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

function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const types: Record<string, string> = {
    pdf: 'pdf',
    doc: 'document', docx: 'document',
    xls: 'spreadsheet', xlsx: 'spreadsheet',
    jpg: 'image', jpeg: 'image', png: 'image', heic: 'image',
    gif: 'image', webp: 'image',
    txt: 'text', csv: 'text',
    mp3: 'audio', mp4: 'video', mov: 'video',
  }
  return types[ext] || 'document'
}

const ALLOWED_EXTS = new Set(['pdf','doc','docx','xls','xlsx','jpg','jpeg','png','heic','txt','csv'])
const MAX_SIZE = 25 * 1024 * 1024

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('lead_files')
    .select('*')
    .eq('lead_id', id)
    .eq('rep_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const description = (formData.get('description') as string | null) ?? ''

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum 25MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: 'File type not allowed.' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${user.id}/${id}/${Date.now()}_${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('lead-files')
    .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('lead-files').getPublicUrl(storagePath)

  const { data: record, error: insertError } = await admin
    .from('lead_files')
    .insert({
      lead_id: id,
      rep_id: user.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: detectFileType(file.name),
      file_size: file.size,
      mime_type: file.type || null,
      description: description || null,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Log activity
  void admin.from('lead_activity').insert({
    lead_id: id,
    rep_id: user.id,
    event_type: 'file_upload',
    description: `File uploaded: ${file.name}`,
    created_at: new Date().toISOString(),
  })

  return NextResponse.json(record)
}
