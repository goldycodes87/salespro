export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  // Look up the rep's email
  const { data: rep, error: repError } = await admin
    .from('reps')
    .select('id, email, full_name')
    .eq('id', id)
    .single()

  if (repError || !rep) {
    return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
  }

  if (body.type === 'email') {
    // Generate recovery link — Supabase sends the email automatically
    const { error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: rep.email,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, email: rep.email })
  }

  if (body.type === 'manual') {
    const { password } = body
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
