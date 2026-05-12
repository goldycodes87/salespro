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

function mapToToggles(pct: number): {
  promotion: string | null
  bnsn: string | null
  cash_incentive: boolean
  costco_shop: boolean
  costco_executive: boolean
  financing: string
} {
  const p = Math.round(pct * 100)
  if (p >= 36 && p <= 38) return { promotion: '20_off', bnsn: '10_off', cash_incentive: true,  costco_shop: false, costco_executive: false, financing: 'none' }
  if (p >= 29 && p <= 31) return { promotion: '20_off', bnsn: '10_off', cash_incentive: false, costco_shop: false, costco_executive: false, financing: 'none' }
  if (p >= 26 && p <= 28) return { promotion: '20_off', bnsn: null,     cash_incentive: true,  costco_shop: false, costco_executive: false, financing: 'none' }
  if (p === 25)            return { promotion: '25_off', bnsn: null,     cash_incentive: false, costco_shop: false, costco_executive: false, financing: 'none' }
  if (p === 20)            return { promotion: '20_off', bnsn: null,     cash_incentive: false, costco_shop: false, costco_executive: false, financing: 'none' }
  return                          { promotion: null,     bnsn: null,     cash_incentive: false, costco_shop: false, costco_executive: false, financing: 'none' }
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
- line_items: unit_price is the per-unit price BEFORE discount, discounted_price is AFTER discount
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

  // Compute actual discount percentage from line items
  const packagePrice: number = parsed.package_price ?? 0
  const adminFee: number = parsed.admin_fee || 850
  const discountableBase = packagePrice - adminFee

  let itemDiscountPct = 0
  const lineItems: Array<{ unit_price: number; discounted_price: number }> = parsed.line_items ?? []
  const firstItem = lineItems.find(i => i.unit_price > 0 && i.discounted_price > 0)
  if (firstItem) {
    // discounted_price < unit_price; pct = 1 - (discounted_price / unit_price)
    itemDiscountPct = 1 - (firstItem.discounted_price / firstItem.unit_price)
  } else if (parsed.discount_amount && discountableBase > 0) {
    itemDiscountPct = parsed.discount_amount / discountableBase
  }

  const toggleState = mapToToggles(itemDiscountPct)

  // Split customer name into first/last
  const nameParts = (parsed.customer_name ?? '').trim().split(/\s+/)
  const customer_first_name = nameParts[0] ?? ''
  const customer_last_name = nameParts.slice(1).join(' ') ?? ''

  const admin = getSupabaseAdmin()

  const pricingData = {
    // PricingInputs-compatible shape for present-view
    proposal_type: parsed.project_type ?? 'windows',
    windows_project_value: packagePrice,
    num_windows: parsed.num_windows ?? 0,
    num_doors: parsed.num_doors ?? 0,
    line_items: [],
    project_value: 0,
    admin_fee_enabled: true,
    admin_fee_amount: adminFee,
    lead_paint_enabled: false,
    lead_paint_amount: 500,
    costco_revealed: false,
    costco_member: false,
    costco_executive: false,
    financing: 'none',
    deposit: 0,
    // Stored toggle state for pre-selecting discounts in present-view
    toggle_state: toggleState,
    // Vendo metadata
    package_price: packagePrice,
    your_price: parsed.your_price ?? 0,
    vendo_quote_number: parsed.quote_number ?? null,
    vendo_imported: true,
    line_items_raw: parsed.line_items ?? [],
  }

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
    pricing_data: pricingData,
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

  // Upload original Vendo PDF to storage
  const storagePath = `${user.id}/vendo-pdfs/${proposal.id}.pdf`
  const { error: uploadError } = await admin.storage
    .from('lead-photos')
    .upload(storagePath, Buffer.from(buffer), { contentType: 'application/pdf', upsert: true })

  const vendoPdfStoragePath = uploadError ? null : storagePath

  // Populate top-level numeric columns + vendo_pdf_storage_path
  void admin
    .from('proposals')
    .update({
      package_price: packagePrice || null,
      your_price: parsed.your_price ?? 0,
      windows_project_value: packagePrice || null,
      num_windows: parsed.num_windows ?? 0,
      num_doors: parsed.num_doors ?? 0,
      pricing_data: { ...pricingData, vendo_pdf_storage_path: vendoPdfStoragePath },
    })
    .eq('id', proposal.id)

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
