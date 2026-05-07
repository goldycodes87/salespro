export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const { data: logos } = await admin.from('logos').select('*')
  return NextResponse.json({ logos: logos ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const name = formData.get('name') as string
  if (!file || !name) return NextResponse.json({ error: 'File and name required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `logos/${name}.${ext}`

  const { error: uploadError } = await admin.storage.from('logos').upload(path, buffer, {
    contentType: file.type, upsert: true,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('logos').getPublicUrl(path)

  await admin.from('logos').upsert({ name, url: publicUrl, path }, { onConflict: 'name' })

  return NextResponse.json({ ok: true, url: publicUrl })
}
