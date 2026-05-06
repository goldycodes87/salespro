'use client'

import { useState } from 'react'
import type { PricingInputs, LineItem, FinancingOption, DiscountOptionSetting, FinancingOptionSetting } from '@/lib/pricing'
import { DEFAULT_LINE_ITEM, DEFAULT_DISCOUNT_SETTINGS, DEFAULT_FINANCING_SETTINGS } from '@/lib/pricing'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px',
  color: '#F9FAFB',
  outline: 'none',
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div onClick={onToggle} className="relative flex-shrink-0" style={{ width: '40px', height: '24px' }}>
        <div className="absolute inset-0 rounded-full transition-all"
          style={{ background: on ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
        <div className="absolute top-[3px] rounded-full transition-all"
          style={{ width: '18px', height: '18px', background: '#fff', left: on ? '19px' : '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
      <span className="text-sm" style={{ color: '#D1D5DB' }}>{label}</span>
    </label>
  )
}

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="h-10 rounded-xl text-sm font-medium transition-all"
            style={{
              background: value === o.value ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)',
              border: value === o.value ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: value === o.value ? '#60A5FA' : '#9CA3AF',
            }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 mb-3" style={cardStyle}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export default function WindowsStep({
  value,
  onChange,
  repSettings,
}: {
  value: PricingInputs
  onChange: (v: PricingInputs) => void
  repSettings?: Record<string, any> | null
}) {
  const set = <K extends keyof PricingInputs>(key: K, val: PricingInputs[K]) =>
    onChange({ ...value, [key]: val })

  // Settings-based options
  const useSettingsDiscounts = !!(repSettings?.discount_options?.length)
  const discountOpts: DiscountOptionSetting[] = useSettingsDiscounts
    ? repSettings!.discount_options
    : DEFAULT_DISCOUNT_SETTINGS
  const activePromos = discountOpts.filter(o => o.active && o.type === 'promotion')
  const activeBnsn = discountOpts.filter(o => o.active && o.type === 'bnsn')
  const activeCash = discountOpts.filter(o => o.active && o.type === 'cash')
  const cashOpt = activeCash[0]

  const useSettingsFinancing = !!(repSettings?.financing_options?.length)
  const financingOpts: FinancingOptionSetting[] = useSettingsFinancing
    ? repSettings!.financing_options.filter((o: FinancingOptionSetting) => o.active)
    : DEFAULT_FINANCING_SETTINGS.filter(o => o.active)

  const selectedPromoId = value.selected_promo_id ??
    (value.promotion === '20_off' ? '20pct_promo' : value.promotion === '25_off' ? '25pct_promo' : 'none')
  const promoOptions = [{ value: 'none', label: 'None' }, ...activePromos.map(o => ({ value: o.id, label: o.name }))]
  const handlePromoChange = (id: string) => {
    if (id === 'none') {
      onChange({ ...value, promotion: 'none', promotion_pct: undefined, selected_promo_id: 'none' })
    } else {
      const opt = activePromos.find(o => o.id === id)
      if (opt) {
        const enumKey = opt.pct === 20 ? '20_off' : opt.pct === 25 ? '25_off' : 'none'
        onChange({ ...value, promotion: enumKey as any, promotion_pct: opt.pct, selected_promo_id: id })
      }
    }
  }

  const selectedBnsnId = value.selected_bnsn_id ??
    (value.bnsn === '30_combined' ? 'bnsn_30' : value.bnsn === '10_off' ? 'bnsn_10' : value.bnsn === '5_off' ? 'bnsn_5' : 'none')
  const bnsnOptions = [{ value: 'none', label: 'None' }, ...activeBnsn.map(o => ({ value: o.id, label: o.name }))]
  const handleBnsnChange = (id: string) => {
    if (id === 'none') {
      onChange({ ...value, bnsn: 'none', bnsn_pct: undefined, bnsn_is_combined: undefined, selected_bnsn_id: 'none' })
    } else {
      const opt = activeBnsn.find(o => o.id === id)
      if (opt) {
        const enumKey = opt.is_combined ? '30_combined' : opt.pct === 10 ? '10_off' : opt.pct === 5 ? '5_off' : 'none'
        onChange({ ...value, bnsn: enumKey as any, bnsn_pct: opt.pct, bnsn_is_combined: opt.is_combined, selected_bnsn_id: id })
      }
    }
  }

  const selectedFinancingId = value.selected_financing_id ?? value.financing
  const handleFinancingSelect = (opt: FinancingOptionSetting) => {
    onChange({
      ...value,
      financing: opt.id as FinancingOption,
      financing_factor: opt.method === 'factor' ? opt.factor : undefined,
      financing_months: opt.method === 'months' ? opt.months : undefined,
      selected_financing_id: opt.id,
    })
  }

  const updateItem = (id: string, field: keyof LineItem, val: string | number | boolean) => {
    onChange({
      ...value,
      line_items: value.line_items.map(item =>
        item.id === id ? { ...item, [field]: val } : item
      ),
    })
  }

  const addItem = () => onChange({ ...value, line_items: [...value.line_items, DEFAULT_LINE_ITEM()] })
  const removeItem = (id: string) => onChange({ ...value, line_items: value.line_items.filter(i => i.id !== id) })

  return (
    <div>
      <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>Windows Pricing</h2>
      <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Add line items, discounts, and financing</p>

      {/* Line Items */}
      <div className="p-4 mb-3" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Line Items</p>
        <div className="space-y-3">
          {value.line_items.map((item, idx) => (
            <div key={item.id} className="rounded-xl p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Item {idx + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={item.discountable} onChange={e => updateItem(item.id, 'discountable', e.target.checked)}
                      className="rounded" style={{ accentColor: '#1D4ED8' }} />
                    <span className="text-xs" style={{ color: '#6B7280' }}>Discountable</span>
                  </label>
                  {value.line_items.length > 1 && (
                    <button type="button" onClick={() => removeItem(item.id)} style={{ color: '#EF4444' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <input
                value={item.location}
                onChange={e => updateItem(item.id, 'location', e.target.value)}
                placeholder="Location (e.g. Living room)"
                style={{ ...inputStyle, width: '100%', height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '10px' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    value={item.qty || ''}
                    onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                    placeholder="Qty"
                    min="1"
                    style={{ ...inputStyle, width: '100%', height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '10px' }}
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>$</span>
                  <input
                    type="number"
                    value={item.unit_price || ''}
                    onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                    placeholder="Unit price"
                    style={{ ...inputStyle, width: '100%', height: '40px', padding: '0 12px 0 20px', fontSize: '14px', borderRadius: '10px' }}
                  />
                </div>
              </div>
              {item.qty > 0 && item.unit_price > 0 && (
                <div className="flex justify-between text-xs pt-1">
                  <span style={{ color: '#6B7280' }}>Line total</span>
                  <span style={{ color: item.discountable ? '#D1D5DB' : '#9CA3AF' }}>
                    ${(item.qty * item.unit_price).toLocaleString()}
                    {!item.discountable && ' (non-disc)'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem}
          className="w-full mt-3 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: '#6B7280' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Line Item
        </button>
      </div>

      {/* Discounts */}
      <SectionCard title="Discounts">
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Promotion</p>
          <div className="grid grid-cols-2 gap-2">
            {promoOptions.map(o => (
              <button key={o.value} type="button" onClick={() => handlePromoChange(o.value)}
                className="h-10 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: selectedPromoId === o.value ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)',
                  border: selectedPromoId === o.value ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: selectedPromoId === o.value ? '#60A5FA' : '#9CA3AF',
                }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Buy Now Save Now</p>
          <div className="grid grid-cols-2 gap-2">
            {bnsnOptions.map(o => (
              <button key={o.value} type="button" onClick={() => handleBnsnChange(o.value)}
                className="h-10 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: selectedBnsnId === o.value ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)',
                  border: selectedBnsnId === o.value ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: selectedBnsnId === o.value ? '#60A5FA' : '#9CA3AF',
                }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          on={value.cash_incentive}
          onToggle={() => {
            const pct = cashOpt?.pct ?? 6
            onChange({ ...value, cash_incentive: !value.cash_incentive, cash_pct: pct })
          }}
          label={cashOpt ? `${cashOpt.name} (−${cashOpt.pct}%)` : 'Cash incentive (−6%)'}
        />
      </SectionCard>

      {/* Add-ons */}
      <SectionCard title="Add-ons">
        <Toggle on={value.admin_fee_enabled} onToggle={() => set('admin_fee_enabled', !value.admin_fee_enabled)} label="Admin fee" />
        {value.admin_fee_enabled && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#6B7280' }}>$</span>
            <input
              type="number"
              value={value.admin_fee_amount}
              onChange={e => set('admin_fee_amount', Number(e.target.value))}
              style={{ ...inputStyle, height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '10px', flex: 1 }}
            />
          </div>
        )}
        <Toggle on={value.lead_paint_enabled} onToggle={() => set('lead_paint_enabled', !value.lead_paint_enabled)} label="Lead paint removal" />
        {value.lead_paint_enabled && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#6B7280' }}>$</span>
            <input
              type="number"
              value={value.lead_paint_amount}
              onChange={e => set('lead_paint_amount', Number(e.target.value))}
              style={{ ...inputStyle, height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '10px', flex: 1 }}
            />
          </div>
        )}
      </SectionCard>

      {/* Costco */}
      <SectionCard title="Costco">
        <Toggle on={value.costco_revealed} onToggle={() => set('costco_revealed', !value.costco_revealed)} label="Reveal Costco benefit" />
        {value.costco_revealed && (
          <div className="space-y-2 pt-1">
            <Toggle on={value.costco_member} onToggle={() => set('costco_member', !value.costco_member)} label="Member (10% off)" />
            <Toggle on={value.costco_executive} onToggle={() => set('costco_executive', !value.costco_executive)} label="Executive (2% reward, max $1,250)" />
          </div>
        )}
      </SectionCard>

      {/* Financing */}
      <SectionCard title="Financing">
        <div className="space-y-2">
          <button type="button"
            onClick={() => onChange({ ...value, financing: 'none', financing_factor: undefined, financing_months: undefined, selected_financing_id: 'none' })}
            className="w-full h-10 rounded-xl px-4 flex items-center justify-between text-sm transition-all"
            style={{
              background: (selectedFinancingId === 'none' || !selectedFinancingId) ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.03)',
              border: (selectedFinancingId === 'none' || !selectedFinancingId) ? '1.5px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.06)',
              color: (selectedFinancingId === 'none' || !selectedFinancingId) ? '#60A5FA' : '#9CA3AF',
            }}>
            No Financing
            {(selectedFinancingId === 'none' || !selectedFinancingId) && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          {financingOpts.map(opt => (
            <button key={opt.id} type="button" onClick={() => handleFinancingSelect(opt)}
              className="w-full h-10 rounded-xl px-4 flex items-center justify-between text-sm transition-all"
              style={{
                background: selectedFinancingId === opt.id ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.03)',
                border: selectedFinancingId === opt.id ? '1.5px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.06)',
                color: selectedFinancingId === opt.id ? '#60A5FA' : '#9CA3AF',
              }}>
              {opt.label}
              {selectedFinancingId === opt.id && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
