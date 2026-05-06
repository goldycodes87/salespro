'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import FilesTab from './files-tab'
import { useResearch } from '@/components/ui/research-context'

type Lead = Record<string, any>
type Activity = { id: string; event_type: string; description: string; created_at: string }
type Proposal = { id: string; type: string; status: string; your_price: number; created_at: string }

const STATUS_CYCLE = ['new', 'contacted', 'proposed', 'closed']
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:       { bg: 'rgba(29,78,216,0.15)',  text: '#60A5FA' },
  contacted: { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  proposed:  { bg: 'rgba(6,182,212,0.15)',  text: '#22D3EE' },
  closed:    { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}
const PROPOSAL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:  { bg: 'rgba(107,114,128,0.2)', text: '#9CA3AF' },
  sent:   { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  signed: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

function StatusBadge({ status, onClick }: { status: string; onClick: () => void }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.new
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.text}33` }}>
      {status}
    </button>
  )
}

function Fade({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}>
      {children}
    </motion.div>
  )
}

function AISummary({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split('\n').filter(Boolean).map((line, i) => {
        const isHeader = /^[A-Z][A-Z\s]+:/.test(line) || line.startsWith('**')
        return (
          <p key={i} className={isHeader ? 'font-bold pt-2' : ''}
            style={{ color: isHeader ? '#F9FAFB' : '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            {line.replace(/\*\*/g, '')}
          </p>
        )
      })}
    </div>
  )
}

const TABS = ['Overview', 'Proposals', 'Activity', 'Files'] as const
type Tab = typeof TABS[number]

export default function LeadDetail({
  lead: initialLead,
  referrer,
  referrals,
  proposals: initialProposals,
  activity: initialActivity,
}: {
  lead: Lead
  referrer?: Lead | null
  referrals?: Lead[]
  proposals?: Proposal[]
  activity?: Activity[]
}) {
  const { startResearch } = useResearch()
  const [lead, setLead] = useState<Lead>(initialLead)
  const [tab, setTab] = useState<Tab>('Overview')
  const [streetViewError, setStreetViewError] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [showFeedbackField, setShowFeedbackField] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')

  const fullName = lead.is_married && lead.spouse_first_name
    ? `${lead.first_name} & ${lead.spouse_first_name} ${lead.last_name}`
    : `${lead.first_name} ${lead.last_name}`

  // If research_status is 'running' on load, start polling
  useEffect(() => {
    if (lead.research_status === 'running') {
      setResearching(true)
      startResearch(lead.id, `${lead.first_name} ${lead.last_name}`)
    }
  }, []) // eslint-disable-line

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

  const runResearch = async () => {
    setResearching(true)
    setResearchError(null)
    const name = `${lead.first_name} ${lead.last_name}`
    startResearch(lead.id, name)

    // Fire without awaiting — polling picks up completion
    fetch(`/api/leads/${lead.id}/research`, { method: 'POST' })
      .then(async res => {
        if (res.ok) {
          const data = await res.json()
          if (data.summary) {
            setLead(prev => ({ ...prev, ai_summary: data.summary, research_status: 'complete' }))
          }
        } else {
          setResearchError('Research failed. Try again.')
        }
        setResearching(false)
      })
      .catch(() => {
        setResearchError('Research failed. Try again.')
        setResearching(false)
      })
  }

  const submitFeedback = async (type: 'up' | 'down', text?: string) => {
    setFeedback(type)
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ research_feedback: type === 'down' ? text || 'thumbs_down' : 'thumbs_up' }),
    })
  }

  const apptDate = lead.appointment_date
    ? new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  const cardStyle: React.CSSProperties = {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
  }

  const proposals = initialProposals ?? []
  const activity = initialActivity ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-4 pt-6 pb-48">

      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/leads" className="flex items-center gap-1.5 text-sm" style={{ color: '#9CA3AF' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Leads
        </Link>
        <Link href={`/leads/${lead.id}/edit`} className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </Link>
      </div>

      {/* Street View / Satellite */}
      <Fade delay={0}>
        <div className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ height: '200px', background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          {lead.street_view_url && !streetViewError ? (
            <img
              src={lead.street_view_url}
              alt="Property photo"
              className="w-full h-full object-cover"
              onError={() => setStreetViewError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-xs" style={{ color: '#4B5563' }}>{streetViewError ? 'Photo unavailable' : 'No photo available'}</span>
            </div>
          )}
        </div>
        {lead.street_view_url && !streetViewError && (
          <div className="flex justify-center mt-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)' }}>
              {lead.photo_type === 'satellite' ? 'Satellite View' : 'Street View'}
            </span>
          </div>
        )}
        {!(lead.street_view_url && !streetViewError) && <div className="mb-5" />}
      </Fade>

      {/* Name + badges */}
      <Fade delay={0.05}>
        <div className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#F9FAFB' }}>{fullName}</h1>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>{lead.address}, {lead.city}, {lead.state} {lead.zip}</p>
            </div>
            <StatusBadge status={lead.status} onClick={cycleStatus} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {apptDate && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                {apptDate}
              </span>
            )}
            {lead.lead_source && (
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}>{lead.lead_source}</span>
            )}
          </div>
        </div>
      </Fade>

      {/* Tabs */}
      <Fade delay={0.08}>
        <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: tab === t ? '#1D4ED8' : 'transparent', color: tab === t ? '#fff' : '#6B7280' }}>
              {t}
            </button>
          ))}
        </div>
      </Fade>

      <AnimatePresence mode="wait">
        {tab === 'Overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {/* Referrer */}
            {referrer && (
              <Fade delay={0.1}>
                <Link href={`/leads/${referrer.id}`} className="flex items-center gap-3 p-4 mb-4 rounded-2xl" style={cardStyle}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>
                    {referrer.first_name[0]}{referrer.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium mb-0.5" style={{ color: '#6B7280' }}>Referred by</p>
                    <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{referrer.first_name} {referrer.last_name}</p>
                    <p className="text-xs truncate" style={{ color: '#6B7280' }}>{referrer.city}, {referrer.state}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              </Fade>
            )}

            {/* AI Research */}
            <Fade delay={0.1}>
              <div className="p-5 mb-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>AI Research</span>
                  </div>
                  {lead.ai_summary && !researching && (
                    <button onClick={runResearch} className="text-xs font-medium px-3 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>
                      Re-run
                    </button>
                  )}
                </div>

                {researching ? (
                  <div>
                    <div className="space-y-2 mb-3">
                      {[100, 80, 90, 70].map((w, i) => (
                        <div key={i} className="h-4 rounded animate-pulse" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: '#6B7280' }}>Research running in background — you'll be notified when complete</p>
                  </div>
                ) : lead.ai_summary ? (
                  <div>
                    <AISummary text={lead.ai_summary} />
                    <p className="text-xs mt-4 pt-3" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      AI-generated research. Verify before your appointment.
                    </p>
                    {/* Thumbs */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs" style={{ color: '#6B7280' }}>Helpful?</span>
                      <button onClick={() => submitFeedback('up')} className="p-1.5 rounded-lg transition-all"
                        style={{ background: feedback === 'up' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', color: feedback === 'up' ? '#34D399' : '#6B7280' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                      </button>
                      <button onClick={() => { submitFeedback('down'); setShowFeedbackField(true) }} className="p-1.5 rounded-lg transition-all"
                        style={{ background: feedback === 'down' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', color: feedback === 'down' ? '#EF4444' : '#6B7280' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                        </svg>
                      </button>
                    </div>
                    <AnimatePresence>
                      {showFeedbackField && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                          <textarea
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            onBlur={() => feedbackText && submitFeedback('down', feedbackText)}
                            placeholder="What was wrong with the research?"
                            rows={2}
                            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#D1D5DB' }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm mb-3" style={{ color: '#6B7280' }}>No research has been run yet</p>
                    <button onClick={runResearch} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      Run AI Research
                    </button>
                  </div>
                )}
                {researchError && <p className="text-xs mt-3" style={{ color: '#EF4444' }}>{researchError}</p>}
              </div>
            </Fade>

            {/* Contact details */}
            <Fade delay={0.15}>
              <div className="p-5 mb-4" style={cardStyle}>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Contact Details</h3>
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
            </Fade>

            {/* Referrals from this lead */}
            {referrals && referrals.length > 0 && (
              <Fade delay={0.2}>
                <div className="p-5 mb-4" style={cardStyle}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Referrals from this lead</h3>
                  <div className="space-y-2">
                    {referrals.map(r => (
                      <Link key={r.id} href={`/leads/${r.id}`} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA' }}>
                          {r.first_name[0]}{r.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>{r.first_name} {r.last_name}</p>
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>{r.city}, {r.state}</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                      </Link>
                    ))}
                  </div>
                </div>
              </Fade>
            )}
          </motion.div>
        )}

        {tab === 'Proposals' && (
          <motion.div key="proposals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-3">
              <Link href={`/proposals/new?lead_id=${lead.id}`}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New Proposal for {lead.first_name}
              </Link>
            </div>
            {proposals.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={cardStyle}>
                <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>No proposals yet</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Create a proposal for this lead</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proposals.map(p => {
                  const c = PROPOSAL_STATUS_COLORS[p.status] ?? PROPOSAL_STATUS_COLORS.draft
                  return (
                    <Link key={p.id} href={`/proposals/${p.id}`}
                      className="flex items-center gap-3 p-4 rounded-2xl" style={cardStyle}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase" style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA' }}>{p.type}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase" style={{ background: c.bg, color: c.text }}>{p.status}</span>
                        </div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-base font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>
                        ${(p.your_price ?? 0).toLocaleString()}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </Link>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'Activity' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B7280' }}>Activity Log</h3>
              {activity.length === 0 ? (
                <p className="text-sm" style={{ color: '#4B5563' }}>No activity recorded yet</p>
              ) : (
                <div className="space-y-4">
                  {activity.map(a => (
                    <div key={a.id} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#374151' }} />
                      <div>
                        <p className="text-sm" style={{ color: '#D1D5DB' }}>{a.description}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                          {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'Files' && (
          <motion.div key="files" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <FilesTab
              leadId={lead.id}
              repId={lead.rep_id}
              notes={lead.notes ?? ''}
              onNotesSave={n => setLead(prev => ({ ...prev, notes: n }))}
              activity={activity}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert to Proposal sticky */}
      <div className="fixed left-0 right-0 z-50 px-4 py-4"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))', background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href={`/proposals/new?lead_id=${lead.id}`}
          className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-base font-semibold"
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff', boxShadow: '0 4px 24px rgba(29,78,216,0.35)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Convert to Proposal
        </Link>
      </div>
    </motion.div>
  )
}
