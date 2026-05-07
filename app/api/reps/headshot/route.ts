export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
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

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  // Ensure bucket exists
  const { error: bucketError } = await admin.storage.createBucket('rep-photos', { public: true })
  // Ignore error if bucket already exists
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Bucket error:', bucketError.message)
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|heic|heif|webp)$/i)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or HEIC.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const path = `${user.id}/headshot.jpg`
  const { error: uploadError } = await admin.storage
    .from('rep-photos')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('rep-photos').getPublicUrl(path)
  // Add cache-busting query param so browser refreshes immediately
  const headshot_url = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await admin
    .from('reps')
    .update({ headshot_url })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ headshot_url })
}
