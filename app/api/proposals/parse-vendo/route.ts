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

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('pdf') as File | null
  if (!file) return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const base64PDF = Buffer.from(buffer).toString('base64')

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64PDF,
            },
          },
          {
            type: 'text',
            text: `Extract data from this Vendo home improvement proposal PDF.
Return ONLY valid JSON, no other text.

Extract exactly these fields:
{
  "customer_name": "full name",
  "customer_address": "street address",
  "customer_city": "city",
  "customer_state": "state abbreviation",
  "customer_zip": "zip code",
  "quote_number": "quote number",
  "rep_name": "prepared by name",
  "date": "date string",
  "line_items": [
    {
      "name": "Window 1 or Patio Door 1 etc",
      "description": "product description",
      "quantity": 1,
      "unit_price": 0,
      "discounted_price": 0
    }
  ],
  "num_windows": 0,
  "num_doors": 0,
  "package_price": 0,
  "discount_name": "discount name or null",
  "discount_amount": 0,
  "admin_fee": 0,
  "your_price": 0,
  "subtotal": 0,
  "financing_option": "name or null",
  "monthly_payment": 0,
  "project_type": "windows or siding or both"
}

CRITICAL RULES:
- Extract numbers EXACTLY as shown in the PDF
- Never calculate or modify amounts
- your_price must match exactly what the PDF shows as final price
- If a field is not present, use null
- Return only the JSON object, nothing else`,
          },
        ],
      }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    console.error('Anthropic API error:', err)
    return NextResponse.json({ error: 'Failed to parse PDF with AI' }, { status: 500 })
  }

  const anthropicData = await anthropicRes.json()
  const rawText = anthropicData.content?.[0]?.text ?? ''

  let parsed: Record<string, any>
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    console.error('Failed to parse AI response:', rawText)
    return NextResponse.json({ error: 'Failed to extract proposal data from PDF' }, { status: 500 })
  }

  // Split customer name into first/last
  const nameParts = (parsed.customer_name ?? '').trim().split(/\s+/)
  const customer_first_name = nameParts[0] ?? ''
  const customer_last_name = nameParts.slice(1).join(' ') ?? ''

  const admin = getSupabaseAdmin()

  const insertData = {
    rep_id: user.id,
    customer_name: parsed.customer_name ?? '',
    customer_first_name,
    customer_last_name,
    customer_address: parsed.customer_address ?? null,
    customer_city: parsed.customer_city ?? null,
    customer_state: parsed.customer_state ?? null,
    customer_zip: parsed.customer_zip ?? null,
    customer_email: null,
    customer_phone: null,
    type: parsed.project_type ?? 'windows',
    status: 'draft',
    your_price: parsed.your_price ?? 0,
    pricing_data: {
      proposal_type: parsed.project_type ?? 'windows',
      num_windows: parsed.num_windows ?? 0,
      num_doors: parsed.num_doors ?? 0,
      package_price: parsed.package_price ?? null,
      discount_name: parsed.discount_name ?? null,
      discount_amount: parsed.discount_amount ?? null,
      admin_fee: parsed.admin_fee ?? 0,
      subtotal: parsed.subtotal ?? null,
      your_price: parsed.your_price ?? 0,
      financing_option: parsed.financing_option ?? null,
      monthly_payment: parsed.monthly_payment ?? null,
      vendo_quote_number: parsed.quote_number ?? null,
      vendo_imported: true,
      line_items: parsed.line_items ?? [],
    },
    public_token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
  }

  const { data: proposal, error: insertError } = await admin
    .from('proposals')
    .insert(insertData)
    .select()
    .single()

  if (insertError || !proposal) {
    console.error('Insert error:', insertError?.message)
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create proposal' }, { status: 500 })
  }

  // Log API usage (fire and forget)
  void admin.from('api_usage_log').insert({
    rep_id: user.id,
    service: 'anthropic',
    endpoint: 'vendo_parser',
    tokens_used: anthropicData.usage?.input_tokens ?? 0,
    estimated_cost_usd: 0.015,
  })

  return NextResponse.json({ success: true, proposal_id: proposal.id })
}
