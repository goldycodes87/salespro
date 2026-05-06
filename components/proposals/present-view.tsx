'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcPrice, type PricingInputs, FINANCING_LABELS } from '@/lib/pricing'

type Proposal = Record<string, any>

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

export default function PresentView({ proposal }: { proposal: Proposal }) {
  const [revealed, setRevealed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const pricing: PricingInputs | null = proposal.pricing_data?.proposal_type
    ? proposal.pricing_data as PricingInputs
    : null
  const result = pricing ? calcPrice(pricing) : null

  const fullName = [proposal.customer_first_name, proposal.customer_last_name].filter(Boolean).join(' ')
    || proposal.customer_name || 'Customer'

  const hasFinancing = pricing && pricing.financing !== 'none' && result && result.monthly_payment > 0
  const hasDiscount = result && (result.discount_pct > 0 || result.cash_discount > 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A0F1E' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="font-bold" style={{ color: '#F9FAFB' }}>SalesPro</span>
        </div>
        <span className="text-sm" style={{ color: '#6B7280' }}>{proposal.type?.toUpperCase()}</span>
      </div>

      <div className="flex-1 px-6 pb-8">
        {/* Customer greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Prepared for</p>
          <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>{fullName}</h1>
          {(proposal.customer_address || proposal.customer_city) && (
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              {[proposal.customer_address, proposal.customer_city, proposal.customer_state].filter(Boolean).join(', ')}
            </p>
          )}
        </motion.div>

        {/* The big price reveal */}
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="rounded-3xl p-8 mb-6 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>

            {hasDiscount && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <p className="text-sm mb-1 line-through" style={{ color: '#4B5563' }}>{fmt(result.package_price)}</p>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="text-sm font-semibold" style={{ color: '#34D399' }}>
                    You save {fmt(result.you_save)}
                  </span>
                </div>
              </motion.div>
            )}

            <p className="text-sm font-medium mb-2" style={{ color: '#6B7280' }}>Your Price</p>
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
              className="font-bold"
              style={{ fontSize: '56px', lineHeight: 1, color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(result.your_price)}
            </motion.p>

            {hasFinancing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm" style={{ color: '#6B7280' }}>or as low as</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#60A5FA', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(result.monthly_payment)}<span className="text-lg font-medium">/mo</span>
                </p>
                <p className="text-xs mt-1" style={{ color: '#4B5563' }}>{FINANCING_LABELS[pricing!.financing]}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Costco section */}
        {pricing?.costco_revealed && result && (result.costco_member_savings > 0 || result.costco_exec_savings > 0) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#1D4ED8' }}>
                <span className="text-xs font-black text-white">C</span>
              </div>
              <span className="font-semibold" style={{ color: '#60A5FA' }}>Costco Member Benefit</span>
            </div>
            {result.costco_member_savings > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: '#93C5FD' }}>Member discount (10%)</span>
                <span className="font-bold" style={{ color: '#60A5FA' }}>−{fmt(result.costco_member_savings)}</span>
              </div>
            )}
            {result.costco_exec_savings > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#93C5FD' }}>Executive reward (2%)</span>
                <span className="font-bold" style={{ color: '#60A5FA' }}>−{fmt(result.costco_exec_savings)}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Details toggle */}
        {result && pricing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <button onClick={() => setShowDetails(s => !s)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-medium mb-2"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
              See full breakdown
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="transition-transform" style={{ transform: showDetails ? 'rotate(180deg)' : undefined }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl px-5 py-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: '#9CA3AF' }}>Package price</span>
                      <span style={{ color: '#D1D5DB' }}>{fmt(result.package_price)}</span>
                    </div>
                    {result.discount_pct > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: '#9CA3AF' }}>Discount ({result.discount_pct}%)</span>
                        <span style={{ color: '#34D399' }}>−{fmt(result.discount_amount)}</span>
                      </div>
                    )}
                    {result.cash_discount > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: '#9CA3AF' }}>Cash incentive</span>
                        <span style={{ color: '#34D399' }}>−{fmt(result.cash_discount)}</span>
                      </div>
                    )}
                    {result.admin_fee > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: '#9CA3AF' }}>Admin fee</span>
                        <span style={{ color: '#D1D5DB' }}>{fmt(result.admin_fee)}</span>
                      </div>
                    )}
                    {result.lead_paint > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: '#9CA3AF' }}>Lead paint</span>
                        <span style={{ color: '#D1D5DB' }}>{fmt(result.lead_paint)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 font-semibold" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ color: '#F9FAFB' }}>Your Price</span>
                      <span style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(result.your_price)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Scope notes */}
        {proposal.internal_notes && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            className="mt-4 p-5 rounded-2xl" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>Project Scope</p>
            <p className="text-sm" style={{ color: '#D1D5DB', lineHeight: '1.6' }}>{proposal.internal_notes}</p>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#D1D5DB' }}>Eric Goldberg</p>
          <p className="text-xs" style={{ color: '#4B5563' }}>Lifetime Home Remodeling</p>
          <p className="text-xs mt-1" style={{ color: '#4B5563' }}>eric@lifetimewindows.com · 719-213-4566</p>
        </div>
      </div>
    </div>
  )
}
