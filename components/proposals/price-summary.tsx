'use client'

import type { PricingResult, PricingInputs } from '@/lib/pricing'
import { FINANCING_LABELS } from '@/lib/pricing'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

export default function PriceSummary({
  result,
  inputs,
  compact = false,
}: {
  result: PricingResult
  inputs: PricingInputs
  compact?: boolean
}) {
  const hasDiscount = result.discount_pct > 0 || result.cash_discount > 0
  const hasFinancing = inputs.financing !== 'none' && result.monthly_payment > 0
  const hasCostco = inputs.costco_revealed && (result.costco_member_savings > 0 || result.costco_exec_savings > 0 || result.costco_city_visa_savings > 0)

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <div>
          {hasDiscount && (
            <p className="text-xs line-through" style={{ color: '#6B7280' }}>{fmt(result.package_price)}</p>
          )}
          <p className="text-xl font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>
            {fmt(result.your_price)}
          </p>
          {hasFinancing && (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              or {fmt(result.monthly_payment)}/mo
            </p>
          )}
        </div>
        {hasDiscount && (
          <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>
            Save {fmt(result.you_save)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Package price row */}
      <div className="flex justify-between text-sm">
        <span style={{ color: '#9CA3AF' }}>Package</span>
        <span style={{ color: '#D1D5DB' }}>{fmt(result.package_price)}</span>
      </div>

      {/* Discount rows */}
      {result.discount_pct > 0 && (
        <div className="flex justify-between text-sm">
          <span style={{ color: '#9CA3AF' }}>Discount ({result.discount_pct}%)</span>
          <span style={{ color: '#34D399' }}>−{fmt(result.discount_amount)}</span>
        </div>
      )}
      {result.cash_discount > 0 && (
        <div className="flex justify-between text-sm">
          <span style={{ color: '#9CA3AF' }}>Cash incentive (6%)</span>
          <span style={{ color: '#34D399' }}>−{fmt(result.cash_discount)}</span>
        </div>
      )}
      {(result.admin_fee > 0 || result.lead_paint > 0) && (
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
      )}
      {result.admin_fee > 0 && (
        <div className="flex justify-between text-sm">
          <span style={{ color: '#9CA3AF' }}>Admin fee</span>
          <span style={{ color: '#D1D5DB' }}>{fmt(result.admin_fee)}</span>
        </div>
      )}
      {result.lead_paint > 0 && (
        <div className="flex justify-between text-sm">
          <span style={{ color: '#9CA3AF' }}>Lead paint</span>
          <span style={{ color: '#D1D5DB' }}>{fmt(result.lead_paint)}</span>
        </div>
      )}

      {/* Your Price */}
      <div className="flex justify-between items-baseline pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Your Price</span>
        <span className="text-2xl font-bold" style={{ color: '#F9FAFB', fontFamily: "'JetBrains Mono', monospace" }}>
          {fmt(result.your_price)}
        </span>
      </div>

      {/* Financing */}
      {hasFinancing && (
        <div className="flex justify-between text-sm pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#6B7280' }}>{FINANCING_LABELS[inputs.financing]}</span>
          <span className="font-semibold" style={{ color: '#60A5FA' }}>{fmt(result.monthly_payment)}/mo</span>
        </div>
      )}

      {/* Costco savings */}
      {hasCostco && (
        <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)' }}>
          {result.costco_member_savings > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: '#60A5FA' }}>Costco member (10%)</span>
              <span className="font-semibold" style={{ color: '#60A5FA' }}>−{fmt(result.costco_member_savings)}</span>
            </div>
          )}
          {result.costco_exec_savings > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#60A5FA' }}>Executive reward (2%)</span>
              <span className="font-semibold" style={{ color: '#60A5FA' }}>−{fmt(result.costco_exec_savings)}</span>
            </div>
          )}
          {result.costco_city_visa_savings > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#60A5FA' }}>City Visa (2%)</span>
              <span className="font-semibold" style={{ color: '#60A5FA' }}>−{fmt(result.costco_city_visa_savings)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
