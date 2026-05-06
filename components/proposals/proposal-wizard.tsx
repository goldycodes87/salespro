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
}: {
  leadId?: string
  defaultCustomer?: Partial<CustomerInfo>
}) {
  const router = useRouter()

  // Restore from sessionStorage if coming back from lead creation
  const [restored, setRestored] = useState(false)
  const [step, setStep] = useState(0)
  const [proposalType, setProposalType] = useState<ProposalType>('windows')
  const [customer, setCustomer] = useState<CustomerInfo>({
    first_name: defaultCustomer?.first_name ?? '',
    last_name: defaultCustomer?.last_name ?? '',
    email: defaultCustomer?.email ?? '',
    phone: defaultCustomer?.phone ?? '',
    spouse_first_name: defaultCustomer?.spouse_first_name ?? '',
    spouse_last_name: defaultCustomer?.spouse_last_name ?? '',
    address: defaultCustomer?.address ?? '',
    city: defaultCustomer?.city ?? '',
    state: defaultCustomer?.state ?? 'CO',
    zip: defaultCustomer?.zip ?? '',
  })
  const [linkedLead, setLinkedLead] = useState<{ id: string; name: string } | null>(
    initialLeadId ? { id: initialLeadId, name: [defaultCustomer?.first_name, defaultCustomer?.last_name].filter(Boolean).join(' ') } : null
  )
  const [pricing, setPricing] = useState<PricingInputs>({ ...DEFAULT_PRICING, proposal_type: 'windows' })
  const [sidingPricing, setSidingPricing] = useState<PricingInputs>({ ...DEFAULT_PRICING, proposal_type: 'siding' })
  const [scopeNotes, setScopeNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore draft state if coming back from lead creation
  useEffect(() => {
    if (restored) return
    setRestored(true)
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
  }, [restored])

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
        customer_phone: customer.phone || null,
        customer_address: customer.address || null,
        customer_city: customer.city || null,
        customer_state: customer.state || null,
        customer_zip: customer.zip || null,
        spouse_first_name: customer.spouse_first_name || null,
        spouse_last_name: customer.spouse_last_name || null,
        pricing_data: proposalType === 'siding' ? sidingPricing : pricing,
        internal_notes: scopeNotes || null,
      }
      console.log('[Proposal] Saving:', body)
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      console.log('[Proposal] Response:', res.status, data)
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      router.push(`/proposals/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const showPriceSummary = step === 2

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

      {/* Content */}
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
            <SidingStep value={sidingPricing} onChange={setSidingPricing} scopeNotes={scopeNotes} onScopeChange={setScopeNotes} />
          )}
          {step === 2 && proposalType !== 'siding' && (
            <WindowsStep value={pricing} onChange={setPricing} />
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <div className="fixed left-0 right-0 z-50 px-4"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom) + 84px)' }}>
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            {error}
          </div>
        </div>
      )}

      {/* Price summary strip (step 2 only) */}
      {showPriceSummary && (
        <div className="fixed left-0 right-0 z-50"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom) + 72px)', background: 'rgba(17,24,39,0.98)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px' }}>
          <PriceSummary result={result} inputs={activePricing} compact />
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
            {saving ? 'Saving…' : step < 2 ? 'Next' : 'Save Proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}
