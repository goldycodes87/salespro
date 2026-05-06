'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import TypeStep, { type ProposalType } from './type-step'
import CustomerStep, { type CustomerInfo } from './customer-step'
import WindowsStep from './windows-step'
import SidingStep from './siding-step'
import PriceSummary from './price-summary'
import { calcPrice, DEFAULT_PRICING, type PricingInputs } from '@/lib/pricing'

const STEPS = ['Type', 'Customer', 'Pricing'] as const

export default function ProposalWizard({
  leadId,
  defaultCustomer,
}: {
  leadId?: string
  defaultCustomer?: Partial<CustomerInfo>
}) {
  const router = useRouter()
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
  const [pricing, setPricing] = useState<PricingInputs>({
    ...DEFAULT_PRICING,
    proposal_type: 'windows',
  })
  const [sidingPricing, setSidingPricing] = useState<PricingInputs>({
    ...DEFAULT_PRICING,
    proposal_type: 'siding',
  })
  const [scopeNotes, setScopeNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activePricing: PricingInputs = proposalType === 'siding'
    ? { ...sidingPricing, proposal_type: 'siding' }
    : { ...pricing, proposal_type: proposalType === 'both' ? 'windows' : 'windows' }

  const result = useMemo(() => calcPrice(activePricing), [activePricing])

  const canAdvance = () => {
    if (step === 0) return true
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
        lead_id: leadId ?? null,
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
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
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
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < step ? '#1D4ED8' : i === step ? 'rgba(29,78,216,0.3)' : 'rgba(255,255,255,0.06)',
                color: i <= step ? '#fff' : '#6B7280',
                border: i === step ? '1.5px solid rgba(29,78,216,0.6)' : 'none',
              }}
            >
              {i < step ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : i + 1}
            </div>
            <span className="text-xs font-medium" style={{ color: i === step ? '#D1D5DB' : '#6B7280' }}>{s}</span>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-1" style={{ width: '24px', background: i < step ? '#1D4ED8' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="pb-52"
        >
          {step === 0 && (
            <TypeStep value={proposalType} onChange={v => {
              setProposalType(v)
              setPricing(prev => ({ ...prev, proposal_type: v === 'siding' ? 'siding' : 'windows' }))
            }} />
          )}
          {step === 1 && (
            <CustomerStep value={customer} onChange={setCustomer} />
          )}
          {step === 2 && proposalType === 'siding' && (
            <SidingStep
              value={sidingPricing}
              onChange={setSidingPricing}
              scopeNotes={scopeNotes}
              onScopeChange={setScopeNotes}
            />
          )}
          {step === 2 && proposalType !== 'siding' && (
            <WindowsStep value={pricing} onChange={setPricing} />
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <div className="fixed left-0 right-0 z-50 px-4" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom) + 84px)' }}>
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            {error}
          </div>
        </div>
      )}

      {/* Price summary strip (step 2 only) */}
      {showPriceSummary && (
        <div className="fixed left-0 right-0 z-50 px-4"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom) + 72px)', background: 'rgba(17,24,39,0.98)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px' }}>
          <PriceSummary result={result} inputs={activePricing} compact />
        </div>
      )}

      {/* Action bar */}
      <div className="fixed left-0 right-0 z-50 px-4 py-3"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))', background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={saving}
              className="h-12 px-5 rounded-2xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={saving || !canAdvance()}
            className="flex-1 h-12 rounded-2xl text-base font-semibold transition-all"
            style={{
              background: saving || !canAdvance() ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #1D4ED8, #0F766E)',
              color: '#fff',
              boxShadow: saving ? 'none' : '0 4px 24px rgba(29,78,216,0.3)',
            }}
          >
            {saving ? 'Saving…' : step < 2 ? 'Next' : 'Save Proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}
