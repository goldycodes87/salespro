'use client'

import { useState, useEffect } from 'react'
import { formatFinancingName } from '@/lib/job-calculator'

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountTier = {
  id: string
  name: string
  pct: number
  visible: boolean
  enabled: boolean
  position: number
}

type HiddenTier = { enabled: boolean; pct: number }
type CashIncentive = { enabled: boolean; pct: number; label: string }

type FinancingOpt = {
  id: string
  rate_pct: number
  term_months: number
  fee_pct: number
  display_name: string
  show_after_tier: number
  is_special_case?: boolean
}

type RebateTier = {
  id: string
  name: string
  type: 'pct_of_price' | 'pct_of_charged' | 'fixed'
  value: number
  cap?: number
  base: string
}

type RebateProgram = { enabled: boolean; name: string; tiers: RebateTier[] }

type JobTypeConfig = {
  id: string
  rep_id: string
  name: string
  icon: string
  pricing_model: 'financed_down' | 'cash_up'
  admin_fee: number
  max_discount_pct: number
  cash_incentive: CashIncentive
  discount_tiers: DiscountTier[]
  hidden_tier: HiddenTier
  financing_options: FinancingOpt[]
  rebate_program: RebateProgram
  is_default: boolean
}

type Draft = Omit<JobTypeConfig, 'id' | 'rep_id'>

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const BASE_INPUT: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '10px',
  color: '#F9FAFB',
  width: '100%',
  height: '38px',
  padding: '0 10px',
  fontSize: '13px',
  outline: 'none',
}

function SI({
  value, onChange, placeholder, type = 'text', style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  const numStyles: React.CSSProperties = type === 'number'
    ? { fontSize: '16px', padding: '8px 12px', minWidth: '80px', height: 'auto', textAlign: 'center' }
    : {}
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...BASE_INPUT,
        ...numStyles,
        ...(focused ? { border: '1px solid rgba(29,78,216,0.5)', background: 'rgba(29,78,216,0.08)' } : {}),
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Tog({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className="relative flex-shrink-0 cursor-pointer" style={{ width: '36px', height: '22px' }}>
      <div className="absolute inset-0 rounded-full" style={{ background: on ? '#1D4ED8' : 'rgba(255,255,255,0.12)', transition: 'background 0.2s' }} />
      <div className="absolute top-[2px] rounded-full" style={{ width: '18px', height: '18px', background: '#fff', left: on ? '16px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.2s' }} />
    </div>
  )
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
      {children}
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>{title}</p>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

const ICONS = ['🪟', '🏠', '🏗', '🔨', '❄️', '☀️', '🌿', '💧', '⚡']

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-11 h-10 rounded-xl text-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
        {value || '📋'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 rounded-xl p-2 flex flex-wrap"
            style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: 208 }}>
            {ICONS.map(e => (
              <button key={e} type="button" onClick={() => { onChange(e); setOpen(false) }}
                className="w-10 h-10 rounded-lg text-xl flex items-center justify-center"
                style={{ background: value === e ? 'rgba(29,78,216,0.2)' : 'transparent' }}>
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Empty Draft ──────────────────────────────────────────────────────────────

function emptyDraft(): Draft {
  return {
    name: '',
    icon: '🪟',
    pricing_model: 'financed_down',
    admin_fee: 850,
    max_discount_pct: 37,
    cash_incentive: { enabled: false, pct: 7, label: 'Cash Incentive' },
    discount_tiers: [],
    hidden_tier: { enabled: false, pct: 0 },
    financing_options: [],
    rebate_program: { enabled: false, name: '', tiers: [] },
    is_default: false,
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobTypesTab() {
  const [configs, setConfigs] = useState<JobTypeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/settings/job-types')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConfigs(data) })
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const openCreate = () => {
    setEditingId(null)
    setDraft(emptyDraft())
    setShowModal(true)
  }

  const openEdit = (c: JobTypeConfig) => {
    setEditingId(c.id)
    setDraft({
      name: c.name,
      icon: c.icon ?? '📋',
      pricing_model: c.pricing_model,
      admin_fee: c.admin_fee ?? 0,
      max_discount_pct: c.max_discount_pct ?? 37,
      cash_incentive: c.cash_incentive ?? { enabled: false, pct: 7, label: 'Cash Incentive' },
      discount_tiers: c.discount_tiers ?? [],
      hidden_tier: c.hidden_tier ?? { enabled: false, pct: 0 },
      financing_options: c.financing_options ?? [],
      rebate_program: c.rebate_program ?? { enabled: false, name: '', tiers: [] },
      is_default: c.is_default ?? false,
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const isNew = !editingId
      const res = await fetch(
        isNew ? '/api/settings/job-types' : `/api/settings/job-types/${editingId}`,
        { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setConfigs(prev => isNew ? [...prev, data] : prev.map(c => c.id === editingId ? data : c))
      setShowModal(false)
      showToast('Job type saved')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/job-types/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Failed to archive')
      setConfigs(prev => prev.filter(c => c.id !== id))
      setConfirmDeleteId(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const setDefault = async (id: string) => {
    const config = configs.find(c => c.id === id)
    if (!config) return
    const { id: _id, rep_id: _rep, created_at: _ca, ...rest } = config as any
    const res = await fetch(`/api/settings/job-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, is_default: true }),
    })
    if (res.ok) setConfigs(prev => prev.map(c => ({ ...c, is_default: c.id === id })))
  }

  // Draft updater
  const setD = (fn: (d: Draft) => Draft) => setDraft(prev => fn(prev))

  const updateTier = (idx: number, u: Partial<DiscountTier>) =>
    setD(d => ({ ...d, discount_tiers: d.discount_tiers.map((t, i) => i === idx ? { ...t, ...u } : t) }))

  const moveTier = (idx: number, dir: -1 | 1) =>
    setD(d => {
      const ts = [...d.discount_tiers]
      const target = idx + dir
      if (target < 0 || target >= ts.length) return d
      ;[ts[idx], ts[target]] = [ts[target], ts[idx]]
      return { ...d, discount_tiers: ts.map((t, i) => ({ ...t, position: i })) }
    })

  const removeTier = (idx: number) =>
    setD(d => ({ ...d, discount_tiers: d.discount_tiers.filter((_, i) => i !== idx) }))

  const addTier = () =>
    setD(d => ({
      ...d,
      discount_tiers: [...d.discount_tiers, {
        id: `tier_${Date.now()}`, name: 'Discount', pct: 0,
        visible: true, enabled: true, position: d.discount_tiers.length,
      }],
    }))

  const updateFin = (idx: number, u: Partial<FinancingOpt>) =>
    setD(d => ({ ...d, financing_options: d.financing_options.map((f, i) => i === idx ? { ...f, ...u } : f) }))

  const removeFin = (idx: number) =>
    setD(d => ({ ...d, financing_options: d.financing_options.filter((_, i) => i !== idx) }))

  const addFin = () =>
    setD(d => ({
      ...d,
      financing_options: [...d.financing_options, {
        id: `fin_${Date.now()}`,
        rate_pct: 0,
        term_months: 24,
        fee_pct: 0,
        display_name: formatFinancingName(0, 24),
        show_after_tier: 2,
      }],
    }))

  const updateRebateTier = (idx: number, u: Partial<RebateTier>) =>
    setD(d => ({ ...d, rebate_program: { ...d.rebate_program, tiers: d.rebate_program.tiers.map((t, i) => i === idx ? { ...t, ...u } : t) } }))

  const removeRebateTier = (idx: number) =>
    setD(d => ({ ...d, rebate_program: { ...d.rebate_program, tiers: d.rebate_program.tiers.filter((_, i) => i !== idx) } }))

  const addRebateTier = () =>
    setD(d => ({
      ...d,
      rebate_program: {
        ...d.rebate_program,
        tiers: [...d.rebate_program.tiers, {
          id: `reb_${Date.now()}`, name: '', type: 'pct_of_price' as const, value: 0, base: 'customer_price',
        }],
      },
    }))

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* List view */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>No job types configured</p>
          <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Add a job type to configure pricing per job category.</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.3)' }}>
            + Add Job Type
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {configs.map(config => (
              <div key={config.id} className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{config.icon ?? '📋'}</span>
                  <span className="text-base font-semibold" style={{ color: '#F9FAFB' }}>{config.name}</span>
                  {config.is_default && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.3)' }}>
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 mb-3">
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    {config.pricing_model === 'financed_down' ? 'Financed Down' : 'Cash Up'}
                  </p>
                  {config.discount_tiers?.length > 0 && (
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      Tiers: {config.discount_tiers.map(t => `${t.pct}%`).join(' + ')}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    {config.cash_incentive?.enabled ? `Cash: ${config.cash_incentive.pct}%` : 'No cash'} | Admin: ${(config.admin_fee ?? 0).toLocaleString()}
                  </p>
                  {config.rebate_program?.enabled && (
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Rebate: {config.rebate_program.name}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(config)} className="flex-1 h-9 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Edit
                  </button>
                  {!config.is_default && (
                    <button onClick={() => setDefault(config.id)} className="flex-1 h-9 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}>
                      Set Default
                    </button>
                  )}
                  <button onClick={() => setConfirmDeleteId(config.id)} className="w-9 h-9 rounded-xl text-sm flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={openCreate} className="w-full h-11 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', border: '1px dashed rgba(255,255,255,0.15)' }}>
            + Add Job Type
          </button>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399', backdropFilter: 'blur(8px)' }}>
          {toast}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (() => {
        const config = configs.find(c => c.id === confirmDeleteId)
        if (!config) return null
        return (
          <>
            <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => !deleting && setConfirmDeleteId(null)} />
            <div className="fixed left-4 right-4 z-[210] rounded-2xl p-6"
              style={{ top: '50%', transform: 'translateY(-50%)', background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', maxWidth: 400, margin: '0 auto' }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#F9FAFB' }}>Archive {config.name}?</h3>
              <p className="text-sm mb-6" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
                It will no longer appear in Job Builder. Any completed jobs using this type are preserved.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteId(null)} disabled={deleting} className="flex-1 h-12 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
                <button onClick={() => doDelete(confirmDeleteId)} disabled={deleting} className="flex-1 h-12 rounded-xl text-sm font-semibold"
                  style={{ background: deleting ? 'rgba(239,68,68,0.4)' : '#EF4444', color: '#fff' }}>
                  {deleting ? 'Archiving…' : 'Archive'}
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[250] overflow-y-auto" style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="min-h-full flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 flex-shrink-0"
              style={{ background: '#0A0F1E', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setShowModal(false)} className="text-sm" style={{ color: '#9CA3AF' }}>Cancel</button>
              <h2 className="text-base font-semibold" style={{ color: '#F9FAFB' }}>
                {editingId ? `Edit ${draft.name || 'Job Type'}` : 'New Job Type'}
              </h2>
              <button onClick={save} disabled={saving} className="text-sm font-semibold"
                style={{ color: saving ? '#4B5563' : '#60A5FA' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 px-4 py-4 space-y-4 max-w-2xl mx-auto w-full pb-16">

              {/* BASICS */}
              <Sec title="Basics">
                <Fld label="Name *">
                  <SI value={draft.name} onChange={v => setD(d => ({ ...d, name: v }))} placeholder="Windows" />
                </Fld>
                <Fld label="Icon">
                  <IconPicker value={draft.icon} onChange={v => setD(d => ({ ...d, icon: v }))} />
                </Fld>
                <Fld label="Pricing Model">
                  <div className="flex gap-2">
                    {(['financed_down', 'cash_up'] as const).map(model => (
                      <button key={model} type="button" onClick={() => setD(d => ({ ...d, pricing_model: model }))}
                        className="flex-1 h-10 rounded-xl text-xs font-semibold"
                        style={{
                          background: draft.pricing_model === model ? 'rgba(29,78,216,0.3)' : 'rgba(255,255,255,0.05)',
                          color: draft.pricing_model === model ? '#60A5FA' : '#9CA3AF',
                          border: `1px solid ${draft.pricing_model === model ? 'rgba(29,78,216,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        {model === 'financed_down' ? 'Financed Down' : 'Cash Up'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#4B5563' }}>
                    {draft.pricing_model === 'cash_up'
                      ? 'Cash price — financing adds fee on top'
                      : 'Price includes financing; cash gets incentive'}
                  </p>
                </Fld>
                <div className="flex gap-4">
                  <Fld label="Admin Fee">
                    <div className="flex items-center gap-1">
                      <span style={{ color: '#6B7280', fontSize: 13 }}>$</span>
                      <SI type="number" value={String(draft.admin_fee)} onChange={v => setD(d => ({ ...d, admin_fee: Number(v) }))} style={{ width: 90 }} />
                    </div>
                  </Fld>
                  <Fld label="Max Discount %">
                    <div className="flex items-center gap-1">
                      <SI type="number" value={String(draft.max_discount_pct)} onChange={v => setD(d => ({ ...d, max_discount_pct: Number(v) }))} style={{ width: 68 }} />
                      <span style={{ color: '#6B7280', fontSize: 13 }}>%</span>
                    </div>
                  </Fld>
                </div>
              </Sec>

              {/* DISCOUNT TIERS */}
              <Sec title="Discount Tiers">
                {draft.discount_tiers.length > 0 && (
                  <div className="space-y-2">
                    {draft.discount_tiers.map((tier, idx) => (
                      <div key={tier.id} className="rounded-xl p-3 space-y-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Line 1: enable toggle + reorder + name + delete */}
                        <div className="flex items-center gap-2">
                          <Tog on={tier.enabled !== false} onToggle={() => updateTier(idx, { enabled: !(tier.enabled !== false) })} />
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={() => moveTier(idx, -1)} disabled={idx === 0}
                              style={{ color: idx === 0 ? '#2D3748' : '#6B7280', fontSize: 9, lineHeight: 1 }}>▲</button>
                            <button type="button" onClick={() => moveTier(idx, 1)} disabled={idx === draft.discount_tiers.length - 1}
                              style={{ color: idx === draft.discount_tiers.length - 1 ? '#2D3748' : '#6B7280', fontSize: 9, lineHeight: 1 }}>▼</button>
                          </div>
                          <SI value={tier.name} onChange={v => updateTier(idx, { name: v })} placeholder="Tier name" style={{ flex: 1 }} />
                          <button type="button" onClick={() => removeTier(idx)} style={{ color: '#4B5563', fontSize: 14, flexShrink: 0 }}>🗑</button>
                        </div>
                        {/* Line 2: percentage + visible toggle */}
                        <div className="flex items-center gap-4 pl-10 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm" style={{ color: '#9CA3AF' }}>Percentage:</span>
                            <SI type="number" value={String(tier.pct)} onChange={v => updateTier(idx, { pct: Number(v) })} style={{ width: 80 }} />
                            <span style={{ color: '#6B7280', fontSize: 14 }}>%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Tog on={tier.visible !== false} onToggle={() => updateTier(idx, { visible: !(tier.visible !== false) })} />
                            <span className="text-sm" style={{ color: '#9CA3AF' }}>Visible to customer</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={addTier} className="text-xs font-medium" style={{ color: '#60A5FA' }}>
                  + Add Tier
                </button>

                {/* Hidden tier */}
                <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Tog on={draft.hidden_tier.enabled} onToggle={() => setD(d => ({ ...d, hidden_tier: { ...d.hidden_tier, enabled: !d.hidden_tier.enabled } }))} />
                    <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Enable hidden tier</span>
                    {draft.hidden_tier.enabled && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Percentage:</span>
                        <SI type="number" value={String(draft.hidden_tier.pct)} onChange={v => setD(d => ({ ...d, hidden_tier: { ...d.hidden_tier, pct: Number(v) } }))} style={{ width: 80 }} />
                        <span style={{ color: '#6B7280', fontSize: 14 }}>%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#4B5563' }}>
                    Applied automatically, never shown to customer or rep in presentation view
                  </p>
                </div>
              </Sec>

              {/* CASH INCENTIVE */}
              <Sec title="Cash Incentive">
                <div className="flex items-center gap-2">
                  <Tog on={draft.cash_incentive.enabled} onToggle={() => setD(d => ({ ...d, cash_incentive: { ...d.cash_incentive, enabled: !d.cash_incentive.enabled } }))} />
                  <span className="text-sm" style={{ color: '#D1D5DB' }}>Enable cash incentive</span>
                </div>
                {draft.cash_incentive.enabled && (
                  <div className="space-y-3 pt-1">
                    <Fld label="Label">
                      <SI value={draft.cash_incentive.label} onChange={v => setD(d => ({ ...d, cash_incentive: { ...d.cash_incentive, label: v } }))} placeholder="Cash Incentive" />
                    </Fld>
                    <Fld label="Percentage">
                      <div className="flex items-center gap-1">
                        <SI type="number" value={String(draft.cash_incentive.pct)} onChange={v => setD(d => ({ ...d, cash_incentive: { ...d.cash_incentive, pct: Number(v) } }))} style={{ width: 70 }} />
                        <span style={{ color: '#6B7280', fontSize: 13 }}>%</span>
                      </div>
                    </Fld>
                  </div>
                )}
              </Sec>

              {/* FINANCING OPTIONS */}
              <Sec title="Financing Options">
                {draft.pricing_model === 'financed_down' && (
                  <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>
                    No fees added — enter payment terms only.
                  </p>
                )}
                {draft.financing_options.length > 0 && (
                  <div className="space-y-3">
                    {draft.financing_options.map((fin, idx) => (
                      <div key={fin.id} className="rounded-xl p-3 space-y-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Line 1: name + delete */}
                        <div className="flex items-center gap-2">
                          {fin.is_special_case ? (
                            <SI value={fin.display_name} onChange={v => updateFin(idx, { display_name: v })}
                              placeholder="e.g. Cash / Check" style={{ flex: 1 }} />
                          ) : (
                            <p className="flex-1 text-sm font-medium truncate" style={{ color: '#D1D5DB' }}>
                              {fin.display_name || '—'}
                            </p>
                          )}
                          <button type="button" onClick={() => removeFin(idx)}
                            style={{ color: '#4B5563', fontSize: 14, flexShrink: 0 }}>🗑</button>
                        </div>
                        {/* Line 2: rate / term / fee inputs */}
                        {!fin.is_special_case ? (
                          <div className="flex items-center flex-wrap gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm" style={{ color: '#9CA3AF' }}>Rate:</span>
                              <SI type="number" value={String(fin.rate_pct ?? 0)}
                                onChange={v => {
                                  const rate = parseFloat(v) || 0
                                  updateFin(idx, { rate_pct: rate, display_name: formatFinancingName(rate, fin.term_months ?? 0) })
                                }}
                                style={{ width: 80 }} placeholder="0" />
                              <span className="text-sm" style={{ color: '#6B7280' }}>%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm" style={{ color: '#9CA3AF' }}>Term:</span>
                              <SI type="number" value={String(fin.term_months ?? 0)}
                                onChange={v => {
                                  const term = parseInt(v) || 0
                                  updateFin(idx, { term_months: term, display_name: formatFinancingName(fin.rate_pct ?? 0, term) })
                                }}
                                style={{ width: 80 }} placeholder="24" />
                              <span className="text-sm" style={{ color: '#6B7280' }}>mo</span>
                            </div>
                            {draft.pricing_model === 'cash_up' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm" style={{ color: '#9CA3AF' }}>Fee:</span>
                                <SI type="number" value={String(Number(((fin.fee_pct ?? 0) * 100).toFixed(2)))}
                                  onChange={v => updateFin(idx, { fee_pct: parseFloat(v) / 100 || 0 })}
                                  style={{ width: 80 }} placeholder="0" />
                                <span className="text-sm" style={{ color: '#6B7280' }}>%</span>
                              </div>
                            )}
                          </div>
                        ) : draft.pricing_model === 'cash_up' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm" style={{ color: '#9CA3AF' }}>Fee:</span>
                            <SI type="number" value={String(Number(((fin.fee_pct ?? 0) * 100).toFixed(2)))}
                              onChange={v => updateFin(idx, { fee_pct: parseFloat(v) / 100 || 0 })}
                              style={{ width: 80 }} placeholder="0" />
                            <span className="text-sm" style={{ color: '#6B7280' }}>%</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={addFin} className="text-xs font-medium" style={{ color: '#60A5FA' }}>
                  + Add Financing Option
                </button>
              </Sec>

              {/* REBATE PROGRAM */}
              <Sec title="Rebate Program">
                <div className="flex items-center gap-2">
                  <Tog on={draft.rebate_program.enabled} onToggle={() => setD(d => ({ ...d, rebate_program: { ...d.rebate_program, enabled: !d.rebate_program.enabled } }))} />
                  <span className="text-sm" style={{ color: '#D1D5DB' }}>Enable rebate program</span>
                </div>
                {draft.rebate_program.enabled && (
                  <div className="space-y-3 pt-1">
                    <Fld label="Program Name">
                      <SI value={draft.rebate_program.name} onChange={v => setD(d => ({ ...d, rebate_program: { ...d.rebate_program, name: v } }))} placeholder="Costco" />
                    </Fld>
                    {draft.rebate_program.tiers.length > 0 && (
                      <div className="space-y-2">
                        <div className="grid text-xs gap-1" style={{ gridTemplateColumns: '1fr 92px 48px 52px 28px', color: '#6B7280' }}>
                          <span>Name</span><span>Type</span><span>Val</span><span>Cap</span><span />
                        </div>
                        {draft.rebate_program.tiers.map((tier, idx) => (
                          <div key={tier.id} className="grid items-center gap-1" style={{ gridTemplateColumns: '1fr 92px 48px 52px 28px' }}>
                            <SI value={tier.name} onChange={v => updateRebateTier(idx, { name: v })} placeholder="Name" />
                            <select
                              value={tier.type}
                              onChange={e => updateRebateTier(idx, {
                                type: e.target.value as any,
                                base: e.target.value === 'pct_of_charged' ? 'charged_amount' : 'customer_price',
                              })}
                              style={{ ...BASE_INPUT, height: '38px', fontSize: '11px', padding: '0 6px' }}>
                              <option value="pct_of_price">% of price</option>
                              <option value="pct_of_charged">% charged</option>
                              <option value="fixed">Fixed</option>
                            </select>
                            <SI type="number" value={String(tier.value)} onChange={v => updateRebateTier(idx, { value: Number(v) })} placeholder="0" />
                            <SI type="number"
                              value={tier.cap != null ? String(tier.cap) : ''}
                              onChange={v => updateRebateTier(idx, { cap: v ? Number(v) : undefined })}
                              placeholder="—" />
                            <button type="button" onClick={() => removeRebateTier(idx)} style={{ color: '#4B5563', fontSize: 14, textAlign: 'center' }}>🗑</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={addRebateTier} className="text-xs font-medium" style={{ color: '#60A5FA' }}>
                      + Add Rebate Tier
                    </button>
                  </div>
                )}
              </Sec>

              {/* Bottom actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
                <button type="button" onClick={save} disabled={saving} className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{ background: saving ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff' }}>
                  {saving ? 'Saving…' : 'Save Job Type'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
