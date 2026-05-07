export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()

  const [finRes, discRes, tmplRes] = await Promise.all([
    admin.from('default_financing_options').select('*').order('sort_order'),
    admin.from('default_discount_options').select('*').order('sort_order'),
    admin.from('email_templates').select('*'),
  ])

  return NextResponse.json({
    financing: finRes.data ?? [],
    discounts: discRes.data ?? [],
    templates: tmplRes.data ?? [],
  })
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { section, data } = await request.json()
  const admin = getSupabaseAdmin()

  if (section === 'financing') {
    await admin.from('default_financing_options').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (data.length) {
      await admin.from('default_financing_options').insert(
        data.map((d: any, i: number) => ({ name: d.name, calc_type: d.calc_type, value: d.value, active: d.active, sort_order: i }))
      )
    }
  } else if (section === 'discounts') {
    await admin.from('default_discount_options').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (data.length) {
      await admin.from('default_discount_options').insert(
        data.map((d: any, i: number) => ({ name: d.name, type: d.type, percentage: d.percentage, active: d.active, sort_order: i }))
      )
    }
  } else if (section.startsWith('email_')) {
    await admin.from('email_templates').upsert(
      { template_key: data.template_key, subject: data.subject, body_html: data.body_html, updated_at: new Date().toISOString() },
      { onConflict: 'template_key' }
    )
  }

  return NextResponse.json({ ok: true })
}
