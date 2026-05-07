'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import type { FinancingOptionSetting, DiscountOptionSetting } from '@/lib/pricing'
import { DEFAULT_FINANCING_SETTINGS, DEFAULT_DISCOUNT_SETTINGS } from '@/lib/pricing'
import { formatPhone } from '@/hooks/usePhoneFormat'
import { PERSONAS } from '@/lib/coach-personas'

function PersonaPhoto({ personaId, color }: { personaId: string; color: string }) {
  const [error, setError] = useState(false)
  const persona = PERSONAS.find(p => p.id === personaId)!
  if (error) {
    return (
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
        style={{ background: color }}
      >
        {persona.avatar}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/coaches/${personaId}.png`}
      alt={persona.name}
      className="w-14 h-14 rounded-2xl object-cover object-top flex-shrink-0"
      onError={() => setError(true)}
    />
  )
}

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

type TabId = 'general' | 'coach' | 'calendar'

export default function SettingsPage({
  rep,
  usage,
  coachConfig,
  calendarConnections,
}: {
  rep: Rep
  usage: Usage
  coachConfig?: { active_persona_id?: string } | null
  calendarConnections?: Array<{ id: string; provider: string; ical_url?: string | null; last_synced_at?: string | null }> | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const settings = rep.settings ?? {}

  const initialTab = (searchParams.get('tab') as TabId) ?? 'general'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Notification from OAuth callback
  const connectedParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

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

  // Coach state
  const [activePersonaId, setActivePersonaId] = useState(coachConfig?.active_persona_id ?? 'jordan')
  const [savingPersona, setSavingPersona] = useState(false)
  const [personaSaved, setPersonaSaved] = useState(false)
  const [clearingPersona, setClearingPersona] = useState<string | null>(null)

  // Calendar state
  const [connections, setConnections] = useState(calendarConnections ?? [])
  const [icalUrl, setIcalUrl] = useState('')
  const [addingIcal, setAddingIcal] = useState(false)
  const [icalError, setIcalError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [removingConn, setRemovingConn] = useState<string | null>(null)

  const savedFlash = (setter: (v: boolean) => void) => {
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
    savedFlash(setProfileSaved)
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
    savedFlash(setDefaultsSaved)
  }

  const saveFinancing = async () => {
    setSavingFinancing(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...settings, financing_options: financingOpts } }),
    })
    setSavingFinancing(false)
    savedFlash(setFinancingSaved)
  }

  const saveDiscounts = async () => {
    setSavingDiscounts(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...settings, discount_options: discountOpts } }),
    })
    setSavingDiscounts(false)
    savedFlash(setDiscountsSaved)
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

  const savePersona = async (personaId: string) => {
    setActivePersonaId(personaId)
    setSavingPersona(true)
    await fetch('/api/coach/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_persona_id: personaId }),
    })
    setSavingPersona(false)
    savedFlash(setPersonaSaved)
  }

  const clearPersonaHistory = async (personaId: string) => {
    setClearingPersona(personaId)
    await fetch(`/api/coach/messages?personaId=${personaId}`, { method: 'DELETE' })
    setClearingPersona(null)
  }

  const addIcalUrl = async () => {
    if (!icalUrl.trim()) return
    setAddingIcal(true)
    setIcalError(null)
    try {
      const res = await fetch('/api/calendar/ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icalUrl: icalUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add calendar')
      setIcalUrl('')
      router.refresh()
    } catch (err: any) {
      setIcalError(err.message)
    } finally {
      setAddingIcal(false)
    }
  }

  const syncCalendars = async () => {
    setSyncing(true)
    try {
      await fetch('/api/calendar/sync', { method: 'POST' })
    } finally {
      setSyncing(false)
    }
  }

  const removeConnection = async (id: string) => {
    setRemovingConn(id)
    try {
      await fetch(`/api/calendar/connections/${id}`, { method: 'DELETE' })
      setConnections(prev => prev.filter(c => c.id !== id))
    } finally {
      setRemovingConn(null)
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'coach', label: 'Coach' },
    { id: 'calendar', label: 'Calendar' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="px-4 pt-6 pb-10 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Settings</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
            style={{
              background: activeTab === tab.id ? 'rgba(29,78,216,0.3)' : 'transparent',
              color: activeTab === tab.id ? '#60A5FA' : '#6B7280',
              border: activeTab === tab.id ? '1px solid rgba(29,78,216,0.3)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications from OAuth */}
      {activeTab === 'calendar' && connectedParam && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34D399' }}>
          {connectedParam === 'google' ? 'Google Calendar connected!' : 'Calendar connected!'}
        </div>
      )}
      {activeTab === 'calendar' && errorParam && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
          Connection failed. Please try again.
        </div>
      )}

      {/* GENERAL TAB */}
      {activeTab === 'general' && (
        <>
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
                      <SmallInput value={opt.factor ?? ''} onChange={v => updateFinancing(idx, { factor: parseFloat(v) || 0 })}
                        type="number" placeholder="0.01161" style={{ flex: 1 }} />
                      <span className="text-xs" style={{ color: '#4B5563' }}>
                        {opt.factor ? `≈ ${(opt.factor * 100).toFixed(4)}%` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#6B7280' }}>Months</span>
                      <SmallInput value={opt.months ?? ''} onChange={v => updateFinancing(idx, { months: parseInt(v) || 0 })}
                        type="number" placeholder="18" style={{ flex: 1 }} />
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
                      <SmallInput value={opt.pct} onChange={v => updateDiscount(idx, { pct: parseFloat(v) || 0 })}
                        type="number" placeholder="20" style={{ flex: 1 }} />
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
        </>
      )}

      {/* COACH TAB */}
      {activeTab === 'coach' && (
        <>
          <Section title="Default Coach">
            <p className="text-xs -mt-1 mb-1" style={{ color: '#6B7280' }}>
              Your active coach when you open the Coach tab.
            </p>
            <div className="space-y-2">
              {PERSONAS.map((persona) => {
                const isActive = persona.id === activePersonaId
                return (
                  <button
                    key={persona.id}
                    onClick={() => savePersona(persona.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      background: isActive ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.03)',
                      border: isActive ? '1.5px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <PersonaPhoto personaId={persona.id} color={persona.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{persona.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                          {persona.tagline}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>
                        {persona.welcomeMessage('you').slice(0, 60)}…
                      </p>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#1D4ED8' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {personaSaved && (
              <p className="text-xs text-center mt-2" style={{ color: '#34D399' }}>Saved!</p>
            )}
          </Section>

          <Section title="Conversation History">
            <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>
              Clear chat history for a specific coach. This also clears their memory of you.
            </p>
            <div className="space-y-2">
              {PERSONAS.map((persona) => (
                <div key={persona.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '18px' }}>{persona.avatar}</span>
                    <span className="text-sm font-medium" style={{ color: '#D1D5DB' }}>{persona.name}</span>
                  </div>
                  <button
                    onClick={() => clearPersonaHistory(persona.id)}
                    disabled={clearingPersona === persona.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#F87171',
                    }}
                  >
                    {clearingPersona === persona.id ? 'Clearing…' : 'Clear'}
                  </button>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <>
          {/* Google Calendar */}
          <Section title="Google Calendar">
            {connections.some(c => c.provider === 'google') ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Connected</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>Google Calendar</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const conn = connections.find(c => c.provider === 'google')
                    if (conn) removeConnection(conn.id)
                  }}
                  disabled={removingConn !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                  Sync your Google Calendar to see appointments in SalesPro.
                </p>
                <a
                  href="/api/auth/google/calendar"
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(29,78,216,0.2)', border: '1px solid rgba(29,78,216,0.3)', color: '#60A5FA' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Connect Google Calendar
                </a>
              </div>
            )}
          </Section>

          {/* iCal URL */}
          <Section title="iCal / CalDAV URL">
            <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>
              Add an iCal feed URL (Apple Calendar, Outlook, or any .ics feed).
            </p>
            <div className="space-y-2">
              {connections.filter(c => c.provider === 'ical').map((conn) => (
                <div key={conn.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#9CA3AF' }}>
                      {conn.ical_url ?? 'iCal feed'}
                    </p>
                    {conn.last_synced_at && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#4B5563' }}>
                        Synced {new Date(conn.last_synced_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeConnection(conn.id)}
                    disabled={removingConn === conn.id}
                    style={{ color: '#4B5563', flexShrink: 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <Field label="iCal Feed URL">
              <FocusInput
                value={icalUrl}
                onChange={setIcalUrl}
                placeholder="https://calendar.google.com/calendar/ical/..."
              />
            </Field>
            {icalError && (
              <p className="text-xs" style={{ color: '#F87171' }}>{icalError}</p>
            )}
            <button
              onClick={addIcalUrl}
              disabled={addingIcal || !icalUrl.trim()}
              className="w-full h-11 rounded-xl text-sm font-semibold"
              style={{
                background: 'rgba(29,78,216,0.2)',
                border: '1px solid rgba(29,78,216,0.3)',
                color: '#60A5FA',
                opacity: !icalUrl.trim() ? 0.5 : 1,
              }}
            >
              {addingIcal ? 'Adding…' : 'Add iCal URL'}
            </button>
          </Section>

          {/* Outlook placeholder */}
          <Section title="Microsoft Outlook">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>Microsoft Outlook</p>
                <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>Coming soon</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#4B5563', border: '1px solid rgba(255,255,255,0.06)' }}>
                Soon
              </span>
            </div>
          </Section>

          {/* Sync */}
          {connections.length > 0 && (
            <button
              onClick={syncCalendars}
              disabled={syncing}
              className="w-full h-11 rounded-xl text-sm font-semibold mb-4"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9CA3AF',
              }}
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          )}
        </>
      )}
    </motion.div>
  )
}
