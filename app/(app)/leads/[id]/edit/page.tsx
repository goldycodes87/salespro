import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LeadForm from '@/components/leads/lead-form'
import Link from 'next/link'

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (error || !lead) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/leads/${id}`}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>Edit Lead</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Update lead information</p>
        </div>
      </div>

      <LeadForm
        initialData={lead}
        editId={id}
        redirectAfterSave={`/leads/${id}`}
      />
    </div>
  )
}
