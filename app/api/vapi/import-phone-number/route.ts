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

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phoneNumber, sid } = await req.json()
  if (!phoneNumber) return NextResponse.json({ error: 'phoneNumber required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: rep } = await admin
    .from('reps')
    .select('full_name, vapi_assistant_id, vapi_phone_number_id')
    .eq('id', user.id)
    .single()

  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
  if (rep.vapi_phone_number_id) return NextResponse.json({ ok: true, alreadyImported: true })

  const vapiRes = await fetch('https://api.vapi.ai/phone-number/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'twilio',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: phoneNumber,
      name: `${rep.full_name} — Clozr`,
      ...(rep.vapi_assistant_id ? { assistantId: rep.vapi_assistant_id } : {}),
    }),
  })

  if (!vapiRes.ok) {
    const err = await vapiRes.json()
    console.error('Vapi phone import failed:', err)
    return NextResponse.json({ error: err.message ?? 'Vapi import failed' }, { status: 500 })
  }

  const vapiPhone = await vapiRes.json()
  await admin.from('reps').update({ vapi_phone_number_id: vapiPhone.id }).eq('id', user.id)

  return NextResponse.json({ ok: true, vapiPhoneId: vapiPhone.id })
}
