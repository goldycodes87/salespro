export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const TEMPLATES = [
  { industry_key: 'windows_siding', display_name: 'Windows & Doors / Siding', icon: '🪟', terminology: { proposal: 'Proposal', product: 'Window', customer: 'Homeowner', project: 'Installation' }, platform_integrations: ['vendo', 'hover'] },
  { industry_key: 'roofing', display_name: 'Roofing', icon: '🏠', terminology: { proposal: 'Estimate', product: 'Roofing System', customer: 'Homeowner', project: 'Roof Replacement' }, platform_integrations: ['eagleview', 'hover'] },
  { industry_key: 'solar', display_name: 'Solar', icon: '☀️', terminology: { proposal: 'Solar Proposal', product: 'Solar System', customer: 'Homeowner', project: 'Solar Installation' }, platform_integrations: ['aurora'] },
  { industry_key: 'hvac', display_name: 'HVAC', icon: '❄️', terminology: { proposal: 'Quote', product: 'HVAC System', customer: 'Customer', project: 'HVAC Installation' }, platform_integrations: ['servicetitan'] },
  { industry_key: 'insurance', display_name: 'Insurance', icon: '🛡️', terminology: { proposal: 'Quote', product: 'Policy', customer: 'Client', project: 'Coverage' }, platform_integrations: ['salesforce'] },
  { industry_key: 'real_estate', display_name: 'Real Estate', icon: '🏡', terminology: { proposal: 'Offer', product: 'Property', customer: 'Buyer/Seller', project: 'Transaction' }, platform_integrations: [] },
  { industry_key: 'saas', display_name: 'Software / SaaS', icon: '💻', terminology: { proposal: 'Proposal', product: 'Software', customer: 'Client', project: 'Implementation' }, platform_integrations: ['salesforce', 'hubspot'] },
  { industry_key: 'financial', display_name: 'Financial Services', icon: '💰', terminology: { proposal: 'Proposal', product: 'Financial Product', customer: 'Client', project: 'Engagement' }, platform_integrations: ['salesforce'] },
  { industry_key: 'other', display_name: 'Other', icon: '💼', terminology: { proposal: 'Proposal', product: 'Product', customer: 'Customer', project: 'Project' }, platform_integrations: [] },
]

export async function GET() {
  const admin = getSupabaseAdmin()

  const { count } = await admin
    .from('industry_templates')
    .select('id', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    return NextResponse.json({ seeded: false, message: 'Already seeded' })
  }

  const rows = TEMPLATES.map(t => ({
    industry_key: t.industry_key,
    display_name: t.display_name,
    icon: t.icon,
    terminology: t.terminology,
    platform_integrations: t.platform_integrations,
    active: true,
  }))

  const { error } = await admin.from('industry_templates').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ seeded: true, count: rows.length })
}
