'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Lead = Record<string, any>

const STATUS_CYCLE: string[] = ['new', 'contacted', 'proposed', 'closed']
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:       { bg: 'rgba(29,78,216,0.15)',  text: '#60A5FA' },
  contacted: { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  proposed:  { bg: 'rgba(6,182,212,0.15)',  text: '#22D3EE' },
  closed:    { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

function StatusBadge({
  status,
  onClick,
}: {
  status: string
  onClick: () => void
}) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.new
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.text}33` }}
    >
      {status}
    </button>
  )
}

function Section({
  delay,
  children,
}: {
  delay: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

// Render AI summary with bold section headers
function AISummary({ text }: { text: string | null }) {
  if (!text) {
    return (
      <div className="space-y-2">
        {[100, 80, 90, 70].map((w, i) => (
          <div
            key={i}
            className="h-4 rounded animate-pulse"
            style={{ width: `${w}%`, background: 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>
    )
  }

  const lines = text.split('\n').filter(Boolean)
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // Bold section headers (ALL CAPS words followed by colon, or lines starting with **)
        const isSectionHeader =
          /^[A-Z][A-Z\s]+:/.test(line) || line.startsWith('**')
        const clean = line.replace(/\*\*/g, '')
        return (
          <p
            key={i}
            className={isSectionHeader ? 'font-bold pt-2' : ''}
            style={{
              color: isSectionHeader ? '#F9FAFB' : '#D1D5DB',
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          >
            {clean}
          </p>
        )
      })}
    </div>
  )
}

export default function LeadDetail({ lead: initialLead }: { lead: Lead }) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead>(initialLead)
  const [notes, setNotes] = useState(initialLead.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)

  const fullName = lead.is_married && lead.spouse_first_name
    ? `${lead.first_name} & ${lead.spouse_first_name} ${lead.last_name}`
    : `${lead.first_name} ${lead.last_name}`

  const cycleStatus = async () => {
    const idx = STATUS_CYCLE.indexOf(lead.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    setLead(prev => ({ ...prev, status: next }))
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }

  const saveNotes = useCallback(async () => {
    if (notes === (lead.notes ?? '')) return
    setSavingNotes(true)
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNotes(false)
  }, [notes, lead.id, lead.notes])

  const apptDate = lead.appointment_date
    ? new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : null

  const cardStyle: React.CSSProperties = {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-4 pt-6 pb-32"
    >
      {/* Back + Edit header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/leads"
          className="flex items-center gap-1.5 text-sm"
          style={{ color: '#9CA3AF' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Leads
        </Link>
        <Link
          href={`/leads/${lead.id}/edit`}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </Link>
      </div>

      {/* Street View photo */}
      <Section delay={0}>
        <div
          className="w-full rounded-2xl mb-5 overflow-hidden flex items-center justify-center"
          style={{ height: '200px', background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {lead.street_view_url ? (
            <img
              src={lead.street_view_url}
              alt="Street view"
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-xs" style={{ color: '#4B5563' }}>No photo available</span>
            </div>
          )}
        </div>
      </Section>

      {/* Name + address + badges */}
      <Section delay={0.05}>
        <div className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#F9FAFB' }}>{fullName}</h1>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {lead.address}, {lead.city}, {lead.state} {lead.zip}
              </p>
            </div>
            <StatusBadge status={lead.status} onClick={cycleStatus} />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {apptDate && (
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {apptDate}
              </span>
            )}
            {lead.lead_source && (
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}
              >
                {lead.lead_source}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* AI Summary */}
      <Section delay={0.1}>
        <div className="p-5 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>AI Research Summary</span>
          </div>
          <AISummary text={lead.ai_summary} />
        </div>
      </Section>

      {/* Notes */}
      <Section delay={0.15}>
        <div className="p-5 mb-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Notes</span>
            {savingNotes && (
              <span className="text-xs" style={{ color: '#6B7280' }}>Saving…</span>
            )}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes about this lead…"
            rows={4}
            className="w-full rounded-xl px-3 py-3 text-sm resize-none outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#D1D5DB',
              lineHeight: '1.6',
            }}
          />
        </div>
      </Section>

      {/* Contact details */}
      <Section delay={0.2}>
        <div className="p-5 mb-4" style={cardStyle}>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>
            Contact Details
          </h3>
          <div className="space-y-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm" style={{ color: '#D1D5DB' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.37 6.37l.72-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm" style={{ color: '#D1D5DB' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {lead.email}
              </a>
            )}
            {lead.is_married && lead.spouse_first_name && (
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-1.5" style={{ color: '#6B7280' }}>Spouse</p>
                <p className="text-sm" style={{ color: '#D1D5DB' }}>{lead.spouse_first_name} {lead.spouse_last_name}</p>
                {lead.spouse_phone && (
                  <a href={`tel:${lead.spouse_phone}`} className="flex items-center gap-2 text-sm mt-1" style={{ color: '#D1D5DB' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.37 6.37l.72-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    {lead.spouse_phone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Vendo sync placeholder */}
      <Section delay={0.25}>
        <div
          className="p-4 mb-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(17,24,39,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <div>
            <p className="text-xs font-medium" style={{ color: '#4B5563' }}>Vendo Sync — Coming Soon</p>
          </div>
        </div>
      </Section>

      {/* Convert to Proposal — sticky bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 py-4"
        style={{
          background: 'rgba(10,15,30,0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <Link
          href={`/proposals/new?lead_id=${lead.id}`}
          className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-base font-semibold"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8, #0F766E)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(29,78,216,0.35)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Convert to Proposal
        </Link>
      </div>
    </motion.div>
  )
}
