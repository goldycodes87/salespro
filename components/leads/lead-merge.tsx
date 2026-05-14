'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

type Lead = Record<string, any>
type FieldSel = 'primary' | 'secondary' | 'both'

const MERGE_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: 'first_name',        label: 'First Name' },
  { key: 'last_name',         label: 'Last Name' },
  { key: 'spouse_first_name', label: 'Spouse Name' },
  { key: 'phone',             label: 'Phone' },
  { key: 'email',             label: 'Email' },
  { key: 'address',           label: 'Address' },
  { key: 'city',              label: 'City' },
  { key: 'state',             label: 'State' },
  { key: 'zip',               label: 'Zip' },
  { key: 'lead_source',       label: 'Lead Source' },
  { key: 'notes',             label: 'Notes', multiline: true },
  { key: 'status',            label: 'Status' },
]

function initSelections(a: Lead, b: Lead): Record<string, FieldSel> {
  const result: Record<string, FieldSel> = {}
  for (const { key } of MERGE_FIELDS) {
    const aVal = a[key] != null ? String(a[key]).trim() : ''
    const bVal = b[key] != null ? String(b[key]).trim() : ''
    result[key] = (!aVal && bVal) ? 'secondary' : 'primary'
  }
  return result
}

function val(lead: Lead, key: string): string {
  const v = lead[key]
  if (v == null || v === '') return ''
  return String(v)
}

export default function LeadMerge({
  primaryLead,
  initialSecondaryLead,
  onClose,
}: {
  primaryLead: Lead
  initialSecondaryLead?: Lead | null
  onClose: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<'search' | 'compare' | 'confirm'>(
    initialSecondaryLead ? 'compare' : 'search'
  )
  const [secondary, setSecondary] = useState<Lead | null>(initialSecondaryLead ?? null)
  const [selections, setSelections] = useState<Record<string, FieldSel>>({})
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [searching, setSearching] = useState(false)
  const [proposalCount, setProposalCount] = useState<number | null>(null)
  const [merging, setMerging] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (primaryLead && secondary) {
      setSelections(initSelections(primaryLead, secondary))
      // Fetch secondary lead's proposal count
      fetch(`/api/leads/${secondary.id}/proposals-count`)
        .then(r => r.json())
        .then(d => setProposalCount(d.count ?? 0))
        .catch(() => setProposalCount(0))
    }
  }, [primaryLead, secondary])

  useEffect(() => {
    if (step === 'search') setTimeout(() => inputRef.current?.focus(), 200)
  }, [step])

  // Search debounce
  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leads/search?q=${encodeURIComponent(searchQ)}`)
        const data: Lead[] = await res.json()
        setSearchResults(data.filter((l: Lead) => l.id !== primaryLead.id))
      } catch {}
      setSearching(false)
    }, 300)
  }, [searchQ, primaryLead.id])

  const selectSecondary = (lead: Lead) => {
    setSecondary(lead)
    setStep('compare')
  }

  const setSel = (key: string, v: FieldSel) =>
    setSelections(prev => ({ ...prev, [key]: v }))

  const setAll = (side: 'primary' | 'secondary') => {
    const next: Record<string, FieldSel> = {}
    for (const { key } of MERGE_FIELDS) next[key] = side
    setSelections(next)
  }

  const handleMerge = async () => {
    if (!secondary || merging) return
    setMerging(true)
    try {
      const res = await fetch('/api/leads/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryLeadId: primaryLead.id,
          secondaryLeadId: secondary.id,
          fieldSelections: selections,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onClose()
        router.push(`/leads/${data.leadId}?merged=1`)
        router.refresh()
        return
      }
    } catch {}
    setMerging(false)
  }

  const primaryName = `${primaryLead.first_name ?? ''} ${primaryLead.last_name ?? ''}`.trim()
  const secondaryName = secondary ? `${secondary.first_name ?? ''} ${secondary.last_name ?? ''}`.trim() : ''

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel — slides up from bottom */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed inset-x-0 bottom-0 z-[101] flex flex-col"
        style={{
          top: 48,
          background: '#0D1117',
          borderRadius: '20px 20px 0 0',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 720,
          margin: '0 auto',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {step !== 'search' && !initialSecondaryLead && (
            <button
              onClick={() => step === 'compare' ? setStep('search') : setStep('compare')}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: '7px 12px', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
            >
              ←
            </button>
          )}
          {step !== 'search' && initialSecondaryLead && step === 'confirm' && (
            <button
              onClick={() => setStep('compare')}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: '7px 12px', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
            >
              ←
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold" style={{ color: '#F9FAFB' }}>
              {step === 'search' ? 'Select Lead to Merge' : step === 'compare' ? 'Merge Leads' : 'Review Merge'}
            </h2>
            {step === 'compare' && (
              <p className="text-xs" style={{ color: '#6B7280' }}>Pick which information to keep</p>
            )}
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: '7px 12px', color: '#9CA3AF', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
            ✕
          </button>
        </div>

        {/* ── STEP: SEARCH ── */}
        {step === 'search' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                Merge <span style={{ color: '#F9FAFB', fontWeight: 700 }}>{primaryName}</span> with…
              </p>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search by name…"
                  style={{
                    width: '100%', height: 48, borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#F9FAFB', fontSize: 15, padding: '0 16px 0 44px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2">
              {searching && searchQ.length >= 2 && (
                <p className="text-sm text-center py-6" style={{ color: '#6B7280' }}>Searching…</p>
              )}
              {!searching && searchQ.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: '#6B7280' }}>No leads found</p>
              )}
              {!searching && searchQ.length < 2 && (
                <p className="text-sm text-center py-6" style={{ color: '#4B5563' }}>Type at least 2 characters</p>
              )}
              {searchResults.map(lead => (
                <button key={lead.id} onClick={() => selectSecondary(lead)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA' }}>
                    {lead.first_name?.[0]}{lead.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{lead.city}, {lead.state}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: COMPARE ── */}
        {step === 'compare' && secondary && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-2 gap-3 px-5 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-bold truncate mb-1.5" style={{ color: '#F9FAFB' }}>{primaryName}</p>
                <button onClick={() => setAll('primary')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.3)' }}>
                  Keep All ←
                </button>
              </div>
              <div>
                <p className="text-sm font-bold truncate mb-1.5" style={{ color: '#F9FAFB' }}>{secondaryName}</p>
                <button onClick={() => setAll('secondary')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(6,182,212,0.12)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.25)' }}>
                  Keep All →
                </button>
              </div>
            </div>

            {/* Scrollable field rows */}
            <div className="flex-1 overflow-y-auto px-5 pt-4" style={{ paddingBottom: 100 }}>
              {MERGE_FIELDS.map(({ key, label, multiline }) => {
                const aVal = val(primaryLead, key)
                const bVal = val(secondary!, key)
                if (!aVal && !bVal) return null
                const sel = selections[key] ?? 'primary'

                return (
                  <div key={key} className="mb-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>{label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Primary (left) */}
                      <button
                        onClick={() => setSel(key, 'primary')}
                        className="relative text-left p-3 rounded-xl"
                        style={{
                          background: sel === 'primary' ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.04)',
                          border: sel === 'primary' ? '1.5px solid #1D4ED8' : '1px solid rgba(255,255,255,0.08)',
                          minHeight: 44,
                        }}
                      >
                        {sel === 'primary' && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: '#1D4ED8' }}>
                            <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1.5 5 4 7.5 8.5 2.5" />
                            </svg>
                          </div>
                        )}
                        {aVal
                          ? <p className={`text-xs pr-5 ${multiline ? 'line-clamp-3' : 'truncate'}`}
                              style={{ color: sel === 'primary' ? '#F9FAFB' : 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                              {aVal}
                            </p>
                          : <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)' }}>empty</p>
                        }
                      </button>

                      {/* Secondary (right) */}
                      <button
                        onClick={() => setSel(key, 'secondary')}
                        className="relative text-left p-3 rounded-xl"
                        style={{
                          background: sel === 'secondary' || sel === 'both' ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                          border: sel === 'secondary' || sel === 'both' ? '1.5px solid #06B6D4' : '1px solid rgba(255,255,255,0.08)',
                          minHeight: 44,
                        }}
                      >
                        {(sel === 'secondary' || sel === 'both') && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: '#06B6D4' }}>
                            {sel === 'both'
                              ? <span style={{ fontSize: 6, color: '#fff', fontWeight: 900, letterSpacing: '-0.5px' }}>+B</span>
                              : <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5 5 4 7.5 8.5 2.5" /></svg>
                            }
                          </div>
                        )}
                        {bVal
                          ? <p className={`text-xs pr-5 ${multiline ? 'line-clamp-3' : 'truncate'}`}
                              style={{ color: (sel === 'secondary' || sel === 'both') ? '#F9FAFB' : 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                              {bVal}
                            </p>
                          : <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)' }}>empty</p>
                        }
                      </button>
                    </div>
                    {/* Keep both — notes only */}
                    {key === 'notes' && aVal && bVal && (
                      <button
                        onClick={() => setSel('notes', 'both')}
                        className="mt-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                        style={{
                          background: sel === 'both' ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                          border: sel === 'both' ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          color: sel === 'both' ? '#06B6D4' : '#6B7280',
                        }}
                      >
                        Combine both notes
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sticky continue button */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 flex-shrink-0"
              style={{ background: 'linear-gradient(to top, #0D1117 65%, transparent)' }}>
              <button
                onClick={() => setStep('confirm')}
                className="w-full h-14 rounded-2xl text-base font-bold"
                style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(29,78,216,0.35)' }}
              >
                Review Merge →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && secondary && (
          <div className="flex-1 overflow-y-auto px-5 pt-4" style={{ paddingBottom: 120 }}>
            {/* What happens card */}
            <div className="rounded-2xl p-5 mb-4"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#6B7280' }}>After merging</p>
              <div className="space-y-4">
                {proposalCount != null && proposalCount > 0 && (
                  <div className="flex items-start gap-3">
                    <span style={{ color: '#06B6D4', fontSize: 16, marginTop: 2, flexShrink: 0 }}>→</span>
                    <p className="text-sm" style={{ color: '#D1D5DB', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700, color: '#F9FAFB' }}>{proposalCount} proposal{proposalCount !== 1 ? 's' : ''}</span>{' '}
                      from {secondaryName} will move to {primaryName}
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span style={{ color: '#06B6D4', fontSize: 16, marginTop: 2, flexShrink: 0 }}>→</span>
                  <p className="text-sm" style={{ color: '#D1D5DB' }}>Activity history will be combined</p>
                </div>
                <div className="flex items-start gap-3">
                  <span style={{ color: '#EF4444', fontSize: 16, marginTop: 2, flexShrink: 0 }}>✕</span>
                  <p className="text-sm" style={{ color: '#D1D5DB' }}>
                    <span style={{ fontWeight: 700, color: '#F9FAFB' }}>{secondaryName}</span> will be removed from your leads
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-medium" style={{ color: '#EF4444' }}>⚠ This cannot be undone</p>
              </div>
            </div>

            {/* Field selections summary */}
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Winning fields</p>
              <div className="space-y-2">
                {MERGE_FIELDS.map(({ key, label }) => {
                  const aVal = val(primaryLead, key)
                  const bVal = val(secondary!, key)
                  if (!aVal && !bVal) return null
                  const sel = selections[key] ?? 'primary'
                  const winner = sel === 'both' ? 'Combined' : sel === 'secondary' ? (bVal || aVal) : (aVal || bVal)
                  return (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className="text-xs flex-shrink-0" style={{ color: '#6B7280' }}>{label}</span>
                      <span className="text-xs font-medium truncate" style={{ color: '#F9FAFB', maxWidth: '60%', textAlign: 'right' }}>{winner}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Merge button (absolute so it stays at bottom) */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4"
              style={{ background: 'linear-gradient(to top, #0D1117 65%, transparent)' }}>
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full h-14 rounded-2xl text-base font-bold"
                style={{
                  background: 'linear-gradient(135deg, #DC2626, #F97316)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 24px rgba(220,38,38,0.35)',
                }}
              >
                Merge Leads
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirm && secondary && (
          <>
            <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowConfirm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-6 z-[201] rounded-3xl p-6"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)', top: '50%', transform: 'translateY(-50%)', maxWidth: 400, margin: '0 auto' }}
            >
              <h3 className="text-lg font-bold mb-2" style={{ color: '#F9FAFB' }}>
                Merge these two leads?
              </h3>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: '#F9FAFB' }}>{secondaryName}</span> will be permanently removed.
              </p>
              <p className="text-sm mb-6" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
                All their data moves to <span style={{ fontWeight: 700, color: '#F9FAFB' }}>{primaryName}</span>.{' '}
                This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={merging}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{
                    background: merging ? 'rgba(220,38,38,0.3)' : 'linear-gradient(135deg, #DC2626, #EF4444)',
                    color: '#fff', border: 'none',
                    cursor: merging ? 'not-allowed' : 'pointer',
                  }}
                >
                  {merging ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      Merging…
                    </span>
                  ) : 'Merge'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
