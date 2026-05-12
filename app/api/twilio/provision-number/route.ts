export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phoneNumber } = await request.json()
  if (!phoneNumber) return NextResponse.json({ error: 'phoneNumber required' }, { status: 400 })

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: rep } = await admin.from('reps').select('full_name, assistant_config').eq('id', user.id).single()

    const client = twilio(accountSid, authToken)
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber,
      voiceUrl: 'https://clozrhq.com/api/vapi/inbound',
      friendlyName: `Clozr - ${rep?.full_name ?? user.email}`,
    })

    const existingConfig = (rep?.assistant_config as Record<string, unknown>) ?? {}
    await admin.from('reps').update({
      assistant_config: {
        ...existingConfig,
        business_number: purchased.phoneNumber,
        twilio_sid: purchased.sid,
      },
    }).eq('id', user.id)

    return NextResponse.json({ phoneNumber: purchased.phoneNumber, sid: purchased.sid })
  } catch (err) {
    console.error('Twilio provision error:', err)
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 })
  }
}
