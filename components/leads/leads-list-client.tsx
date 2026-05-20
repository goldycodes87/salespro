'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmDanger,
  onCancel,
  onConfirm,
  loading,
}: {
  title: string
  body: string
  confirmLabel: string
  confirmDanger?: boolean
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="rounded-2xl p-6 w-full max-w-sm"
        style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-bold mb-2" style={{ color: '#F9FAFB' }}>{title}</h2>
        <p className="text-sm mb-6" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>{body}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl text-sm font-semibold"
            style={{
              background: confirmDanger ? '#EF4444' : '#1D4ED8',
              color: '#fff',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function LeadsListClient({
  leads,
  isTrash = false,
  showDeletedToast = false,
}: {
  leads: Lead[]
  isTrash?: boolean
  showDeletedToast?: boolean
}) {
  const router = useRouter()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mergeLeads, setMergeLeads] = useState<[Lead, Lead] | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null)
  const [confirmHardDelete, setConfirmHardDelete] = useState<Lead | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(showDeletedToast ? 'Lead moved to trash' : null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressDidFire = useRef(false)

  // Clear the ?deleted=1 query param and auto-hide toast
  useEffect(() => {
    if (toast) {
      if (showDeletedToast) {
        router.replace('/leads')
      }
      const t = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(t)
    }
  }, [toast]) // eslint-disable-line

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

  const softDelete = async (lead: Lead) => {
    setLoading(true)
    try {
      await fetch(`/api/leads/${lead.id}/delete`, { method: 'POST' })
      setConfirmDelete(null)
      setToast('Lead moved to trash')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const restore = async (lead: Lead) => {
    setLoading(true)
    try {
      await fetch(`/api/leads/${lead.id}/restore`, { method: 'POST' })
      setToast('Lead restored')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const hardDelete = async (lead: Lead) => {
    setLoading(true)
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: { 'X-Confirm-Delete': 'permanent' },
      })
      setConfirmHardDelete(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const bulkDelete = async () => {
    setLoading(true)
    try {
      await Promise.all(
        selectedIds.map(id => fetch(`/api/leads/${id}/delete`, { method: 'POST' })),
      )
      setConfirmBulkDelete(false)
      exitSelection()
      setToast(`${selectedIds.length} lead${selectedIds.length !== 1 ? 's' : ''} moved to trash`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const emptyLabel = isTrash ? 'Trash is empty' : 'No leads yet'
  const emptySubLabel = isTrash
    ? 'Deleted leads appear here for 14 days'
    : 'Add your first lead to get started'

  if (!leads.length) {
    return (
      <>
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            {isTrash ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )}
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>{emptyLabel}</p>
          <p className="text-xs mb-4" style={{ color: '#6B7280' }}>{emptySubLabel}</p>
          {!isTrash && (
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
          )}
        </div>
        <ToastBar toast={toast} />
      </>
    )
  }

  // ─── Trash view ───────────────────────────────────────────────────────────────

  if (isTrash) {
    return (
      <>
        <div className="space-y-2">
          {leads.map(lead => {
            const name = lead.is_married && lead.spouse_first_name
              ? `${lead.first_name} & ${lead.spouse_first_name} ${lead.last_name}`
              : `${lead.first_name} ${lead.last_name}`
            const days = lead.deleted_at ? daysAgo(lead.deleted_at) : 0
            return (
              <div
                key={lead.id}
                className="p-4 rounded-2xl"
                style={{ background: '#111827', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                  >
                    {lead.first_name[0]}{lead.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      {lead.city}, {lead.state}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
                      Deleted {days === 0 ? 'today' : `${days} day${days !== 1 ? 's' : ''} ago`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => restore(lead)}
                    disabled={loading}
                    className="flex-1 h-9 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmHardDelete(lead)}
                    disabled={loading}
                    className="flex-1 h-9 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <AnimatePresence>
          {confirmHardDelete && (
            <ConfirmModal
              title="Delete forever?"
              body={`"${confirmHardDelete.first_name} ${confirmHardDelete.last_name}" will be permanently deleted. This cannot be undone.`}
              confirmLabel="Delete Forever"
              confirmDanger
              onCancel={() => setConfirmHardDelete(null)}
              onConfirm={() => hardDelete(confirmHardDelete)}
              loading={loading}
            />
          )}
        </AnimatePresence>

        <ToastBar toast={toast} />
      </>
    )
  }

  // ─── Normal list view ─────────────────────────────────────────────────────────

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

      {/* Close any open menu when clicking outside */}
      {openMenuId && (
        <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
      )}

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
                onTouchStart={() => startLongPress(lead)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
              >
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
                    {lead.city}, {lead.state}{apptDate ? ` · ${apptDate}` : ''}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase flex-shrink-0" style={{ background: c.bg, color: c.text }}>
                  {lead.status}
                </span>
              </button>
            )
          }

          return (
            <div
              key={lead.id}
              className="relative flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
              onTouchStart={() => startLongPress(lead)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              {/* Clickable name/avatar area */}
              <Link
                href={`/leads/${lead.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
                onClick={() => { if (longPressDidFire.current) { longPressDidFire.current = false; return } }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA' }}
                >
                  {lead.first_name[0]}{lead.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
                    {lead.city}, {lead.state}{apptDate ? ` · ${apptDate}` : ''}
                  </p>
                  {lead.lead_source && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#4B5563' }}>{lead.lead_source}</p>
                  )}
                </div>
              </Link>

              {/* Status + kebab */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase" style={{ background: c.bg, color: c.text }}>
                  {lead.status}
                </span>
                <div className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === lead.id ? null : lead.id) }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold"
                    style={{ color: '#4B5563', lineHeight: 1 }}
                  >
                    ⋮
                  </button>
                  {openMenuId === lead.id && (
                    <div
                      className="absolute right-0 top-full mt-1 rounded-xl py-1 z-40 min-w-[160px]"
                      style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <Link
                        href={`/leads/${lead.id}`}
                        onClick={() => setOpenMenuId(null)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm"
                        style={{ color: '#D1D5DB' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        View Lead
                      </Link>
                      <button
                        onClick={() => { setOpenMenuId(null); setConfirmDelete(lead) }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left"
                        style={{ color: '#EF4444' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                        Delete Lead
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selection action bar */}
      <AnimatePresence>
        {selectionMode && selectedIds.length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-4 right-4 z-50 rounded-2xl p-4 flex items-center justify-between gap-3"
            style={{
              bottom: 88,
              background: '#1F2937',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: '#F9FAFB' }}>{selectedIds.length} selected</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                {selectedIds.length === 2 ? 'Merge or delete' : 'Ready to delete'}
              </p>
            </div>
            <div className="flex gap-2">
              {selectedIds.length === 2 && (
                <button
                  onClick={triggerMerge}
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(29,78,216,0.3)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.4)' }}
                >
                  Merge →
                </button>
              )}
              <button
                onClick={() => setConfirmBulkDelete(true)}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmModal
            title="Delete this lead?"
            body="This lead will be moved to trash and permanently deleted after 14 days."
            confirmLabel="Move to Trash"
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => softDelete(confirmDelete)}
            loading={loading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmBulkDelete && (
          <ConfirmModal
            title={`Delete ${selectedIds.length} lead${selectedIds.length !== 1 ? 's' : ''}?`}
            body="These leads will be moved to trash and permanently deleted after 14 days."
            confirmLabel="Move to Trash"
            onCancel={() => setConfirmBulkDelete(false)}
            onConfirm={bulkDelete}
            loading={loading}
          />
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

      <ToastBar toast={toast} />
    </>
  )
}

function ToastBar({ toast }: { toast: string | null }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
          className="fixed top-4 left-4 right-4 z-[300] flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: '#1F2937',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm font-medium" style={{ color: '#D1D5DB' }}>{toast}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
