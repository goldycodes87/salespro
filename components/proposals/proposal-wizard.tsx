'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import TypeStep, { type ProposalType } from './type-step'
import CustomerStep, { type CustomerInfo } from './customer-step'
import WindowsStep from './windows-step'
import SidingStep from './siding-step'
import PriceSummary from './price-summary'
import { calcPrice, DEFAULT_PRICING, type PricingInputs } from '@/lib/pricing'
import type { ProposalRender } from './present-view'

const STEPS = ['Type', 'Customer', 'Pricing'] as const
const DRAFT_KEY = 'proposal_draft'

type DraftState = {
  proposalType: ProposalType
  customer: CustomerInfo
  pricing: PricingInputs
  sidingPricing: PricingInputs
  scopeNotes: string
  step: number
}

export default function ProposalWizard({
  leadId: initialLeadId,
  defaultCustomer,
  editId,
  existingProposal,
  repSettings,
}: {
  leadId?: string
  defaultCustomer?: Partial<CustomerInfo>
  editId?: string
  existingProposal?: Record<string, any> | null
  repSettings?: Record<string, any> | null
}) {
  const router = useRouter()
  const ep = existingProposal

  const [restored, setRestored] = useState(false)
  const [step, setStep] = useState(0)
  const [proposalType, setProposalType] = useState<ProposalType>(
    (ep?.type as ProposalType) ?? 'windows'
  )
  const [customer, setCustomer] = useState<CustomerInfo>({
    first_name: ep?.customer_first_name ?? defaultCustomer?.first_name ?? '',
    last_name: ep?.customer_last_name ?? defaultCustomer?.last_name ?? '',
    email: ep?.customer_email ?? defaultCustomer?.email ?? '',
    phone: ep?.customer_phone ?? defaultCustomer?.phone ?? '',
    spouse_first_name: ep?.spouse_first_name ?? defaultCustomer?.spouse_first_name ?? '',
    spouse_last_name: ep?.spouse_last_name ?? defaultCustomer?.spouse_last_name ?? '',
    address: ep?.customer_address ?? defaultCustomer?.address ?? '',
    city: ep?.customer_city ?? defaultCustomer?.city ?? '',
    state: ep?.customer_state ?? defaultCustomer?.state ?? 'CO',
    zip: ep?.customer_zip ?? defaultCustomer?.zip ?? '',
  })
  const [linkedLead, setLinkedLead] = useState<{ id: string; name: string } | null>(
    ep?.lead_id
      ? { id: ep.lead_id, name: [ep.customer_first_name, ep.customer_last_name].filter(Boolean).join(' ') }
      : initialLeadId
        ? { id: initialLeadId, name: [defaultCustomer?.first_name, defaultCustomer?.last_name].filter(Boolean).join(' ') }
        : null
  )
  const [pricing, setPricing] = useState<PricingInputs>(
    ep && ep.type !== 'siding' ? { ...ep.pricing_data, proposal_type: 'windows' } : { ...DEFAULT_PRICING, proposal_type: 'windows' }
  )
  const [sidingPricing, setSidingPricing] = useState<PricingInputs>(
    ep && ep.type === 'siding' ? { ...ep.pricing_data, proposal_type: 'siding' } : { ...DEFAULT_PRICING, proposal_type: 'siding' }
  )
  const [scopeNotes, setScopeNotes] = useState(ep?.internal_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pricePanelOpen, setPricePanelOpen] = useState(false)
  const [renders, setRenders] = useState<ProposalRender[]>([])
  const [rendersLoaded, setRendersLoaded] = useState(false)
  const [removingRenderId, setRemovingRenderId] = useState<string | null>(null)

  // Restore draft from sessionStorage (skip when editing existing proposal)
  useEffect(() => {
    if (restored) return
    setRestored(true)
    if (editId) return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      sessionStorage.removeItem(DRAFT_KEY)
      const draft: DraftState = JSON.parse(raw)
      setProposalType(draft.proposalType)
      setCustomer(draft.customer)
      setPricing(draft.pricing)
      setSidingPricing(draft.sidingPricing)
      setScopeNotes(draft.scopeNotes)
      setStep(draft.step)
    } catch {}
  }, [restored, editId])

  // Fetch renders for existing proposal
  useEffect(() => {
    if (!editId || rendersLoaded) return
    setRendersLoaded(true)
    fetch(`/api/proposals/${editId}/renders`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setRenders(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [editId, rendersLoaded])

  const handleRemoveRender = async (renderId: string) => {
    setRemovingRenderId(renderId)
    try {
      const res = await fetch(`/api/proposals/${editId}/renders/${renderId}`, { method: 'DELETE' })
      if (res.ok) setRenders(prev => prev.filter(r => r.id !== renderId))
    } finally {
      setRemovingRenderId(null)
    }
  }

  // When a lead is linked from the search, fetch full lead data to pre-fill customer
  const handleLinkLead = async (lead: { id: string; name: string } | null) => {
    setLinkedLead(lead)
    if (!lead?.id) return
    try {
      const res = await fetch(`/api/leads/${lead.id}`)
      if (!res.ok) return
      const data = await res.json()
      setCustomer({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        spouse_first_name: data.spouse_first_name ?? '',
        spouse_last_name: data.spouse_last_name ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        state: data.state ?? 'CO',
        zip: data.zip ?? '',
      })
    } catch {}
  }

  const handleCreateNewLead = () => {
    // Save current wizard state before navigating away
    const draft: DraftState = { proposalType, customer, pricing, sidingPricing, scopeNotes, step }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    router.push('/leads/create?from=proposal')
  }

  const activePricing: PricingInputs = proposalType === 'siding'
    ? { ...sidingPricing, proposal_type: 'siding' }
    : { ...pricing, proposal_type: 'windows' }

  const result = useMemo(() => calcPrice(activePricing), [activePricing])

  const canAdvance = () => {
    if (step === 1) return !!(customer.first_name && customer.last_name)
    return true
  }

  const handleNext = () => {
    if (step < 2) setStep(s => s + 1)
    else handleSave()
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const body = {
        lead_id: linkedLead?.id ?? null,
        type: proposalType,
        customer_first_name: customer.first_name,
        customer_last_name: customer.last_name,
        customer_email: customer.email || null,
        customer_phone: customer.phone.replace(/\D/g, '') || null,
        customer_address: customer.address || null,
        customer_city: customer.city || null,
        customer_state: customer.state || null,
        customer_zip: customer.zip || null,
        spouse_first_name: customer.spouse_first_name || null,
        spouse_last_name: customer.spouse_last_name || null,
        pricing_data: proposalType === 'siding' ? sidingPricing : pricing,
        internal_notes: proposalType === 'siding'
          ? (sidingPricing.siding_scope?.special_notes || null)
          : (scopeNotes || null),
        offer_expiration_date: proposalType === 'siding'
          ? (sidingPricing.siding_scope?.offer_expiration_date || null)
          : null,
      }
      const res = editId
        ? await fetch(`/api/proposals/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      router.push(`/proposals/${editId ?? data.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const showPriceSummary = step === 2

  const mobileDisplayPrice = result.net_after_costco < result.your_price ? result.net_after_costco : result.your_price

  return (
    <div className="relative">
      {/* Progress */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < step ? '#1D4ED8' : i === step ? 'rgba(29,78,216,0.3)' : 'rgba(255,255,255,0.06)',
                color: i <= step ? '#fff' : '#6B7280',
                border: i === step ? '1.5px solid rgba(29,78,216,0.6)' : 'none',
              }}>
              {i < step ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : i + 1}
            </div>
            <span className="text-xs font-medium mr-2" style={{ color: i === step ? '#D1D5DB' : '#6B7280' }}>{s}</span>
            {i < STEPS.length - 1 && (
              <div className="h-px mr-1" style={{ width: '16px', background: i < step ? '#1D4ED8' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Content + Desktop sidebar */}
      <div className={`${showPriceSummary ? 'lg:flex lg:gap-6 lg:items-start' : ''}`}>
        {/* Main content */}
        <div className="lg:flex-1 lg:min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }} className="pb-52">
              {step === 0 && (
                <TypeStep value={proposalType} onChange={v => {
                  setProposalType(v)
                  setPricing(prev => ({ ...prev, proposal_type: v === 'siding' ? 'siding' : 'windows' }))
                }} />
              )}
              {step === 1 && (
                <CustomerStep
                  value={customer}
                  onChange={setCustomer}
                  linkedLead={linkedLead}
                  onLinkLead={handleLinkLead}
                  onCreateNewLead={handleCreateNewLead}
                />
              )}
              {step === 2 && proposalType === 'siding' && (
                <SidingStep value={sidingPricing} onChange={setSidingPricing} repSettings={repSettings} />
              )}
              {step === 2 && proposalType !== 'siding' && (
                <WindowsStep value={pricing} onChange={setPricing} repSettings={repSettings} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop: sticky sidebar (in-flow, no overlap) */}
        {showPriceSummary && (
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-20 rounded-2xl p-5 overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 120px)', background: 'rgba(17,24,39,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B7280' }}>Live Pricing</p>
              <PriceSummary result={result} inputs={activePricing} />
            </div>
          </div>
        )}
      </div>

      {/* Visualizations section (edit mode only) */}
      {editId && renders.length > 0 && step === 2 && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Visualizations</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {renders.map(r => (
              <div key={r.id} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.image_url}
                  alt={r.color_name ?? 'Render'}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                />
                {r.color_name && (
                  <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {r.color_hex && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color_hex, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    )}
                    <p style={{ fontSize: '10px', color: '#9CA3AF', lineHeight: 1 }}>{r.color_name}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveRender(r.id)}
                  disabled={removingRenderId === r.id}
                  style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#9CA3AF', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, lineHeight: 1,
                    opacity: removingRenderId === r.id ? 0.4 : 1,
                  }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed left-0 right-0 z-50 px-4"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom) + 84px)' }}>
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            {error}
          </div>
        </div>
      )}

      {/* Mobile: collapsible panel fixed above action bar (step 2 only) */}
      {showPriceSummary && (
        <div className="lg:hidden fixed left-0 right-0 z-50"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))', background: 'rgba(10,15,30,0.98)', borderTop: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)' }}>
          <button
            type="button"
            onClick={() => setPricePanelOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Your Price</span>
              {result.discount_pct > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>
                  Save {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(result.you_save)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mobileDisplayPrice)}
              </span>
              <motion.div animate={{ rotate: pricePanelOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </motion.div>
            </div>
          </button>
          <AnimatePresence>
            {pricePanelOpen && (
              <motion.div
                key="price-breakdown"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <PriceSummary result={result} inputs={activePricing} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action bar */}
      <div className="fixed left-0 right-0 z-50 px-4 py-3"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))', background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)} disabled={saving}
              className="h-12 px-5 rounded-2xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
              Back
            </button>
          )}
          <button type="button" onClick={handleNext} disabled={saving || !canAdvance()}
            className="flex-1 h-12 rounded-2xl text-base font-semibold transition-all"
            style={{
              background: saving || !canAdvance() ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #1D4ED8, #0F766E)',
              color: '#fff',
              boxShadow: saving ? 'none' : '0 4px 24px rgba(29,78,216,0.3)',
            }}>
            {saving ? 'Saving…' : step < 2 ? 'Next' : editId ? 'Update Proposal' : 'Save Proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}
