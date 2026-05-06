'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import PriceSummary from './price-summary'
import { calcPrice, type PricingInputs } from '@/lib/pricing'
import { formatPhone } from '@/hooks/usePhoneFormat'

type Proposal = Record<string, any>

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

export default function ProposalDetail({ proposal: initial }: { proposal: Proposal }) {
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal>(initial)
  const [booking, setBooking] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailToast, setEmailToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statusColors = STATUS_COLORS[proposal.status] ?? STATUS_COLORS.draft

  const pricing: PricingInputs | null = proposal.pricing_data?.proposal_type
    ? proposal.pricing_data as PricingInputs
    : null
  const result = pricing ? calcPrice(pricing) : null

  const createdAt = new Date(proposal.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const handleBooked = async () => {
    setBooking(true)
    setError(null)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signed', lead_id: proposal.lead_id }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setProposal(prev => ({ ...prev, status: 'signed' }))

      // Confetti
      const confetti = (await import('canvas-confetti')).default
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#1D4ED8', '#34D399', '#60A5FA', '#FCD34D'] })
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#1D4ED8', '#34D399', '#60A5FA'] })
      }, 300)
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

  const fullName = [proposal.customer_first_name, proposal.customer_last_name].filter(Boolean).join(' ')
    || proposal.customer_name || '—'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto px-4 pt-6 pb-52">

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
      {emailToast && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 mb-3 text-sm font-medium flex items-center gap-2"
          style={{ background: 'rgba(29,78,216,0.12)', border: '1px solid rgba(29,78,216,0.2)', color: '#60A5FA' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          Proposal emailed to {emailToast} ✓
        </motion.div>
      )}

      {/* Customer card */}
      <div className="p-5 mb-4" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Customer</p>
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

      {/* Pricing */}
      {result && pricing && (
        <div className="p-5 mb-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Pricing</p>
            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold uppercase"
              style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA' }}>{proposal.type}</span>
          </div>
          <PriceSummary result={result} inputs={pricing} />
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

      {/* Present + Edit buttons */}
      <div className="flex gap-3 mb-8">
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
            <button
              type="button"
              onClick={handleEmail}
              disabled={emailing || !proposal.customer_email}
              className="flex-1 h-12 rounded-2xl text-sm font-semibold flex items-center justify-center"
              style={{
                border: '1px solid rgba(29,78,216,0.5)',
                color: emailing ? 'rgba(96,165,250,0.4)' : '#60A5FA',
                background: 'rgba(29,78,216,0.08)',
              }}>
              {emailing ? 'Sending…' : 'Email'}
            </button>
            <button
              type="button"
              onClick={handleBooked}
              disabled={booking}
              className="flex-1 h-12 rounded-2xl text-base font-bold transition-all"
              style={{
                background: booking ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #059669, #10B981)',
                color: '#fff',
                boxShadow: booking ? 'none' : '0 4px 20px rgba(16,185,129,0.3)',
              }}>
              {booking ? 'Saving…' : '🎉 Booked!'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
