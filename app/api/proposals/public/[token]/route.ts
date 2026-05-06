export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('proposals')
    .select('id, customer_name, customer_first_name, customer_last_name, customer_address, customer_city, customer_state, customer_zip, type, your_price, pricing_data, offer_expiration_date, created_at')
    .eq('public_token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
