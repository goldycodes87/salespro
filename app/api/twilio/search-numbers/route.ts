export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  const { areaCode } = await request.json()
  if (!areaCode || String(areaCode).length !== 3) {
    return NextResponse.json({ error: 'Valid 3-digit area code required' }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
  }

  try {
    const client = twilio(accountSid, authToken)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const numbers = await (client.availablePhoneNumbers('US').local.list as any)({
      areaCode: String(areaCode),
      limit: 5,
    })

    return NextResponse.json({
      numbers: numbers.map((n: { phoneNumber: string; friendlyName: string }) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
      })),
    })
  } catch (err) {
    console.error('Twilio search error:', err)
    return NextResponse.json({ error: 'Number search failed' }, { status: 500 })
  }
}
