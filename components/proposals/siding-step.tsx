'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PricingInputs, SidingScopeData, DiscountOptionSetting, FinancingOptionSetting } from '@/lib/pricing'
import { FINANCING_LABELS, DEFAULT_DISCOUNT_SETTINGS, DEFAULT_FINANCING_SETTINGS } from '@/lib/pricing'
import type { FinancingOption, Promotion, BNSN } from '@/lib/pricing'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px',
  color: '#F9FAFB',
  outline: 'none',
}

const textInput: React.CSSProperties = {
  ...inputStyle,
  width: '100%',
  height: '44px',
  padding: '0 12px',
  fontSize: '14px',
}

const cardStyle: React.CSSProperties = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div onClick={onToggle} className="relative flex-shrink-0" style={{ width: '40px', height: '24px' }}>
        <div className="absolute inset-0 rounded-full transition-all"
          style={{ background: on ? '#1D4ED8' : 'rgba(255,255,255,0.10)' }} />
        <div className="absolute top-[3px] rounded-full transition-all"
          style={{ width: '18px', height: '18px', background: '#fff', left: on ? '19px' : '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
      <span className="text-sm" style={{ color: '#D1D5DB' }}>{label}</span>
    </label>
  )
}

function RadioGroup<T extends string>({
  label, options, value, onChange,
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 mb-3" style={cardStyle}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function CollapsibleSection({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="mb-3 overflow-hidden" style={{ ...cardStyle }}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3">
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {title}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}>
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="pt-3">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ScopeInput({ label, value, onChange, placeholder, type = 'text', className }: {
  label: string; value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string; className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</p>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={textInput}
      />
    </div>
  )
}

function RemoveRow({ label, on, onToggle, typeValue, onTypeChange, typePlaceholder = 'Type' }: {
  label: string; on: boolean; onToggle: () => void
  typeValue?: string; onTypeChange?: (v: string) => void; typePlaceholder?: string
}) {
  return (
    <div className="space-y-2">
      <Toggle on={on} onToggle={onToggle} label={label} />
      <AnimatePresence>
        {on && onTypeChange && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <input
              value={typeValue ?? ''} onChange={e => onTypeChange(e.target.value)}
              placeholder={typePlaceholder} style={textInput} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function HardieRow({ name, on, onToggle, loc, profile, reveal, collection, color, onChange }: {
  name: string; on: boolean; onToggle: () => void
  loc?: string; profile?: string; reveal?: string; collection?: string; color?: string
  onChange: (field: string, val: string) => void
}) {
  return (
    <div className="pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <Toggle on={on} onToggle={onToggle} label={name} />
      <AnimatePresence>
        {on && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ScopeInput label="Location" value={loc ?? ''} onChange={v => onChange('location', v)} />
              <ScopeInput label="Profile" value={profile ?? ''} onChange={v => onChange('profile', v)} />
              <ScopeInput label="Reveal" value={reveal ?? ''} onChange={v => onChange('reveal', v)} />
              <ScopeInput label="Collection" value={collection ?? ''} onChange={v => onChange('collection', v)} />
              <ScopeInput label="Color" value={color ?? ''} onChange={v => onChange('color', v)} className="col-span-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrimRow({ name, on, onToggle, type, collection, color, onChange, extra }: {
  name: string; on: boolean; onToggle: () => void
  type?: string; collection?: string; color?: string
  onChange: (field: string, val: string) => void
  extra?: React.ReactNode
}) {
  return (
    <div className="pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <Toggle on={on} onToggle={onToggle} label={name} />
      <AnimatePresence>
        {on && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ScopeInput label="Type" value={type ?? ''} onChange={v => onChange('type', v)} />
              <ScopeInput label="Collection" value={collection ?? ''} onChange={v => onChange('collection', v)} />
              <ScopeInput label="Color" value={color ?? ''} onChange={v => onChange('color', v)} className="col-span-2" />
              {extra}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SidingStep({
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

  const scope = value.siding_scope ?? {}
  const setScope = (updates: Partial<SidingScopeData>) =>
    onChange({ ...value, siding_scope: { ...scope, ...updates } })

  const toggleLeadTest = (on: boolean) => {
    onChange({
      ...value,
      siding_scope: { ...scope, pre_1978_lead_test: on },
      lead_paint_enabled: on,
      lead_paint_amount: on ? 500 : value.lead_paint_amount,
    })
  }

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const toggleSection = (id: string) => setOpenSections(s => ({ ...s, [id]: !s[id] }))

  // Settings-based discount/financing options
  const useSettingsDiscounts = !!(repSettings?.discount_options?.length)
  const discountOpts: DiscountOptionSetting[] = useSettingsDiscounts
    ? repSettings!.discount_options
    : DEFAULT_DISCOUNT_SETTINGS
  const activePromos = discountOpts.filter(o => o.active && o.type === 'promotion')
  const activeBnsn = discountOpts.filter(o => o.active && o.type === 'bnsn')
  const activeCash = discountOpts.filter(o => o.active && o.type === 'cash')

  const useSettingsFinancing = !!(repSettings?.financing_options?.length)
  const financingOpts: FinancingOptionSetting[] = useSettingsFinancing
    ? repSettings!.financing_options.filter((o: FinancingOptionSetting) => o.active)
    : DEFAULT_FINANCING_SETTINGS.filter(o => o.active)

  // Promotion display
  const selectedPromoId = value.selected_promo_id ??
    (value.promotion === '20_off' ? '20pct_promo' : value.promotion === '25_off' ? '25pct_promo' : 'none')
  const promoOptions = [
    { value: 'none', label: 'None' },
    ...activePromos.map(o => ({ value: o.id, label: o.name })),
  ]
  const handlePromoChange = (id: string) => {
    if (id === 'none') {
      onChange({ ...value, promotion: 'none', promotion_pct: undefined, selected_promo_id: 'none' })
    } else {
      const opt = activePromos.find(o => o.id === id)
      if (opt) {
        const enumKey = opt.pct === 20 ? '20_off' : opt.pct === 25 ? '25_off' : 'none'
        onChange({ ...value, promotion: enumKey, promotion_pct: opt.pct, selected_promo_id: id })
      }
    }
  }

  // BNSN display
  const selectedBnsnId = value.selected_bnsn_id ??
    (value.bnsn === '30_combined' ? 'bnsn_30' : value.bnsn === '10_off' ? 'bnsn_10' : value.bnsn === '5_off' ? 'bnsn_5' : 'none')
  const bnsnOptions = [
    { value: 'none', label: 'None' },
    ...activeBnsn.map(o => ({ value: o.id, label: o.name })),
  ]
  const handleBnsnChange = (id: string) => {
    if (id === 'none') {
      onChange({ ...value, bnsn: 'none', bnsn_pct: undefined, bnsn_is_combined: undefined, selected_bnsn_id: 'none' })
    } else {
      const opt = activeBnsn.find(o => o.id === id)
      if (opt) {
        const enumKey = opt.is_combined ? '30_combined' : opt.pct === 10 ? '10_off' : opt.pct === 5 ? '5_off' : 'none'
        onChange({ ...value, bnsn: enumKey, bnsn_pct: opt.pct, bnsn_is_combined: opt.is_combined, selected_bnsn_id: id })
      }
    }
  }

  // Cash display
  const cashOpt = activeCash[0]

  // Financing display
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

  return (
    <div>
      <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>Siding Proposal</h2>
      <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Pricing, discounts, and scope of work</p>

      {/* Project Value */}
      <div className="p-4 mb-3" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Project Value</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium" style={{ color: '#9CA3AF' }}>$</span>
          <input
            type="number"
            value={value.project_value || ''}
            onChange={e => set('project_value', Number(e.target.value))}
            placeholder="0"
            style={{ ...inputStyle, width: '100%', height: '56px', padding: '0 14px 0 28px', fontSize: '24px', fontWeight: '700' }}
          />
        </div>
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
            <input type="number" value={value.admin_fee_amount}
              onChange={e => set('admin_fee_amount', Number(e.target.value))}
              style={{ ...inputStyle, height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '10px', flex: 1 }} />
          </div>
        )}
        <Toggle on={value.lead_paint_enabled} onToggle={() => set('lead_paint_enabled', !value.lead_paint_enabled)} label="Lead paint removal" />
        {value.lead_paint_enabled && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#6B7280' }}>$</span>
            <input type="number" value={value.lead_paint_amount}
              onChange={e => set('lead_paint_amount', Number(e.target.value))}
              style={{ ...inputStyle, height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '10px', flex: 1 }} />
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
          {/* No Financing option */}
          <button type="button"
            onClick={() => onChange({ ...value, financing: 'none', financing_factor: undefined, financing_months: undefined, selected_financing_id: 'none' })}
            className="w-full h-10 rounded-xl px-4 flex items-center justify-between text-sm transition-all"
            style={{
              background: (selectedFinancingId === 'none' || selectedFinancingId === undefined) ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.03)',
              border: (selectedFinancingId === 'none' || selectedFinancingId === undefined) ? '1.5px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.06)',
              color: (selectedFinancingId === 'none' || selectedFinancingId === undefined) ? '#60A5FA' : '#9CA3AF',
            }}>
            No Financing
            {(selectedFinancingId === 'none' || selectedFinancingId === undefined) && (
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

      {/* ─── SCOPE OF WORK ─── */}
      <div className="mt-6 mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Scope of Work</p>
      </div>

      {/* S1: Removing Existing Material */}
      <CollapsibleSection title="Removing Existing Material" open={!!openSections.s1} onToggle={() => toggleSection('s1')}>
        <RemoveRow label="Siding" on={!!scope.remove_siding} onToggle={() => setScope({ remove_siding: !scope.remove_siding })}
          typeValue={scope.remove_siding_type} onTypeChange={v => setScope({ remove_siding_type: v })} typePlaceholder="Type (e.g. Wood, Vinyl)" />
        <RemoveRow label="Siding Add'l Layer" on={!!scope.remove_siding_addl} onToggle={() => setScope({ remove_siding_addl: !scope.remove_siding_addl })}
          typeValue={scope.remove_siding_addl_type} onTypeChange={v => setScope({ remove_siding_addl_type: v })} />
        <RemoveRow label="Trim" on={!!scope.remove_trim} onToggle={() => setScope({ remove_trim: !scope.remove_trim })}
          typeValue={scope.remove_trim_type} onTypeChange={v => setScope({ remove_trim_type: v })} typePlaceholder="Type (e.g. Wood)" />
        <RemoveRow label="Gutter/Downspout" on={!!scope.remove_gutter} onToggle={() => setScope({ remove_gutter: !scope.remove_gutter })}
          typeValue={scope.remove_gutter_type} onTypeChange={v => setScope({ remove_gutter_type: v })} typePlaceholder="Type (e.g. Aluminum)" />
        <Toggle label="Sheathing" on={!!scope.remove_sheathing} onToggle={() => setScope({ remove_sheathing: !scope.remove_sheathing })} />
      </CollapsibleSection>

      {/* S2: Removal Extras */}
      <CollapsibleSection title="Removal Extras" open={!!openSections.s2} onToggle={() => toggleSection('s2')}>
        <div className="space-y-2">
          <Toggle label="Disposal Dumpster" on={!!scope.disposal_dumpster} onToggle={() => setScope({ disposal_dumpster: !scope.disposal_dumpster })} />
          <AnimatePresence>
            {scope.disposal_dumpster && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Qty</span>
                  <input type="number" value={scope.disposal_dumpster_qty ?? ''} min="1"
                    onChange={e => setScope({ disposal_dumpster_qty: Number(e.target.value) })}
                    style={{ ...inputStyle, height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '10px', flex: 1 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="space-y-1">
          <Toggle label="Pre-1978 Lead Test (+$500)" on={!!scope.pre_1978_lead_test} onToggle={() => toggleLeadTest(!scope.pre_1978_lead_test)} />
          {scope.pre_1978_lead_test && (
            <p className="text-xs pl-14" style={{ color: '#F59E0B' }}>$500 added to proposal (non-discountable)</p>
          )}
        </div>
      </CollapsibleSection>

      {/* S3: Install New Material */}
      <CollapsibleSection title="Install New Material" open={!!openSections.s3} onToggle={() => toggleSection('s3')}>
        <div className="space-y-2">
          <Toggle label="Sheathing" on={!!scope.install_sheathing} onToggle={() => setScope({ install_sheathing: !scope.install_sheathing })} />
          <AnimatePresence>
            {scope.install_sheathing && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <ScopeInput label="Type" value={scope.install_sheathing_type ?? ''} onChange={v => setScope({ install_sheathing_type: v })} />
                  <ScopeInput label="Sq Ft" value={scope.install_sheathing_sqft ?? ''} type="number" onChange={v => setScope({ install_sheathing_sqft: Number(v) })} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Toggle label="Moisture Barrier" on={!!scope.moisture_barrier} onToggle={() => setScope({ moisture_barrier: !scope.moisture_barrier })} />
        <div className="space-y-2">
          <Toggle label="½″ Fanfold Insulation" on={!!scope.fanfold} onToggle={() => setScope({ fanfold: !scope.fanfold })} />
          <AnimatePresence>
            {scope.fanfold && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <ScopeInput label="Sq Ft" value={scope.fanfold_sqft ?? ''} type="number" onChange={v => setScope({ fanfold_sqft: Number(v) })} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CollapsibleSection>

      {/* S4: James Hardie Siding */}
      <CollapsibleSection title="James Hardie Siding" open={!!openSections.s4} onToggle={() => toggleSection('s4')}>
        <div className="space-y-3">
          <HardieRow name="Hardie Plank" on={!!scope.hardie_plank} onToggle={() => setScope({ hardie_plank: !scope.hardie_plank })}
            loc={scope.hardie_plank_location} profile={scope.hardie_plank_profile}
            reveal={scope.hardie_plank_reveal} collection={scope.hardie_plank_collection} color={scope.hardie_plank_color}
            onChange={(f, v) => setScope({ [`hardie_plank_${f}`]: v } as any)} />
          <HardieRow name="Hardie Panel" on={!!scope.hardie_panel} onToggle={() => setScope({ hardie_panel: !scope.hardie_panel })}
            loc={scope.hardie_panel_location} profile={scope.hardie_panel_profile}
            reveal={scope.hardie_panel_reveal} collection={scope.hardie_panel_collection} color={scope.hardie_panel_color}
            onChange={(f, v) => setScope({ [`hardie_panel_${f}`]: v } as any)} />
          <HardieRow name="Hardie Shingle" on={!!scope.hardie_shingle} onToggle={() => setScope({ hardie_shingle: !scope.hardie_shingle })}
            loc={scope.hardie_shingle_location} profile={scope.hardie_shingle_profile}
            reveal={scope.hardie_shingle_reveal} collection={scope.hardie_shingle_collection} color={scope.hardie_shingle_color}
            onChange={(f, v) => setScope({ [`hardie_shingle_${f}`]: v } as any)} />
          <HardieRow name="Hardie Special" on={!!scope.hardie_special} onToggle={() => setScope({ hardie_special: !scope.hardie_special })}
            loc={scope.hardie_special_location} profile={scope.hardie_special_profile}
            reveal={scope.hardie_special_reveal} collection={scope.hardie_special_collection} color={scope.hardie_special_color}
            onChange={(f, v) => setScope({ [`hardie_special_${f}`]: v } as any)} />
        </div>
      </CollapsibleSection>

      {/* S5: James Hardie Trim */}
      <CollapsibleSection title="James Hardie Trim" open={!!openSections.s5} onToggle={() => toggleSection('s5')}>
        <div className="space-y-3">
          <TrimRow name="Windows/Doors" on={!!scope.trim_windows_doors} onToggle={() => setScope({ trim_windows_doors: !scope.trim_windows_doors })}
            type={scope.trim_windows_doors_type} collection={scope.trim_windows_doors_collection} color={scope.trim_windows_doors_color}
            onChange={(f, v) => setScope({ [`trim_windows_doors_${f}`]: v } as any)} />
          <TrimRow name="Corners" on={!!scope.trim_corners} onToggle={() => setScope({ trim_corners: !scope.trim_corners })}
            type={scope.trim_corners_type} collection={scope.trim_corners_collection} color={scope.trim_corners_color}
            onChange={(f, v) => setScope({ [`trim_corners_${f}`]: v } as any)} />
          <TrimRow name="Garage Wrap" on={!!scope.trim_garage} onToggle={() => setScope({ trim_garage: !scope.trim_garage })}
            type={scope.trim_garage_type} collection={scope.trim_garage_collection} color={scope.trim_garage_color}
            onChange={(f, v) => setScope({ [`trim_garage_${f}`]: v } as any)}
            extra={
              <div className="col-span-2 flex gap-3">
                {(['1_car', '2_car'] as const).map(sz => (
                  <button key={sz} type="button" onClick={() => setScope({ trim_garage_size: sz })}
                    className="flex-1 h-9 rounded-lg text-sm font-medium"
                    style={{
                      background: scope.trim_garage_size === sz ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)',
                      border: scope.trim_garage_size === sz ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: scope.trim_garage_size === sz ? '#60A5FA' : '#9CA3AF',
                    }}>
                    {sz === '1_car' ? '1 Car' : '2 Car'}
                  </button>
                ))}
              </div>
            }
          />
        </div>
      </CollapsibleSection>

      {/* S6: Roofline */}
      <CollapsibleSection title="Roofline" open={!!openSections.s6} onToggle={() => toggleSection('s6')}>
        <TrimRow name="Soffit/Fascia/Rake" on={!!scope.soffit} onToggle={() => setScope({ soffit: !scope.soffit })}
          type={scope.soffit_type} collection={scope.soffit_collection} color={scope.soffit_color}
          onChange={(f, v) => setScope({ [`soffit_${f}`]: v } as any)} />
      </CollapsibleSection>

      {/* S7: Seamless Gutters */}
      <CollapsibleSection title="Seamless Gutters" open={!!openSections.s7} onToggle={() => toggleSection('s7')}>
        <Toggle label="Seamless Gutters" on={!!scope.seamless_gutters} onToggle={() => setScope({ seamless_gutters: !scope.seamless_gutters })} />
        <AnimatePresence>
          {scope.seamless_gutters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <ScopeInput label="Size" value={scope.gutters_size ?? ''} onChange={v => setScope({ gutters_size: v })} />
                  <ScopeInput label="Color" value={scope.gutters_color ?? ''} onChange={v => setScope({ gutters_color: v })} />
                </div>
                <Toggle label="Leaf Guard" on={!!scope.gutters_leaf_guard} onToggle={() => setScope({ gutters_leaf_guard: !scope.gutters_leaf_guard })} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleSection>

      {/* S8: Accents */}
      <CollapsibleSection title="Accents" open={!!openSections.s8} onToggle={() => toggleSection('s8')}>
        <div className="space-y-3">
          <div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Vinyl Gable Vent</p>
            <div className="grid grid-cols-2 gap-2">
              <ScopeInput label="Qty" value={scope.gable_vent_qty ?? ''} type="number" onChange={v => setScope({ gable_vent_qty: Number(v) })} />
              <ScopeInput label="Color" value={scope.gable_vent_color ?? ''} onChange={v => setScope({ gable_vent_color: v })} />
            </div>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Vinyl Window Shutter</p>
            <div className="grid grid-cols-2 gap-2">
              <ScopeInput label="Qty" value={scope.shutter_qty ?? ''} type="number" onChange={v => setScope({ shutter_qty: Number(v) })} />
              <ScopeInput label="Color" value={scope.shutter_color ?? ''} onChange={v => setScope({ shutter_color: v })} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* S9: Additional Items */}
      <CollapsibleSection title="Additional Items" open={!!openSections.s9} onToggle={() => toggleSection('s9')}>
        <div className="space-y-4">
          {/* Band Board */}
          <div>
            <Toggle label="Band Board" on={!!scope.band_board} onToggle={() => setScope({ band_board: !scope.band_board })} />
            <AnimatePresence>
              {scope.band_board && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <ScopeInput label="Linear Ft" value={scope.band_board_lf ?? ''} type="number" onChange={v => setScope({ band_board_lf: Number(v) })} />
                    <ScopeInput label="Location" value={scope.band_board_location ?? ''} onChange={v => setScope({ band_board_location: v })} />
                    <ScopeInput label="Collection" value={scope.band_board_collection ?? ''} onChange={v => setScope({ band_board_collection: v })} />
                    <ScopeInput label="Color" value={scope.band_board_color ?? ''} onChange={v => setScope({ band_board_color: v })} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Frieze Board */}
          <div>
            <Toggle label="Frieze Board" on={!!scope.frieze_board} onToggle={() => setScope({ frieze_board: !scope.frieze_board })} />
            <AnimatePresence>
              {scope.frieze_board && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <ScopeInput label="Linear Ft" value={scope.frieze_board_lf ?? ''} type="number" onChange={v => setScope({ frieze_board_lf: Number(v) })} />
                    <ScopeInput label="Location" value={scope.frieze_board_location ?? ''} onChange={v => setScope({ frieze_board_location: v })} />
                    <ScopeInput label="Collection" value={scope.frieze_board_collection ?? ''} onChange={v => setScope({ frieze_board_collection: v })} />
                    <ScopeInput label="Color" value={scope.frieze_board_color ?? ''} onChange={v => setScope({ frieze_board_color: v })} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Porch Ceiling */}
          <div>
            <Toggle label="Porch Ceiling" on={!!scope.porch_ceiling} onToggle={() => setScope({ porch_ceiling: !scope.porch_ceiling })} />
            <AnimatePresence>
              {scope.porch_ceiling && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <ScopeInput label="Sq Ft" value={scope.porch_ceiling_sqft ?? ''} type="number" onChange={v => setScope({ porch_ceiling_sqft: Number(v) })} />
                    <ScopeInput label="Location" value={scope.porch_ceiling_location ?? ''} onChange={v => setScope({ porch_ceiling_location: v })} />
                    <ScopeInput label="Collection" value={scope.porch_ceiling_collection ?? ''} onChange={v => setScope({ porch_ceiling_collection: v })} />
                    <ScopeInput label="Color" value={scope.porch_ceiling_color ?? ''} onChange={v => setScope({ porch_ceiling_color: v })} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Beams/Posts/Columns */}
          <div>
            <Toggle label="Beams/Posts/Columns" on={!!scope.beams} onToggle={() => setScope({ beams: !scope.beams })} />
            <AnimatePresence>
              {scope.beams && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <ScopeInput label="Description" value={scope.beams_description ?? ''} onChange={v => setScope({ beams_description: v })} className="col-span-2" />
                    <ScopeInput label="Location" value={scope.beams_location ?? ''} onChange={v => setScope({ beams_location: v })} />
                    <ScopeInput label="Collection" value={scope.beams_collection ?? ''} onChange={v => setScope({ beams_collection: v })} />
                    <ScopeInput label="Color" value={scope.beams_color ?? ''} onChange={v => setScope({ beams_color: v })} className="col-span-2" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CollapsibleSection>

      {/* S10: Project Notes */}
      <CollapsibleSection title="Project Notes" open={openSections.s10 !== false} onToggle={() => toggleSection('s10')}>
        <div className="space-y-3">
          <div>
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Special Notes</p>
            <textarea
              value={scope.special_notes ?? ''}
              onChange={e => setScope({ special_notes: e.target.value })}
              placeholder="Additional scope details, customer preferences, site conditions…"
              rows={4}
              style={{ ...inputStyle, width: '100%', padding: '12px 14px', fontSize: '14px', resize: 'none', lineHeight: '1.5', height: 'auto' }}
            />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Offer Expiration Date</p>
            <input
              type="date"
              value={scope.offer_expiration_date ?? ''}
              onChange={e => setScope({ offer_expiration_date: e.target.value })}
              style={textInput}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
