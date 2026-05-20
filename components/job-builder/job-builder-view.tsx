'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculateJob } from '@/lib/job-calculator'
import type { JobTypeConfig, JobCalculatorResult } from '@/lib/job-calculator'

// ─── Types ────────────────────────────────────────────────────────────────────

type Job = Record<string, any>

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:  { bg: 'rgba(107,114,128,0.2)', text: '#9CA3AF' },
  sent:   { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
  signed: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

// ─── Pricing Row ──────────────────────────────────────────────────────────────

function PriceRow({ label, value, accent, dim, bold }: {
  label: string; value: string
  accent?: boolean; dim?: boolean; bold?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: dim ? '#6B7280' : '#9CA3AF', fontWeight: bold ? 600 : undefined }}>{label}</span>
      <span style={{
        color: accent ? '#34D399' : dim ? '#9CA3AF' : '#F9FAFB',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: bold ? 700 : undefined,
      }}>{value}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobBuilderView({ job, showSavedToast }: { job: Job; showSavedToast?: boolean }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [toast, setToast] = useState(showSavedToast ? 'Job saved' : null as string | null)

  // Auto-dismiss toast
  useState(() => {
    if (showSavedToast) {
      const t = setTimeout(() => setToast(null), 2500)
      return () => clearTimeout(t)
    }
  })

  const snapshot: JobTypeConfig | null = job.job_type_snapshot ?? null
  const pd = (job.pricing_data && (job.pricing_data as any).source === 'job_builder') ? job.pricing_data as any : null
  const calcResult: JobCalculatorResult | null = pd?.calculator_result ?? job.calculator_result ?? null
  const basePrice: number | null = pd?.base_price ?? null
  const enabledTierIds: string[] = pd?.enabled_tier_ids ?? []
  const cashEnabled: boolean = pd?.cash_enabled ?? false
  const financingId: string | null = pd?.financing_id ?? null
  const rebateEnabled: boolean = pd?.rebate_enabled ?? false
  const rebateTierIds: string[] = pd?.rebate_tier_ids ?? []

  const sc = STATUS_COLORS[job.status] ?? STATUS_COLORS.draft
  const name = [job.customer_first_name, job.customer_last_name].filter(Boolean).join(' ') || job.customer_name || 'Unknown'

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/job-builder/${job.id}`, { method: 'DELETE' })
      router.push('/job-builder')
    } finally {
      setDeleting(false)
    }
  }

  const setStatus = async (status: string) => {
    setUpdatingStatus(true)
    try {
      await fetch(`/api/job-builder/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...job, status }),
      })
      router.refresh()
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-10 max-w-2xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399', backdropFilter: 'blur(8px)' }}>
          {toast}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/job-builder"
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" style={{ color: '#F9FAFB' }}>{name}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {snapshot && (
              <span className="text-xs" style={{ color: '#6B7280' }}>{snapshot.icon} {snapshot.name}</span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
              style={{ background: sc.bg, color: sc.text }}>{job.status}</span>
            <span className="text-xs" style={{ color: '#4B5563' }}>
              {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Link href={`/job-builder/new?id=${job.id}`}
          className="flex-1 min-w-[80px] h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.08)' }}>
          ✏️ Edit
        </Link>
        <Link href={`/proposals/${job.id}/present`}
          className="flex-1 min-w-[80px] h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)' }}>
          👁 Present
        </Link>
        <a href={`/api/proposals/${job.id}/pdf`} target="_blank" rel="noreferrer"
          className="flex-1 min-w-[80px] h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.2)' }}>
          📄 PDF
        </a>
        <button type="button" onClick={() => setConfirmDelete(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          🗑
        </button>
      </div>

      {/* Status actions */}
      {job.status === 'draft' && (
        <div className="mb-6">
          <button type="button" onClick={() => setStatus('sent')} disabled={updatingStatus}
            className="w-full h-11 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.2)' }}>
            📧 Mark as Sent
          </button>
        </div>
      )}
      {job.status === 'sent' && (
        <div className="mb-6 flex gap-3">
          <button type="button" onClick={() => setStatus('signed')} disabled={updatingStatus}
            className="flex-1 h-11 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}>
            ✅ Mark as Signed
          </button>
          <button type="button" onClick={() => setStatus('draft')} disabled={updatingStatus}
            className="flex-1 h-11 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
            ↩ Back to Draft
          </button>
        </div>
      )}

      {/* Customer info */}
      <div className="rounded-2xl p-4 mb-4 space-y-2"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Customer</p>
        <p className="text-base font-semibold" style={{ color: '#F9FAFB' }}>{name}</p>
        {job.customer_address && (
          <p className="text-sm" style={{ color: '#9CA3AF' }}>{job.customer_address}</p>
        )}
        <div className="flex gap-4 flex-wrap">
          {job.customer_phone && (
            <a href={`tel:${job.customer_phone}`} className="text-sm" style={{ color: '#60A5FA' }}>
              📞 {job.customer_phone}
            </a>
          )}
          {job.customer_email && (
            <a href={`mailto:${job.customer_email}`} className="text-sm" style={{ color: '#60A5FA' }}>
              ✉️ {job.customer_email}
            </a>
          )}
        </div>
      </div>

      {/* Pricing summary */}
      {calcResult && snapshot && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Pricing</p>
          </div>
          <div className="p-4 space-y-2">
            <PriceRow label="Base Price" value={fmt(calcResult.base_price)} />
            {calcResult.tiers_applied.map(t => (
              <PriceRow key={t.id} label={`${t.name} (${t.pct}%)`} value={`-${fmt(t.amount)}`} dim />
            ))}
            {calcResult.hidden_tier_amount > 0 && (
              <PriceRow label="Additional Discount" value={`-${fmt(calcResult.hidden_tier_amount)}`} dim />
            )}
            {calcResult.cash_discount > 0 && (
              <PriceRow label={`Cash Incentive (${snapshot.cash_incentive?.pct ?? 0}%)`} value={`-${fmt(calcResult.cash_discount)}`} dim />
            )}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <PriceRow label="Subtotal" value={fmt(calcResult.subtotal)} />
            <PriceRow label="Admin Fee" value={`+${fmt(calcResult.admin_fee)}`} />
            {calcResult.financing_fee > 0 && (
              <PriceRow label="Financing Fee" value={`+${fmt(calcResult.financing_fee)}`} />
            )}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold" style={{ color: '#F9FAFB' }}>CUSTOMER PRICE</span>
              <span className="text-2xl font-black" style={{ color: '#06B6D4', fontFamily: "'JetBrains Mono', monospace" }}>
                {fmt(calcResult.customer_price)}
              </span>
            </div>
            {calcResult.monthly_payment && (
              <p className="text-xs text-right" style={{ color: '#9CA3AF' }}>
                Monthly: ${calcResult.monthly_payment.toLocaleString()}/mo
              </p>
            )}
            {calcResult.rebates && calcResult.total_rebate !== null && calcResult.total_rebate > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Rebate</p>
                {calcResult.rebates.filter(r => r.amount > 0).map(r => (
                  <PriceRow key={r.id} label={r.name} value={fmt(r.amount)} accent />
                ))}
                <PriceRow label="Total Rebate" value={fmt(calcResult.total_rebate)} accent bold />
              </>
            )}
          </div>
        </div>
      )}

      {/* Discount config */}
      {pd && snapshot && (
        <div className="rounded-2xl p-4 mb-4 space-y-1.5"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Configuration</p>
          {snapshot.discount_tiers?.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-sm">
              <span style={{ color: enabledTierIds.includes(t.id) ? '#34D399' : '#4B5563' }}>
                {enabledTierIds.includes(t.id) ? '✓' : '○'}
              </span>
              <span style={{ color: enabledTierIds.includes(t.id) ? '#D1D5DB' : '#6B7280' }}>
                {t.name} ({t.pct}%)
              </span>
            </div>
          ))}
          {cashEnabled && (
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#34D399' }}>✓</span>
              <span style={{ color: '#D1D5DB' }}>Cash incentive applied</span>
            </div>
          )}
          {financingId && (
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#60A5FA' }}>⚡</span>
              <span style={{ color: '#D1D5DB' }}>
                {(() => {
                  const fin: any = snapshot.financing_options?.find((f: any) => f.id === financingId)
                  return fin?.display_name ?? fin?.name ?? financingId
                })()}
              </span>
            </div>
          )}
          {rebateEnabled && (
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#A78BFA' }}>✓</span>
              <span style={{ color: '#D1D5DB' }}>
                {snapshot.rebate_program?.name ?? 'Rebate'} member
              </span>
            </div>
          )}
        </div>
      )}

      {/* Scope of work */}
      {job.scope_of_work && (
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Scope of Work</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: '#D1D5DB', lineHeight: 1.6 }}>{job.scope_of_work}</p>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="fixed left-4 right-4 z-[210] rounded-2xl p-6"
            style={{ top: '50%', transform: 'translateY(-50%)', background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', maxWidth: 400, margin: '0 auto' }}>
            <h3 className="text-lg font-bold mb-2 text-center" style={{ color: '#F9FAFB' }}>Delete this job?</h3>
            <p className="text-sm mb-6 text-center" style={{ color: '#9CA3AF' }}>
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                className="flex-1 h-12 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-12 rounded-xl text-sm font-semibold"
                style={{ background: deleting ? 'rgba(239,68,68,0.4)' : '#EF4444', color: '#fff' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
