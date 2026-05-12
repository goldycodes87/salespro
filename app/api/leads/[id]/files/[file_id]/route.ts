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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; file_id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, file_id } = await params
  const admin = getSupabaseAdmin()

  // Fetch record first to get storage path
  const { data: record, error: fetchError } = await admin
    .from('lead_files')
    .select('file_url, rep_id')
    .eq('id', file_id)
    .eq('lead_id', id)
    .eq('rep_id', user.id)
    .single()

  if (fetchError || !record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Derive storage path from URL if it's a Supabase storage URL
  const url = record.file_url as string
  const bucketMatch = url.match(/\/storage\/v1\/object\/public\/lead-photos\/(.+)$/)
  if (bucketMatch) {
    await admin.storage.from('lead-photos').remove([decodeURIComponent(bucketMatch[1])])
  }

  const { error } = await admin
    .from('lead_files')
    .delete()
    .eq('id', file_id)
    .eq('rep_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
