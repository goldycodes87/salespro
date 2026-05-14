'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import LeadMerge from './lead-merge'

type Lead = Record<string, any>

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:       { bg: 'rgba(29,78,216,0.15)',  text: '#60A5FA' },
  contacted: { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  proposed:  { bg: 'rgba(6,182,212,0.15)',  text: '#22D3EE' },
  closed:    { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

export default function LeadsListClient({ leads }: { leads: Lead[] }) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mergeLeads, setMergeLeads] = useState<[Lead, Lead] | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressDidFire = useRef(false)

  const exitSelection = () => {
    setSelectionMode(false)
    setSelectedIds([])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  const startLongPress = (lead: Lead) => {
    longPressDidFire.current = false
    longPressTimer.current = setTimeout(() => {
      longPressDidFire.current = true
      setSelectionMode(true)
      setSelectedIds([lead.id])
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const triggerMerge = () => {
    if (selectedIds.length !== 2) return
    const a = leads.find(l => l.id === selectedIds[0])!
    const b = leads.find(l => l.id === selectedIds[1])!
    setMergeLeads([a, b])
    exitSelection()
  }

  if (!leads.length) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>No leads yet</p>
        <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Add your first lead to get started</p>
        <Link
          href="/leads/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#0F766E', color: '#fff' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add First Lead
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Selection mode toggle */}
      <div className="flex items-center justify-end mb-3">
        {selectionMode ? (
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: '#9CA3AF' }}>
              {selectedIds.length} selected
            </span>
            <button
              onClick={exitSelection}
              className="text-sm font-medium px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSelectionMode(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
          >
            Select
          </button>
        )}
      </div>

      {/* Leads list */}
      <div className="space-y-2">
        {leads.map((lead) => {
          const c = STATUS_COLORS[lead.status] ?? STATUS_COLORS.new
          const name = lead.is_married && lead.spouse_first_name
            ? `${lead.first_name} & ${lead.spouse_first_name} ${lead.last_name}`
            : `${lead.first_name} ${lead.last_name}`
          const apptDate = lead.appointment_date
            ? new Date(lead.appointment_date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              })
            : null
          const isSelected = selectedIds.includes(lead.id)
          const maxSelected = selectionMode && selectedIds.length === 2 && !isSelected

          const inner = (
            <>
              {selectionMode ? (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isSelected ? '#1D4ED8' : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${isSelected ? '#1D4ED8' : 'rgba(255,255,255,0.15)'}`,
                  }}
                >
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA' }}
                >
                  {lead.first_name[0]}{lead.last_name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
                  {lead.city}, {lead.state}
                  {apptDate ? ` · ${apptDate}` : ''}
                </p>
                {lead.lead_source && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#4B5563' }}>{lead.lead_source}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase"
                  style={{ background: c.bg, color: c.text }}
                >
                  {lead.status}
                </span>
                {!selectionMode && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            </>
          )

          if (selectionMode) {
            return (
              <button
                key={lead.id}
                onClick={() => !maxSelected && toggleSelect(lead.id)}
                className="flex items-center gap-3 p-4 rounded-2xl w-full text-left transition-opacity"
                style={{
                  background: isSelected ? 'rgba(29,78,216,0.1)' : '#111827',
                  border: `1px solid ${isSelected ? 'rgba(29,78,216,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  opacity: maxSelected ? 0.4 : 1,
                  cursor: maxSelected ? 'default' : 'pointer',
                }}
              >
                {inner}
              </button>
            )
          }

          return (
            <div
              key={lead.id}
              className="relative"
              onTouchStart={() => startLongPress(lead)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              <Link
                href={`/leads/${lead.id}`}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {inner}
              </Link>
            </div>
          )
        })}
      </div>

      {/* Merge CTA bar — visible when exactly 2 selected */}
      <AnimatePresence>
        {selectionMode && selectedIds.length === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-4 right-4 z-50 rounded-2xl p-4 flex items-center justify-between gap-3"
            style={{
              bottom: 88,
              background: 'linear-gradient(135deg, #1D4ED8, #0369A1)',
              boxShadow: '0 8px 32px rgba(29,78,216,0.45)',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            <div>
              <p className="text-sm font-bold text-white">2 leads selected</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Ready to merge</p>
            </div>
            <button
              onClick={triggerMerge}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
            >
              Merge →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merge overlay */}
      <AnimatePresence>
        {mergeLeads && (
          <LeadMerge
            primaryLead={mergeLeads[0]}
            initialSecondaryLead={mergeLeads[1]}
            onClose={() => setMergeLeads(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
