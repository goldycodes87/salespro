'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

type Proposal = {
  id: string
  customer_name: string
  customer_first_name: string | null
  customer_last_name: string | null
  type: string
  status: string
  your_price: number
  lead_id: string | null
  created_at: string
}

const STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Signed'] as const
type Filter = typeof STATUS_FILTERS[number]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:  { bg: 'rgba(107,114,128,0.2)', text: '#9CA3AF' },
  sent:   { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  signed: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  windows: { bg: 'rgba(29,78,216,0.15)', text: '#60A5FA' },
  siding:  { bg: 'rgba(6,182,212,0.15)', text: '#22D3EE' },
  both:    { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

export default function ProposalsPage() {
  const [filter, setFilter] = useState<Filter>('All')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const status = filter === 'All' ? 'all' : filter.toLowerCase()
    setLoading(true)
    fetch(`/api/proposals?status=${status}`)
      .then(r => r.json())
      .then(data => {
        setProposals(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filter])

  const counts = {
    signed: proposals.filter(p => p.status === 'signed').length,
    total: proposals.length,
    revenue: proposals.filter(p => p.status === 'signed').reduce((s, p) => s + (p.your_price ?? 0), 0),
  }

  return (
    <div className="px-4 pt-14 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Proposals</h1>
        <Link href="/proposals/new"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      {/* Stats strip */}
      {filter === 'All' && !loading && proposals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: counts.total.toString() },
            { label: 'Booked', value: counts.signed.toString() },
            { label: 'Revenue', value: fmt(counts.revenue) },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xl font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-shrink-0 px-4 h-9 rounded-xl text-sm font-medium transition-all"
            style={{
              background: filter === f ? '#1D4ED8' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#fff' : '#9CA3AF',
              border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-20 animate-pulse"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>No proposals yet</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>Tap + to create your first proposal</p>
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((p, i) => {
            const name = [p.customer_first_name, p.customer_last_name].filter(Boolean).join(' ')
              || p.customer_name || 'Unknown'
            const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft
            const tc = TYPE_COLORS[p.type] ?? TYPE_COLORS.windows
            const date = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/proposals/${p.id}`}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase"
                        style={{ background: tc.bg, color: tc.text }}>{p.type}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase"
                        style={{ background: sc.bg, color: sc.text }}>{p.status}</span>
                      <span className="text-xs" style={{ color: '#6B7280' }}>{date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmt(p.your_price ?? 0)}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
