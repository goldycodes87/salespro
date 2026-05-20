'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { calculateJob } from '@/lib/job-calculator'
import type { JobTypeConfig, JobCalculatorResult } from '@/lib/job-calculator'

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadResult = {
  id: string
  first_name: string
  last_name: string
  city?: string
  state?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}-${d.slice(3)}`
  return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`
}

const INPUT: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px',
  color: '#F9FAFB',
  width: '100%',
  height: '48px',
  padding: '0 14px',
  fontSize: '15px',
  outline: 'none',
}
const INPUT_FOCUS: React.CSSProperties = {
  background: 'rgba(29,78,216,0.08)',
  border: '1px solid rgba(29,78,216,0.5)',
}

function FInput({
  value, onChange, placeholder, type = 'text', style, error,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; style?: React.CSSProperties; error?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(type === 'tel' ? formatPhone(e.target.value) : e.target.value)}
        style={{ ...INPUT, ...(focused ? INPUT_FOCUS : {}), ...(error ? { border: '1px solid rgba(239,68,68,0.6)' } : {}), ...style }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}

function Fld({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

function Tog({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 cursor-pointer" onClick={onToggle}>
      <div className="relative flex-shrink-0" style={{ width: 40, height: 24 }}>
        <div className="absolute inset-0 rounded-full transition-colors" style={{ background: on ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
        <div className="absolute top-[3px] rounded-full transition-all" style={{ width: 18, height: 18, background: '#fff', left: on ? '19px' : '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: '#D1D5DB' }}>{label}</p>
        {sub && <p className="text-xs" style={{ color: '#6B7280' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Pricing Panel ────────────────────────────────────────────────────────────

function PricingPanel({ result, config }: { result: JobCalculatorResult | null; config: JobTypeConfig | null }) {
  if (!result || !config || result.base_price <= 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-sm" style={{ color: '#4B5563' }}>Enter a base price to see live pricing</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Live Pricing</p>
      </div>
      <div className="p-4 space-y-2">
        {/* Base price */}
        <div className="flex justify-between text-sm">
          <span style={{ color: '#9CA3AF' }}>Base Price</span>
          <span style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(result.base_price)}</span>
        </div>

        {/* Applied tiers */}
        {result.tiers_applied.map(t => (
          <div key={t.id} className="flex justify-between text-sm">
            <span style={{ color: '#9CA3AF' }}>{t.name} ({t.pct}%)</span>
            <span style={{ color: '#F87171', fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(t.amount)}</span>
          </div>
        ))}

        {/* Hidden tier */}
        {result.hidden_tier_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: '#9CA3AF' }}>Additional Discount</span>
            <span style={{ color: '#F87171', fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(result.hidden_tier_amount)}</span>
          </div>
        )}

        {/* Cash incentive */}
        {result.cash_discount > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: '#9CA3AF' }}>Cash Incentive ({config.cash_incentive.pct}%)</span>
            <span style={{ color: '#F87171', fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(result.cash_discount)}</span>
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span style={{ color: '#9CA3AF' }}>Subtotal</span>
          <span style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(result.subtotal)}</span>
        </div>

        {/* Admin fee */}
        <div className="flex justify-between text-sm">
          <span style={{ color: '#9CA3AF' }}>Admin Fee</span>
          <span style={{ color: '#D1D5DB', fontFamily: "'JetBrains Mono', monospace" }}>+{fmt(result.admin_fee)}</span>
        </div>

        {/* Financing fee */}
        {result.financing_fee > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: '#9CA3AF' }}>Financing Fee</span>
            <span style={{ color: '#D1D5DB', fontFamily: "'JetBrains Mono', monospace" }}>+{fmt(result.financing_fee)}</span>
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

        {/* Customer price */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold" style={{ color: '#F9FAFB' }}>CUSTOMER PRICE</span>
          <span className="text-xl font-black" style={{ color: '#06B6D4', fontFamily: "'JetBrains Mono', monospace" }}>
            {fmt(result.customer_price)}
          </span>
        </div>

        {/* Monthly payment */}
        {result.monthly_payment && (
          <p className="text-xs text-right" style={{ color: '#9CA3AF' }}>
            {fmt(result.monthly_payment).replace('$', '')}/mo monthly payment
          </p>
        )}

        {/* Rebates */}
        {result.rebates && result.rebates.length > 0 && result.total_rebate !== null && result.total_rebate > 0 && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Your Costco Rebate</p>
            {result.rebates.filter(r => r.amount > 0).map(r => (
              <div key={r.id} className="flex justify-between text-sm">
                <span style={{ color: '#9CA3AF' }}>{r.name}</span>
                <span style={{ color: '#34D399', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.amount)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: '#D1D5DB' }}>Total Rebate</span>
              <span style={{ color: '#34D399', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(result.total_rebate)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobBuilderForm({
  configs,
  existingJob,
  initialLeadId,
}: {
  configs: JobTypeConfig[]
  existingJob?: Record<string, any> | null
  initialLeadId?: string
}) {
  const router = useRouter()
  const ej = existingJob
  // For existing jobs, job builder fields are stored in pricing_data
  const ejPd = (ej?.pricing_data && (ej.pricing_data as any).source === 'job_builder') ? ej.pricing_data as any : null

  // Job type
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(
    ej?.job_type_config_id ?? (configs.length === 1 ? configs[0].id : null)
  )
  const selectedConfig = configs.find(c => c.id === selectedConfigId) ?? null

  // Customer
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<LeadResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [linkedLeadId, setLinkedLeadId] = useState<string | null>(ej?.lead_id ?? null)
  const [firstName, setFirstName] = useState(ej?.customer_first_name ?? '')
  const [lastName, setLastName] = useState(ej?.customer_last_name ?? '')
  const [address, setAddress] = useState(ej?.customer_address ?? '')
  const [phone, setPhone] = useState(ej?.customer_phone ?? '')
  const [email, setEmail] = useState(ej?.customer_email ?? '')

  // Pricing
  const [basePriceStr, setBasePriceStr] = useState(ejPd?.base_price ? String(ejPd.base_price) : '')
  const basePrice = parseFloat(basePriceStr) || 0
  const [scopeOfWork, setScopeOfWork] = useState(ej?.scope_of_work ?? '')

  // Discounts
  const [enabledTierIds, setEnabledTierIds] = useState<string[]>(() => {
    if (ejPd?.enabled_tier_ids) return ejPd.enabled_tier_ids
    const cfg = configs.length === 1 ? configs[0] : null
    return cfg ? cfg.discount_tiers.filter(t => t.enabled !== false).map(t => t.id) : []
  })
  const [cashEnabled, setCashEnabled] = useState(ejPd?.cash_enabled ?? false)

  // Financing
  const [financingId, setFinancingId] = useState<string | null>(ejPd?.financing_id ?? null)
  const [finDropOpen, setFinDropOpen] = useState(false)

  // Rebate
  const [rebateEnabled, setRebateEnabled] = useState(ejPd?.rebate_enabled ?? false)
  const [rebateTierIds, setRebateTierIds] = useState<string[]>(ejPd?.rebate_tier_ids ?? [])
  const [chargedAmount, setChargedAmount] = useState(ejPd?.charged_amount ? String(ejPd.charged_amount) : '')

  // UI
  const [pricePanelOpen, setPricePanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const finDropRef = useRef<HTMLDivElement>(null)

  // When config changes (and not editing), reset tier/rebate defaults
  useEffect(() => {
    if (ej) return
    if (!selectedConfig) return
    setEnabledTierIds(selectedConfig.discount_tiers.filter(t => t.enabled !== false).map(t => t.id))
    setFinancingId(null)
    setCashEnabled(false)
    setRebateEnabled(false)
    setRebateTierIds([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConfigId])

  // When rebateEnabled turns on, pre-select all rebate tiers
  useEffect(() => {
    if (rebateEnabled && selectedConfig && rebateTierIds.length === 0) {
      setRebateTierIds(selectedConfig.rebate_program.tiers.map(t => t.id))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebateEnabled])

  // Lead search debounce
  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); setShowDropdown(false); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leads/search?q=${encodeURIComponent(searchQ)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(Array.isArray(data) ? data : [])
          setShowDropdown(true)
        }
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (finDropRef.current && !finDropRef.current.contains(e.target as Node)) {
        setFinDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-fill lead when navigating from lead detail page
  useEffect(() => {
    if (!initialLeadId || ej) return
    fetch(`/api/leads/${initialLeadId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setLinkedLeadId(data.id)
        setSearchQ(`${data.first_name} ${data.last_name}`)
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setAddress(data.address ?? '')
        setPhone(data.phone ? formatPhone(data.phone) : '')
        setEmail(data.email ?? '')
      })
      .catch(() => {})
  }, [initialLeadId]) // eslint-disable-line

  const handleSelectLead = async (lead: LeadResult) => {
    setLinkedLeadId(lead.id)
    setSearchQ(`${lead.first_name} ${lead.last_name}`)
    setShowDropdown(false)
    try {
      const res = await fetch(`/api/leads/${lead.id}`)
      if (res.ok) {
        const data = await res.json()
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setAddress(data.address ?? '')
        setPhone(data.phone ? formatPhone(data.phone) : '')
        setEmail(data.email ?? '')
      }
    } catch {}
  }

  // Live pricing calculation
  const calcResult = useMemo((): JobCalculatorResult | null => {
    if (!selectedConfig || basePrice <= 0) return null
    const calcConfig = {
      ...selectedConfig,
      rebate_program: {
        ...selectedConfig.rebate_program,
        enabled: rebateEnabled && selectedConfig.rebate_program?.enabled,
        tiers: (selectedConfig.rebate_program?.tiers ?? []).filter(t => rebateTierIds.includes(t.id)),
      },
    }
    return calculateJob(calcConfig, {
      base_price: basePrice,
      enabled_tier_ids: enabledTierIds,
      cash_enabled: cashEnabled,
      financing_id: financingId,
      charged_amount: parseFloat(chargedAmount) || 0,
    })
  }, [selectedConfig, basePrice, enabledTierIds, cashEnabled, financingId, rebateEnabled, rebateTierIds, chargedAmount])

  const toggleTier = (id: string) => {
    setEnabledTierIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleRebateTier = (id: string) => {
    setRebateTierIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const hasPctOfCharged = selectedConfig?.rebate_program?.tiers?.some(
    t => t.type === 'pct_of_charged' && rebateTierIds.includes(t.id)
  ) ?? false

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleSave = async () => {
    const errs: Record<string, string> = {}
    if (!selectedConfigId) errs.jobType = 'Select a job type'
    if (!basePrice || basePrice <= 0) errs.basePrice = 'Enter a base price'
    if (!firstName.trim()) errs.firstName = 'First name required'
    if (!lastName.trim()) errs.lastName = 'Last name required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})

    setSaving(true)
    try {
      const body = {
        job_type_config_id: selectedConfigId,
        job_type_snapshot: selectedConfig,
        customer_first_name: firstName.trim(),
        customer_last_name: lastName.trim(),
        customer_address: address.trim() || null,
        customer_phone: phone || null,
        customer_email: email.trim() || null,
        lead_id: linkedLeadId,
        base_price: basePrice,
        scope_of_work: scopeOfWork.trim() || null,
        enabled_tier_ids: enabledTierIds,
        cash_enabled: cashEnabled,
        financing_id: financingId,
        charged_amount: parseFloat(chargedAmount) || null,
        rebate_enabled: rebateEnabled,
        rebate_tier_ids: rebateTierIds,
        calculator_result: calcResult,
        status: 'draft',
      }

      const isEdit = !!ej?.id
      const res = await fetch(
        isEdit ? `/api/job-builder/${ej.id}` : '/api/job-builder',
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')

      const savedId = ej?.id ?? data.id
      router.push(`/job-builder/${savedId}?saved=1`)
    } catch (err: any) {
      alert(err.message)
      setSaving(false)
    }
  }

  const visibleTiers = selectedConfig?.discount_tiers.filter(t => t.visible !== false) ?? []
  const hasTiersEnabled = enabledTierIds.length > 0

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399', backdropFilter: 'blur(8px)' }}>
          {toast}
        </div>
      )}

      {/* Two-column layout on desktop */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* ── LEFT: Form ── */}
        <div className="flex-1 min-w-0 pb-48 lg:pb-12">

          {/* SECTION 1: Job Type */}
          <Sec title="Select Job Type">
            {errors.jobType && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.jobType}</p>}
            {configs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm mb-2" style={{ color: '#9CA3AF' }}>No job types configured.</p>
                <a href="/settings?tab=jobtypes" className="text-sm font-semibold" style={{ color: '#60A5FA' }}>
                  Go to Settings → Job Types →
                </a>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(configs.length, 3)}, 1fr)` }}>
                {configs.map(config => {
                  const selected = selectedConfigId === config.id
                  return (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => setSelectedConfigId(config.id)}
                      className="rounded-2xl p-4 text-center transition-all"
                      style={{
                        background: selected ? 'rgba(29,78,216,0.15)' : 'rgba(255,255,255,0.03)',
                        border: selected ? '2px solid rgba(29,78,216,0.6)' : '1px solid rgba(255,255,255,0.08)',
                      }}>
                      <div className="text-3xl mb-2">{config.icon ?? '📋'}</div>
                      <p className="text-sm font-semibold" style={{ color: selected ? '#60A5FA' : '#F9FAFB' }}>{config.name}</p>
                      <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                        {config.pricing_model === 'financed_down' ? 'Financed ↓' : 'Cash Up ↑'}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </Sec>

          {/* SECTION 2: Customer */}
          <Sec title="Customer Information">
            {/* Lead search */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base" style={{ color: '#6B7280' }}>🔍</span>
                <input
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search existing leads..."
                  style={{ ...INPUT, paddingLeft: '40px' }}
                />
              </div>
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 z-50 rounded-2xl overflow-hidden"
                  style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  {searchResults.map(lead => (
                    <button key={lead.id} type="button" onClick={() => handleSelectLead(lead)}
                      className="w-full text-left px-4 py-3 text-sm transition-colors"
                      style={{ color: '#F9FAFB', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {lead.first_name} {lead.last_name}
                      {lead.city && <span style={{ color: '#6B7280' }}> — {lead.city}, {lead.state}</span>}
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && searchResults.length === 0 && searchQ.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 z-50 rounded-2xl px-4 py-3"
                  style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-sm" style={{ color: '#6B7280' }}>No leads found</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Fld label="First Name" required>
                <FInput value={firstName} onChange={setFirstName} placeholder="John" error={errors.firstName} />
              </Fld>
              <Fld label="Last Name" required>
                <FInput value={lastName} onChange={setLastName} placeholder="Smith" error={errors.lastName} />
              </Fld>
            </div>
            <Fld label="Address">
              <FInput value={address} onChange={setAddress} placeholder="123 Main St" />
            </Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Phone">
                <FInput value={phone} onChange={setPhone} placeholder="303-555-1234" type="tel" />
              </Fld>
              <Fld label="Email">
                <FInput value={email} onChange={setEmail} placeholder="john@example.com" type="email" />
              </Fld>
            </div>
          </Sec>

          {/* SECTION 3: Base Price */}
          <Sec title="Base Price">
            <Fld label="Package Price" required>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold" style={{ color: '#6B7280' }}>$</span>
                <input
                  type="number"
                  value={basePriceStr}
                  onChange={e => setBasePriceStr(e.target.value)}
                  placeholder="0"
                  min={0}
                  style={{ ...INPUT, flex: 1, ...(errors.basePrice ? { border: '1px solid rgba(239,68,68,0.6)' } : {}) }}
                />
              </div>
              {errors.basePrice && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.basePrice}</p>}
              <p className="text-xs mt-1.5" style={{ color: '#4B5563' }}>Enter price before any discounts or admin fee</p>
            </Fld>

            <Fld label="Scope of Work">
              <textarea
                value={scopeOfWork}
                onChange={e => setScopeOfWork(e.target.value)}
                placeholder="Describe what's included in this project..."
                rows={3}
                style={{
                  ...INPUT,
                  height: 'auto',
                  padding: '12px 14px',
                  resize: 'vertical',
                  lineHeight: '1.5',
                }}
              />
              <p className="text-xs mt-1" style={{ color: '#4B5563' }}>Appears on PDF and email. Not shown in presentation.</p>
            </Fld>
          </Sec>

          {/* SECTION 4: Discounts — only show if config selected */}
          {selectedConfig && (
            <Sec title="Discounts">
              {visibleTiers.length === 0 ? (
                <p className="text-sm" style={{ color: '#6B7280' }}>No discount tiers configured for this job type.</p>
              ) : (
                <div className="space-y-3">
                  {visibleTiers.map(tier => (
                    <Tog
                      key={tier.id}
                      on={enabledTierIds.includes(tier.id)}
                      onToggle={() => toggleTier(tier.id)}
                      label={`${tier.name} (${tier.pct}%)`}
                    />
                  ))}
                </div>
              )}

              {selectedConfig.cash_incentive?.enabled && (
                <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <Tog
                    on={cashEnabled}
                    onToggle={() => setCashEnabled((v: boolean) => !v)}
                    label={`${
                      selectedConfig.pricing_model === 'financed_down'
                        ? 'Cash / Check Payment'
                        : 'Cash Price'
                    } (${selectedConfig.cash_incentive.pct}%)`}
                    sub={selectedConfig.pricing_model === 'financed_down'
                      ? 'Customer pays in full by cash, check, or credit card'
                      : 'No financing fee applied'}
                  />
                </div>
              )}
            </Sec>
          )}

          {/* SECTION 5: Financing — only show if tiers are enabled */}
          {selectedConfig && hasTiersEnabled && (
            <Sec title="Financing Option">
              {selectedConfig.pricing_model === 'cash_up' ? (
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Selecting a financing option will add the financing fee to the customer&apos;s price.
                </p>
              ) : (
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Financing options show payment terms. The cash incentive removes the financing fee from the price.
                </p>
              )}
              <div ref={finDropRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={{ ...INPUT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setFinDropOpen(v => !v)}>
                  <span style={{ color: financingId ? '#F9FAFB' : 'rgba(255,255,255,0.4)' }}>
                    {financingId
                      ? ((selectedConfig.financing_options.find(f => f.id === financingId) as any)?.display_name ?? financingId)
                      : 'Select financing...'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: finDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {finDropOpen && (
                  <div style={{
                    position: 'absolute', top: '52px', left: 0, right: 0, zIndex: 50,
                    background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px', overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}>
                    <button type="button"
                      style={{ width: '100%', padding: '12px 14px', textAlign: 'left', fontSize: '15px',
                        color: !financingId ? '#60A5FA' : 'rgba(255,255,255,0.5)',
                        background: !financingId ? 'rgba(29,78,216,0.1)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                      onClick={() => { setFinancingId(null); setFinDropOpen(false) }}>
                      No financing
                    </button>
                    {selectedConfig.financing_options.map(fin => (
                      <button key={fin.id} type="button"
                        style={{
                          width: '100%', padding: '12px 14px', textAlign: 'left', fontSize: '15px',
                          color: fin.id === financingId ? '#60A5FA' : '#F9FAFB',
                          background: fin.id === financingId ? 'rgba(29,78,216,0.12)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                        onClick={() => { setFinancingId(fin.id); setFinDropOpen(false) }}>
                        {(fin as any).display_name ?? (fin as any).name ?? fin.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Contextual note below dropdown */}
              {financingId && (() => {
                const fin = selectedConfig.financing_options.find(f => f.id === financingId)
                if (!fin) return null
                if (selectedConfig.pricing_model === 'financed_down') {
                  if (calcResult?.monthly_payment) {
                    return (
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Monthly payment: ${calcResult.monthly_payment.toLocaleString()}/mo (no price change)
                      </p>
                    )
                  }
                } else {
                  if (fin.fee_pct > 0 && calcResult) {
                    return (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs" style={{ color: '#FCD34D' }}>
                          Financing fee: +{fmt(calcResult.financing_fee)} added to price
                        </p>
                        {calcResult.monthly_payment && (
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            Monthly payment: ${calcResult.monthly_payment.toLocaleString()}/mo
                          </p>
                        )}
                      </div>
                    )
                  }
                  return (
                    <p className="text-xs mt-1" style={{ color: '#34D399' }}>
                      No financing fee — cash price
                    </p>
                  )
                }
                return null
              })()}
            </Sec>
          )}

          {/* SECTION 6: Rebate — only if config has rebate program */}
          {selectedConfig?.rebate_program?.enabled && (
            <Sec title={`${selectedConfig.rebate_program.name || 'Rebate'} Member Benefits`}>
              <Tog
                on={rebateEnabled}
                onToggle={() => {
                  setRebateEnabled((v: boolean) => !v)
                  if (!rebateEnabled && rebateTierIds.length === 0) {
                    setRebateTierIds(selectedConfig.rebate_program.tiers.map(t => t.id))
                  }
                }}
                label={`Customer is a ${selectedConfig.rebate_program.name || 'Rebate'} member`}
              />

              {rebateEnabled && (
                <div className="space-y-3 pt-2">
                  {selectedConfig.rebate_program.tiers.map(tier => (
                    <div key={tier.id}>
                      <Tog
                        on={rebateTierIds.includes(tier.id)}
                        onToggle={() => toggleRebateTier(tier.id)}
                        label={`${tier.name} (${tier.value}${tier.type === 'fixed' ? ' flat' : '%'})`}
                      />
                      {tier.type === 'pct_of_charged' && rebateTierIds.includes(tier.id) && (
                        <div className="mt-2 ml-12">
                          <Fld label="Amount charged to card">
                            <div className="flex items-center gap-2">
                              <span style={{ color: '#6B7280', fontSize: 13 }}>$</span>
                              <input
                                type="number"
                                value={chargedAmount}
                                onChange={e => setChargedAmount(e.target.value)}
                                placeholder="0"
                                min={0}
                                style={{ ...INPUT, width: 140, height: 40, fontSize: 14 }}
                              />
                            </div>
                          </Fld>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Sec>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-2xl text-base font-bold"
            style={{
              background: saving ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #1D4ED8, #0F766E)',
              color: '#fff',
            }}>
            {saving ? 'Saving…' : (ej ? 'Save Changes' : 'Save Job')}
          </button>
        </div>

        {/* ── RIGHT: Desktop sidebar ── */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-20">
            <PricingPanel result={calcResult} config={selectedConfig} />
          </div>
        </div>
      </div>

      {/* ── Mobile: fixed bottom pricing drawer ── */}
      <div className="lg:hidden fixed left-0 right-0 z-[60]" style={{ bottom: '76px' }}>
        {/* Backdrop */}
        {pricePanelOpen && (
          <div className="fixed inset-0 z-[-1]" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setPricePanelOpen(false)} />
        )}

        {/* Drawer */}
        <div
          className="mx-2 rounded-t-3xl overflow-hidden transition-all duration-300"
          style={{
            background: 'rgba(10,15,30,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            maxHeight: pricePanelOpen ? '70vh' : '56px',
          }}>
          {/* Handle / collapsed bar */}
          <button
            type="button"
            onClick={() => setPricePanelOpen(v => !v)}
            className="w-full flex items-center justify-between px-5"
            style={{ height: 56 }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>
                Customer Price
              </span>
              <span className="text-lg font-black" style={{
                color: calcResult ? '#06B6D4' : '#4B5563',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {calcResult ? fmt(calcResult.customer_price) : '—'}
              </span>
              {calcResult?.monthly_payment && (
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  ${calcResult.monthly_payment.toLocaleString()}/mo
                </span>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: pricePanelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>

          {/* Expanded content */}
          {pricePanelOpen && (
            <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: 'calc(70vh - 56px)' }}>
              <PricingPanel result={calcResult} config={selectedConfig} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
