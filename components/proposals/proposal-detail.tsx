'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import PriceSummary from './price-summary'
import { calcPrice, type PricingInputs } from '@/lib/pricing'
import { formatPhone } from '@/hooks/usePhoneFormat'

type Proposal = Record<string, any>
type LeadResult = { id: string; first_name: string; last_name: string; address?: string; city?: string; state?: string; email?: string; phone?: string }

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft:  { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF', border: '#9CA3AF33' },
  sent:   { bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D', border: '#FCD34D33' },
  signed: { bg: 'rgba(16,185,129,0.15)',  text: '#34D399', border: '#34D39933' },
}

const cardStyle: React.CSSProperties = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

function sixMonthsFromNow(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().split('T')[0]
}

export default function ProposalDetail({ proposal: initial }: { proposal: Proposal }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [proposal, setProposal] = useState<Proposal>(initial)
  const [importedBanner, setImportedBanner] = useState(() => searchParams.get('imported') === 'true')
  const [showBookedModal, setShowBookedModal] = useState(false)
  const [isPartial, setIsPartial] = useState(false)
  const [partialNotes, setPartialNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailToast, setEmailToast] = useState<string | null>(null)
  const [aiCallToast, setAiCallToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Lead linking state
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkToast, setLinkToast] = useState<string | null>(null)
  const [matchState, setMatchState] = useState<'idle' | 'loading' | 'found' | 'none' | 'dismissed'>('idle')
  const [matchedLead, setMatchedLead] = useState<LeadResult | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LeadResult[]>([])
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pull pricing from both pricing_data and top-level columns (FIX 2)
  const pd = proposal.pricing_data || {}
  const yourPrice = pd.your_price || Number(proposal.your_price) || 0
  const packagePrice = pd.package_price || Number(proposal.package_price) || 0
  const discountAmount = pd.discount_amount || 0
  const discountName = pd.discount_name || ''
  const adminFee = pd.admin_fee || 0
  const numWindows = pd.num_windows || proposal.num_windows || 0
  const numDoors = pd.num_doors || proposal.num_doors || 0
  const vendoImported = pd.vendo_imported || false
  const vendoQuoteNumber = pd.vendo_quote_number || null

  const statusColors = STATUS_COLORS[proposal.status] ?? STATUS_COLORS.draft

  const pricing: PricingInputs | null = pd.proposal_type
    ? pd as PricingInputs
    : null
  const result = pricing && !vendoImported ? calcPrice(pricing) : null

  const createdAt = new Date(proposal.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const fullName = [proposal.customer_first_name, proposal.customer_last_name].filter(Boolean).join(' ')
    || proposal.customer_name || '—'

  // Auto-search for lead match when card appears (FIX 4)
  useEffect(() => {
    if (!vendoImported || proposal.lead_id || !proposal.customer_last_name) return
    setMatchState('loading')
    const lastName = proposal.customer_last_name as string
    fetch(`/api/leads/search?q=${encodeURIComponent(lastName)}`)
      .then(r => r.json())
      .then((leads: LeadResult[]) => {
        if (!Array.isArray(leads) || leads.length === 0) {
          setMatchState('none')
          return
        }
        const exact = leads.find(l =>
          l.first_name?.toLowerCase() === (proposal.customer_first_name as string)?.toLowerCase() &&
          l.last_name?.toLowerCase() === lastName.toLowerCase()
        )
        if (exact) {
          setMatchedLead(exact)
          setMatchState('found')
        } else {
          setMatchState('none')
        }
      })
      .catch(() => setMatchState('none'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLeadSearch = (q: string) => {
    setSearchQuery(q)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (q.length < 2) { setSearchResults([]); return }
    searchDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/leads/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setSearchResults(await res.json())
    }, 300)
  }

  const handleLinkToLead = async (leadId: string) => {
    setLinkLoading(true)
    try {
      // 1. Patch proposal with lead_id
      const pRes = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })
      if (!pRes.ok) throw new Error('Failed to link lead')
      const updatedProposal = await pRes.json()

      // 2. Fetch lead
      const lRes = await fetch(`/api/leads/${leadId}`)
      const lead: LeadResult = await lRes.json()

      // 3. Copy email/phone to proposal if missing
      const contactPatch: Record<string, string> = {}
      if (!updatedProposal.customer_email && lead.email) contactPatch.customer_email = lead.email
      if (!updatedProposal.customer_phone && lead.phone) contactPatch.customer_phone = lead.phone
      if (Object.keys(contactPatch).length > 0) {
        await fetch(`/api/proposals/${proposal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactPatch),
        })
      }

      // 4. Set lead status → proposed
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'proposed' }),
      })

      // 5. Log activity
      void fetch(`/api/leads/${leadId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'proposal_linked',
          description: vendoQuoteNumber
            ? `Linked to Vendo proposal #${vendoQuoteNumber}`
            : 'Linked to Vendo proposal',
        }),
      })

      // 6. Refresh proposal
      const refreshRes = await fetch(`/api/proposals/${proposal.id}`)
      const refreshed = await refreshRes.json()
      setProposal(refreshed)

      // 7. Toast + hide card
      const leadName = `${lead.first_name} ${lead.last_name}`
      setLinkToast(`Linked to ${leadName}'s file ✓`)
      setTimeout(() => setLinkToast(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLinkLoading(false)
    }
  }

  const handleBookedClick = async () => {
    const confetti = (await import('canvas-confetti')).default
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#1D4ED8', '#34D399', '#60A5FA', '#FCD34D'] })
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#1D4ED8', '#34D399', '#60A5FA'] })
    }, 300)
    setIsPartial(false)
    setPartialNotes('')
    setShowBookedModal(true)
  }

  const handleConfirmBooked = async () => {
    setBooking(true)
    setError(null)
    try {
      const body: Record<string, any> = {
        status: 'signed',
        lead_id: proposal.lead_id,
        is_partial_job: isPartial,
        partial_job_notes: isPartial ? (partialNotes || null) : null,
        followup_date: isPartial ? sixMonthsFromNow() : null,
      }
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setProposal(updated)
      setShowBookedModal(false)

      if (isPartial && proposal.lead_id) {
        const followupDate = new Date()
        followupDate.setMonth(followupDate.getMonth() + 6)
        const dateStr = followupDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        await fetch(`/api/leads/${proposal.lead_id}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'partial_job_booked',
            description: `Partial job booked. Follow-up scheduled for ${dateStr}`,
          }),
        }).catch(() => {})
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBooking(false)
    }
  }

  const handleEmail = async () => {
    if (!proposal.customer_email) { setError('No customer email on file'); return }
    setEmailing(true)
    setError(null)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/email`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to send')
      setEmailToast(d.to)
      setTimeout(() => setEmailToast(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEmailing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to delete') }
      router.push(proposal.lead_id ? `/leads/${proposal.lead_id}` : '/proposals')
    } catch (err: any) {
      setError(err.message)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleApproveAiCall = async () => {
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_call_approved: true }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProposal(updated)
      const name = [proposal.customer_first_name, proposal.customer_last_name].filter(Boolean).join(' ') || 'the customer'
      const dateStr = proposal.followup_date
        ? new Date(proposal.followup_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        : 'the follow-up date'
      setAiCallToast(`AI Assistant will call ${name} on ${dateStr}`)
      setTimeout(() => setAiCallToast(null), 6000)
    }
  }

  const followupDateStr = proposal.followup_date
    ? new Date(proposal.followup_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const createLeadUrl = `/leads/create?proposal_id=${proposal.id}&first_name=${encodeURIComponent(proposal.customer_first_name ?? '')}&last_name=${encodeURIComponent(proposal.customer_last_name ?? '')}&address=${encodeURIComponent(proposal.customer_address ?? '')}&city=${encodeURIComponent(proposal.customer_city ?? '')}&state=${encodeURIComponent(proposal.customer_state ?? '')}&zip=${encodeURIComponent(proposal.customer_zip ?? '')}`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto px-4 pt-6 pb-52">

      {/* FIX 3 — Blue Vendo info banner */}
      {vendoImported && (
        <div className="mb-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.3)', borderRadius: '12px' }}>
          <p style={{ color: '#60A5FA', fontSize: '13px' }}>
            📋 Imported from Vendo{vendoQuoteNumber ? ` Quote #${vendoQuoteNumber}` : ''}
          </p>
        </div>
      )}

      {/* FIX 3 — Yellow missing-contact warning */}
      {!proposal.customer_email && (
        <div className="mb-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px' }}>
          <p style={{ color: '#FCD34D', fontSize: '13px' }}>
            ⚠ Missing customer contact info — link to a lead file to add email and phone
          </p>
        </div>
      )}

      {/* FIX 4 — Lead Linking Card */}
      {vendoImported && !proposal.lead_id && (
        <div className="mb-4 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
          <p className="font-bold mb-1" style={{ color: '#F9FAFB', fontSize: '15px' }}>Link to Lead File</p>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            Connect this proposal to a lead to track this customer and add contact details.
          </p>

          {matchState === 'loading' && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Searching for matching lead…</p>
          )}

          {matchState === 'found' && matchedLead && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Possible match found:</p>
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2"
                style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)' }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#F9FAFB' }}>
                    {matchedLead.first_name} {matchedLead.last_name}
                  </p>
                  {matchedLead.city && (
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {[matchedLead.address, matchedLead.city, matchedLead.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={linkLoading}
                  onClick={() => handleLinkToLead(matchedLead.id)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                  style={{ background: '#1D4ED8', color: '#fff' }}>
                  {linkLoading ? 'Linking…' : 'Link to this lead'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMatchState('dismissed')}
                style={{ color: '#6B7280', fontSize: '12px' }}>
                Not the right person
              </button>
            </div>
          )}

          {(matchState === 'none' || matchState === 'dismissed') && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSearchOpen(o => !o)}
                className="w-full h-10 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.3)' }}>
                {searchOpen ? 'Close Search' : 'Search Leads'}
              </button>
              <AnimatePresence>
                {searchOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="relative mt-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => handleLeadSearch(e.target.value)}
                        placeholder="Search by name…"
                        autoFocus
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F9FAFB' }}
                      />
                      {searchResults.length > 0 && (
                        <div className="mt-1 rounded-xl overflow-hidden" style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)' }}>
                          {searchResults.map(lead => (
                            <button
                              key={lead.id}
                              type="button"
                              disabled={linkLoading}
                              onClick={() => handleLinkToLead(lead.id)}
                              className="w-full px-4 py-3 text-left text-sm"
                              style={{ color: '#F9FAFB', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                              {lead.city && <span className="ml-2 text-xs" style={{ color: '#6B7280' }}>{lead.city}, {lead.state}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Link
                href={createLeadUrl}
                className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.1)' }}>
                Create New Lead
              </Link>
            </div>
          )}

          {linkToast && (
            <div className="mt-3 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}>
              {linkToast}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link href={proposal.lead_id ? `/leads/${proposal.lead_id}` : '/proposals'}
          className="flex items-center gap-1.5 text-sm" style={{ color: '#9CA3AF' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {proposal.lead_id ? 'Lead' : 'Proposals'}
        </Link>
        <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{ background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}` }}>
          {proposal.status}
        </span>
      </div>

      {/* Toasts */}
      <AnimatePresence>
        {emailToast && (
          <motion.div key="email-toast" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl px-4 py-3 mb-3 text-sm font-medium flex items-center gap-2"
            style={{ background: 'rgba(29,78,216,0.12)', border: '1px solid rgba(29,78,216,0.2)', color: '#60A5FA' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            Proposal emailed to {emailToast} ✓
          </motion.div>
        )}
        {aiCallToast && (
          <motion.div key="ai-toast" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl px-4 py-3 mb-3 text-sm font-medium flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#34D399' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            {aiCallToast}
          </motion.div>
        )}
        {linkToast && !vendoImported && (
          <motion.div key="link-toast" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl px-4 py-3 mb-3 text-sm font-medium flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#34D399' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            {linkToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer card */}
      <div className="p-5 mb-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Customer</p>
          {proposal.lead_id && (
            <Link href={`/leads/${proposal.lead_id}`}
              className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}>
              Linked to lead →
            </Link>
          )}
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>{fullName}</p>
            {proposal.spouse_first_name && (
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>& {proposal.spouse_first_name} {proposal.spouse_last_name}</p>
            )}
            {proposal.customer_address && (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {proposal.customer_address}, {proposal.customer_city}, {proposal.customer_state} {proposal.customer_zip}
              </p>
            )}
          </div>
          <div className="space-y-1 text-right">
            {proposal.customer_phone && (
              <a href={`tel:${proposal.customer_phone}`} className="block text-sm" style={{ color: '#60A5FA' }}>{formatPhone(proposal.customer_phone)}</a>
            )}
            {proposal.customer_email && (
              <a href={`mailto:${proposal.customer_email}`} className="block text-xs" style={{ color: '#6B7280' }}>{proposal.customer_email}</a>
            )}
          </div>
        </div>
      </div>

      {/* Pricing — Vendo: display stored values; normal: use calcPrice */}
      {vendoImported ? (
        <div className="p-5 mb-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Pricing</p>
            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold uppercase"
              style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA' }}>Vendo Import</span>
          </div>
          {(numWindows > 0 || numDoors > 0) && (
            <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
              {[numWindows && `${numWindows} Windows`, numDoors && `${numDoors} Doors`].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="space-y-2 text-sm">
            {packagePrice > 0 && (
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>Package Price</span>
                <span style={{ color: '#D1D5DB' }}>{fmt(packagePrice)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>{discountName || 'Discount'}</span>
                <span style={{ color: '#34D399' }}>-{fmt(discountAmount)}</span>
              </div>
            )}
            {adminFee > 0 && (
              <div className="flex justify-between">
                <span style={{ color: '#6B7280' }}>Admin Fee</span>
                <span style={{ color: '#D1D5DB' }}>{fmt(adminFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="font-bold" style={{ color: '#F9FAFB' }}>Your Price</span>
              <span className="font-bold text-base" style={{ color: '#60A5FA' }}>{fmt(yourPrice)}</span>
            </div>
          </div>
        </div>
      ) : result && pricing ? (
        <div className="p-5 mb-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Pricing</p>
            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold uppercase"
              style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA' }}>{proposal.type}</span>
          </div>
          {pricing.proposal_type !== 'siding' && (pricing.num_windows || pricing.num_doors) ? (
            <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
              {[pricing.num_windows && `${pricing.num_windows} Windows`, pricing.num_doors && `${pricing.num_doors} Doors`].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <PriceSummary result={result} inputs={pricing} />
        </div>
      ) : null}

      {/* Partial Job Card */}
      {proposal.is_partial_job && (
        <div className="p-5 mb-4" style={{ ...cardStyle, borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#FCD34D' }}>
              Partial Job{followupDateStr ? ` — Follow-up: ${followupDateStr}` : ''}
            </p>
          </div>
          {proposal.partial_job_notes && (
            <p className="text-sm mb-4" style={{ color: '#D1D5DB' }}>
              <span style={{ color: '#9CA3AF' }}>Remaining: </span>{proposal.partial_job_notes}
            </p>
          )}
          <div className="flex gap-2">
            {!proposal.ai_call_approved ? (
              <button onClick={handleApproveAiCall}
                className="flex-1 h-10 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.3)' }}>
                Approve AI Call
              </button>
            ) : (
              <div className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-xs font-semibold" style={{ color: '#34D399' }}>AI Call Approved</span>
              </div>
            )}
            {proposal.customer_phone && (
              <a href={`tel:${proposal.customer_phone}`}
                className="flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.37 6.37l.72-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                I'll Call Personally
              </a>
            )}
          </div>
        </div>
      )}

      {/* Internal notes */}
      {proposal.internal_notes && (
        <div className="p-5 mb-4" style={cardStyle}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>Scope Notes</p>
          <p className="text-sm" style={{ color: '#D1D5DB', lineHeight: '1.6' }}>{proposal.internal_notes}</p>
        </div>
      )}

      {/* Meta */}
      <div className="p-5 mb-4" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Details</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: '#6B7280' }}>Created</span>
            <span style={{ color: '#D1D5DB' }}>{createdAt}</span>
          </div>
          {proposal.public_token && (
            <div className="flex justify-between items-center">
              <span style={{ color: '#6B7280' }}>Public link</span>
              <Link href={`/p/${proposal.public_token}`}
                className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>
                View →
              </Link>
            </div>
          )}
          {proposal.lead_id && (
            <div className="flex justify-between items-center">
              <span style={{ color: '#6B7280' }}>Lead file</span>
              <Link href={`/leads/${proposal.lead_id}`}
                className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>
                View →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Present + Edit + PDF + Delete buttons */}
      <div className="flex gap-3 mb-4">
        <Link href={`/proposals/${proposal.id}/present`}
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Present
        </Link>
        <Link href={`/proposals/new?id=${proposal.id}`}
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </Link>
        <a href={`/api/proposals/${proposal.id}/pdf`} target="_blank" rel="noopener noreferrer"
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.3)', color: '#60A5FA' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
        <button type="button" onClick={() => setShowDeleteModal(true)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
          {error}
        </div>
      )}

      {/* Action bar */}
      <div className="fixed left-0 right-0 z-50 px-4 py-3"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))', background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {proposal.status === 'signed' ? (
          <div className="h-12 rounded-2xl flex items-center justify-center gap-2"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="font-bold" style={{ color: '#34D399' }}>Booked!</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link
              href={proposal.lead_id ? `/leads/${proposal.lead_id}` : '/proposals'}
              className="flex-1 h-12 rounded-2xl text-sm font-semibold flex items-center justify-center"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}>
              Follow Up
            </Link>
            <button type="button" onClick={handleEmail} disabled={emailing || !proposal.customer_email}
              className="flex-1 h-12 rounded-2xl text-sm font-semibold flex items-center justify-center"
              style={{ border: '1px solid rgba(29,78,216,0.5)', color: emailing ? 'rgba(96,165,250,0.4)' : '#60A5FA', background: 'rgba(29,78,216,0.08)' }}>
              {emailing ? 'Sending…' : 'Email'}
            </button>
            <button type="button" onClick={handleBookedClick} disabled={booking}
              className="flex-1 h-12 rounded-2xl text-base font-bold transition-all"
              style={{ background: booking ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #059669, #10B981)', color: '#fff', boxShadow: booking ? 'none' : '0 4px 20px rgba(16,185,129,0.3)' }}>
              {booking ? 'Saving…' : '🎉 Booked!'}
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl p-6 mb-8"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>Delete Proposal?</h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>This cannot be undone. The proposal will be permanently removed.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDeleteModal(false)}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#9CA3AF', background: 'transparent' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold"
                  style={{ background: deleting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.85)', color: '#fff' }}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booked Modal */}
      <AnimatePresence>
        {showBookedModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowBookedModal(false) }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl p-6 mb-8"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-xl font-bold mb-1" style={{ color: '#F9FAFB' }}>Booked!</h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>Finish the job in Vendo to complete paperwork.</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div onClick={() => setIsPartial(p => !p)}
                  className="relative flex-shrink-0" style={{ width: '40px', height: '24px' }}>
                  <div className="absolute inset-0 rounded-full transition-all"
                    style={{ background: isPartial ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
                  <div className="absolute top-1 rounded-full transition-all"
                    style={{ width: '16px', height: '16px', background: '#fff', left: isPartial ? '20px' : '4px' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: '#D1D5DB' }}>This is a partial job</span>
              </label>

              <AnimatePresence>
                {isPartial && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4">
                    <textarea
                      value={partialNotes}
                      onChange={e => setPartialNotes(e.target.value)}
                      placeholder="e.g. 3 windows in master bedroom and office"
                      rows={3}
                      className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#F9FAFB' }}
                    />
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                      Follow-up will be scheduled for 6 months from today.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={handleConfirmBooked} disabled={booking}
                className="w-full h-12 rounded-2xl text-base font-bold"
                style={{ background: booking ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #059669, #10B981)', color: '#fff' }}>
                {booking ? 'Saving…' : 'Confirm'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
