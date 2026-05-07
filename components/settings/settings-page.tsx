'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import type { FinancingOptionSetting, DiscountOptionSetting } from '@/lib/pricing'
import { DEFAULT_FINANCING_SETTINGS, DEFAULT_DISCOUNT_SETTINGS } from '@/lib/pricing'
import { formatPhone } from '@/hooks/usePhoneFormat'

type Rep = Record<string, any>
type Usage = {
  byService: Record<string, { count: number; cost: number }>
  totalCost: number
  count: number
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px',
  color: '#F9FAFB',
  width: '100%',
  height: '44px',
  padding: '0 14px',
  fontSize: '14px',
  outline: 'none',
}

const focusStyle: React.CSSProperties = {
  background: 'rgba(29,78,216,0.08)',
  border: '1px solid rgba(29,78,216,0.5)',
}

function FocusInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === 'tel' ? formatPhone(e.target.value) : e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, height: '48px', fontSize: '15px', ...(focused ? focusStyle : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function SmallInput({ value, onChange, placeholder, type = 'text', style }: {
  value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, height: '38px', fontSize: '13px', ...(focused ? focusStyle : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className="relative flex-shrink-0 cursor-pointer" style={{ width: '36px', height: '22px' }}>
      <div className="absolute inset-0 rounded-full transition-all"
        style={{ background: on ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
      <div className="absolute top-[2px] rounded-full transition-all"
        style={{ width: '18px', height: '18px', background: '#fff', left: on ? '16px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
      {children}
    </div>
  )
}

function SaveButton({ saving, saved, onClick, label = 'Save' }: {
  saving: boolean; saved: boolean; onClick: () => void; label?: string
}) {
  return (
    <button onClick={onClick} disabled={saving}
      className="w-full h-11 rounded-xl text-sm font-semibold"
      style={{
        background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(29,78,216,0.2)',
        color: saved ? '#34D399' : '#60A5FA',
        border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(29,78,216,0.3)'}`,
      }}>
      {saving ? 'Saving…' : saved ? 'Saved!' : label}
    </button>
  )
}

export default function SettingsPage({ rep, usage }: { rep: Rep; usage: Usage }) {
  const router = useRouter()
  const settings = rep.settings ?? {}

  const [profile, setProfile] = useState({
    full_name: rep.full_name ?? '',
    phone: rep.phone ?? '',
  })
  const [defaults, setDefaults] = useState({
    company_name: settings.company_name ?? 'Lifetime Home Remodeling',
    rep_title: settings.rep_title ?? 'Sales Representative',
    warranty_years: String(settings.warranty_years ?? '10'),
    default_margin: String(settings.default_margin ?? '35'),
  })
  const [financingOpts, setFinancingOpts] = useState<FinancingOptionSetting[]>(
    settings.financing_options ?? DEFAULT_FINANCING_SETTINGS
  )
  const [discountOpts, setDiscountOpts] = useState<DiscountOptionSetting[]>(
    settings.discount_options ?? DEFAULT_DISCOUNT_SETTINGS
  )

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [savingFinancing, setSavingFinancing] = useState(false)
  const [savingDiscounts, setSavingDiscounts] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [defaultsSaved, setDefaultsSaved] = useState(false)
  const [financingSaved, setFinancingSaved] = useState(false)
  const [discountsSaved, setDiscountsSaved] = useState(false)
  const [headshot, setHeadshot] = useState<string | null>(rep.headshot_url ?? null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const saved = (setter: (v: boolean) => void) => {
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const uploadHeadshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/reps/headshot', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setHeadshot(data.headshot_url)
    } catch (err: any) {
      setPhotoError(err.message)
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: profile.full_name, phone: profile.phone.replace(/\D/g, '') || null }),
    })
    setSavingProfile(false)
    saved(setProfileSaved)
  }

  const saveDefaults = async () => {
    setSavingDefaults(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          ...settings,
          company_name: defaults.company_name,
          rep_title: defaults.rep_title,
          warranty_years: Number(defaults.warranty_years),
          default_margin: Number(defaults.default_margin),
        },
      }),
    })
    setSavingDefaults(false)
    saved(setDefaultsSaved)
  }

  const saveFinancing = async () => {
    setSavingFinancing(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...settings, financing_options: financingOpts } }),
    })
    setSavingFinancing(false)
    saved(setFinancingSaved)
  }

  const saveDiscounts = async () => {
    setSavingDiscounts(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...settings, discount_options: discountOpts } }),
    })
    setSavingDiscounts(false)
    saved(setDiscountsSaved)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const updateFinancing = (idx: number, updates: Partial<FinancingOptionSetting>) =>
    setFinancingOpts(prev => prev.map((o, i) => i === idx ? { ...o, ...updates } : o))
  const removeFinancing = (idx: number) =>
    setFinancingOpts(prev => prev.filter((_, i) => i !== idx))
  const addFinancing = () =>
    setFinancingOpts(prev => [...prev, {
      id: `custom_${Date.now()}`, label: '', method: 'factor', factor: 0.01, active: true,
    }])

  const updateDiscount = (idx: number, updates: Partial<DiscountOptionSetting>) =>
    setDiscountOpts(prev => prev.map((o, i) => i === idx ? { ...o, ...updates } : o))
  const removeDiscount = (idx: number) =>
    setDiscountOpts(prev => prev.filter((_, i) => i !== idx))
  const addDiscount = () =>
    setDiscountOpts(prev => [...prev, {
      id: `custom_${Date.now()}`, name: '', pct: 10, type: 'promotion', active: true,
    }])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="px-4 pt-6 pb-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Settings</h1>
      </div>

      {/* Profile Photo */}
      <Section title="Profile Photo">
        <div className="flex flex-col items-center gap-4 py-2">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: 'rgba(29,78,216,0.15)', border: '2px solid rgba(29,78,216,0.3)' }}>
              {headshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headshot} alt="Headshot" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif"
              className="hidden" onChange={uploadHeadshot} disabled={uploadingPhoto} />
          </label>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            {uploadingPhoto ? 'Uploading…' : 'Tap to upload (JPG, PNG, HEIC)'}
          </p>
          {photoError && <p className="text-xs" style={{ color: '#EF4444' }}>{photoError}</p>}
        </div>
      </Section>

      {/* Rep Profile */}
      <Section title="Rep Profile">
        <Field label="Full Name">
          <FocusInput value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} placeholder="Eric Goldberg" />
        </Field>
        <Field label="Email">
          <div className="flex items-center h-12 px-4 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#6B7280' }}>
            {rep.email}
          </div>
        </Field>
        <Field label="Phone">
          <FocusInput value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} type="tel" placeholder="719-555-0100" />
        </Field>
        <SaveButton saving={savingProfile} saved={profileSaved} onClick={saveProfile} label="Save Profile" />
      </Section>

      {/* Proposal Defaults */}
      <Section title="Proposal Defaults">
        <Field label="Company Name">
          <FocusInput value={defaults.company_name} onChange={v => setDefaults(d => ({ ...d, company_name: v }))} placeholder="Lifetime Home Remodeling" />
        </Field>
        <Field label="Your Title">
          <FocusInput value={defaults.rep_title} onChange={v => setDefaults(d => ({ ...d, rep_title: v }))} placeholder="Sales Representative" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default Warranty (years)">
            <FocusInput value={defaults.warranty_years} onChange={v => setDefaults(d => ({ ...d, warranty_years: v }))} type="number" placeholder="10" />
          </Field>
          <Field label="Default Margin %">
            <FocusInput value={defaults.default_margin} onChange={v => setDefaults(d => ({ ...d, default_margin: v }))} type="number" placeholder="35" />
          </Field>
        </div>
        <SaveButton saving={savingDefaults} saved={defaultsSaved} onClick={saveDefaults} label="Save Defaults" />
      </Section>

      {/* Financing Options */}
      <Section title="Financing Options">
        <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>Configure available financing options in the proposal builder.</p>
        <div className="space-y-3">
          {financingOpts.map((opt, idx) => (
            <div key={opt.id} className="rounded-xl p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Toggle on={opt.active} onToggle={() => updateFinancing(idx, { active: !opt.active })} />
                <SmallInput value={opt.label} onChange={v => updateFinancing(idx, { label: v })}
                  placeholder="Option name" style={{ flex: 1 }} />
                <button type="button" onClick={() => removeFinancing(idx)} style={{ color: '#4B5563', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2">
                {(['factor', 'months'] as const).map(m => (
                  <button key={m} type="button" onClick={() => updateFinancing(idx, { method: m })}
                    className="flex-1 h-8 rounded-lg text-xs font-medium"
                    style={{
                      background: opt.method === m ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)',
                      border: opt.method === m ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: opt.method === m ? '#60A5FA' : '#9CA3AF',
                    }}>
                    {m === 'factor' ? 'Factor × price' : 'Price ÷ months'}
                  </button>
                ))}
              </div>
              {opt.method === 'factor' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#6B7280' }}>Factor</span>
                  <SmallInput
                    value={opt.factor ?? ''}
                    onChange={v => updateFinancing(idx, { factor: parseFloat(v) || 0 })}
                    type="number"
                    placeholder="0.01161"
                    style={{ flex: 1 }}
                  />
                  <span className="text-xs" style={{ color: '#4B5563' }}>
                    {opt.factor ? `≈ ${(opt.factor * 100).toFixed(4)}%` : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#6B7280' }}>Months</span>
                  <SmallInput
                    value={opt.months ?? ''}
                    onChange={v => updateFinancing(idx, { months: parseInt(v) || 0 })}
                    type="number"
                    placeholder="18"
                    style={{ flex: 1 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addFinancing}
          className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: '#6B7280' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Financing Option
        </button>
        <SaveButton saving={savingFinancing} saved={financingSaved} onClick={saveFinancing} label="Save Financing" />
      </Section>

      {/* Promotional Discounts */}
      <Section title="Promotional Discounts">
        <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>Configure discount options available in the proposal builder.</p>
        <div className="space-y-3">
          {discountOpts.map((opt, idx) => (
            <div key={opt.id} className="rounded-xl p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Toggle on={opt.active} onToggle={() => updateDiscount(idx, { active: !opt.active })} />
                <SmallInput value={opt.name} onChange={v => updateDiscount(idx, { name: v })}
                  placeholder="Discount name" style={{ flex: 1 }} />
                <button type="button" onClick={() => removeDiscount(idx)} style={{ color: '#4B5563', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs" style={{ color: '#6B7280' }}>%</span>
                  <SmallInput
                    value={opt.pct}
                    onChange={v => updateDiscount(idx, { pct: parseFloat(v) || 0 })}
                    type="number"
                    placeholder="20"
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="flex gap-1.5">
                  {(['promotion', 'bnsn', 'cash'] as const).map(t => (
                    <button key={t} type="button" onClick={() => updateDiscount(idx, { type: t })}
                      className="px-2 h-8 rounded-lg text-xs font-medium"
                      style={{
                        background: opt.type === t ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)',
                        border: opt.type === t ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        color: opt.type === t ? '#60A5FA' : '#9CA3AF',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {opt.type === 'bnsn' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle on={!!opt.is_combined} onToggle={() => updateDiscount(idx, { is_combined: !opt.is_combined })} />
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>Combined (flat rate, not additive)</span>
                </label>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addDiscount}
          className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: '#6B7280' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Discount Option
        </button>
        <SaveButton saving={savingDiscounts} saved={discountsSaved} onClick={saveDiscounts} label="Save Discounts" />
      </Section>

      {/* API Usage */}
      <Section title="API Usage This Month">
        <div className="space-y-3">
          {Object.entries(usage.byService).map(([svc, data]) => (
            <div key={svc} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize" style={{ color: '#F9FAFB' }}>{svc.replace('_', ' ')}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{data.count} call{data.count !== 1 ? 's' : ''}</p>
              </div>
              <span className="text-sm font-mono" style={{ color: '#9CA3AF' }}>${data.cost.toFixed(3)}</span>
            </div>
          ))}
          {usage.count === 0 && (
            <p className="text-sm" style={{ color: '#6B7280' }}>No API usage this month</p>
          )}
          {usage.count > 0 && (
            <div className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Total estimated</span>
              <span className="text-sm font-bold font-mono" style={{ color: '#06B6D4' }}>${usage.totalCost.toFixed(3)}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Account */}
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Account</h2>
        </div>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{rep.full_name || profile.full_name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{rep.email}</p>
        </div>
        <button onClick={handleSignOut}
          className="w-full px-5 py-4 text-left text-sm font-medium transition-all active:opacity-70"
          style={{ color: '#EF4444' }}>
          Sign out
        </button>
      </div>
    </motion.div>
  )
}
