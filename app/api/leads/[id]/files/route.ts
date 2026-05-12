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
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() ?? 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${user.id}/documents/${id}/${Date.now()}_${safeName}`

  const { error: uploadError } = await admin.storage
    .from('lead-photos')
    .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('lead-photos').getPublicUrl(storagePath)

  const fileType = ext === 'pdf' ? 'pdf' : ['doc', 'docx'].includes(ext) ? 'document' : 'document'

  const { data: record, error: insertError } = await admin
    .from('lead_files')
    .insert({
      lead_id: id,
      rep_id: user.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
      file_size: file.size,
      description: null,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json(record)
}
