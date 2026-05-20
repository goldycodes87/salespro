'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

type Job = {
  id: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_name: string | null
  status: string
  your_price: number | null
  base_price: number | null
  job_type_snapshot: { name: string; icon?: string } | null
  created_at: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:  { bg: 'rgba(107,114,128,0.2)', text: '#9CA3AF' },
  sent:   { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  signed: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

const STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Signed'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

function JobCard({ job, i, onDelete }: { job: Job; i: number; onDelete: () => void }) {
  const sc = STATUS_COLORS[job.status] ?? STATUS_COLORS.draft
  const name = [job.customer_first_name, job.customer_last_name].filter(Boolean).join(' ') || job.customer_name || 'Unknown'
  const icon = job.job_type_snapshot?.icon ?? '📋'
  const typeName = job.job_type_snapshot?.name ?? 'Job'
  const date = new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
      <Link href={`/job-builder/${job.id}`} className="flex items-center gap-3 p-4 min-w-0">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {icon}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#F9FAFB' }}>{name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: '#6B7280' }}>{typeName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
              style={{ background: sc.bg, color: sc.text }}>{job.status}</span>
            <span className="text-xs" style={{ color: '#4B5563' }}>{date}</span>
          </div>
          {job.base_price != null && job.your_price != null && (
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              Base {fmt(job.base_price)}
              <span style={{ color: '#4B5563' }}> → </span>
              <span style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {fmt(job.your_price)}
              </span>
            </p>
          )}
        </div>
        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <Link href={`/job-builder/${job.id}`}
          className="flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.08)' }}>
          View
        </Link>
        <Link href={`/job-builder/new?id=${job.id}`}
          className="flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center"
          style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}>
          Edit
        </Link>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          🗑
        </button>
      </div>
    </motion.div>
  )
}

export default function JobBuilderList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('All')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/job-builder')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setJobs(data) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    filter === 'All' ? jobs : jobs.filter(j => j.status === filter.toLowerCase()),
    [jobs, filter]
  )

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await fetch(`/api/job-builder/${pendingDelete}`, { method: 'DELETE' })
      setJobs(prev => prev.filter(j => j.id !== pendingDelete))
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="px-4 pt-14 pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Jobs</h1>
        <Link href="/job-builder/new"
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      {/* Stats */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: String(jobs.length) },
            { label: 'Signed', value: String(jobs.filter(j => j.status === 'signed').length) },
            { label: 'Revenue', value: '$' + Math.round(jobs.filter(j => j.status === 'signed').reduce((s, j) => s + (j.your_price ?? 0), 0)).toLocaleString() },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xl font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-shrink-0 px-4 h-9 rounded-xl text-sm font-medium"
            style={{
              background: filter === f ? '#1D4ED8' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#fff' : '#9CA3AF',
              border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-4xl mb-4">🔨</div>
          <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>
            {filter === 'All' ? 'No jobs yet. Tap + New Job to start.' : `No ${filter.toLowerCase()} jobs`}
          </p>
          {filter === 'All' && (
            <Link href="/job-builder/new" className="text-xs font-semibold" style={{ color: '#60A5FA' }}>
              + New Job →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job, i) => (
            <JobCard key={job.id} job={job} i={i} onDelete={() => setPendingDelete(job.id)} />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setPendingDelete(null) }}>
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl p-6 mb-8"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}>
              <h2 className="text-lg font-bold mb-2 text-center" style={{ color: '#F9FAFB' }}>Delete Job?</h2>
              <p className="text-sm mb-5 text-center" style={{ color: '#6B7280' }}>
                This job will be removed from your list.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPendingDelete(null)}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#9CA3AF', background: 'transparent' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold"
                  style={{ background: deleting ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.9)', color: '#fff' }}>
                  {deleting ? '…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
