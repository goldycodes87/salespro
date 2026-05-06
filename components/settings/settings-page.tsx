'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

type Rep = Record<string, any>
type Usage = {
  byService: Record<string, { count: number; cost: number }>
  totalCost: number
  count: number
}

const FINANCING_OPTIONS = [
  { label: 'Synchrony 18-Month No Interest', rate: 0 },
  { label: 'GreenSky 60-Month Fixed', rate: 9.99 },
  { label: 'Mosaic 84-Month Fixed', rate: 7.49 },
  { label: 'Cash / Check', rate: 0 },
]

const inputStyle: React.CSSProperties = {
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
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
    >
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

export default function SettingsPage({ rep, usage }: { rep: Rep; usage: Usage }) {
  const router = useRouter()

  const [profile, setProfile] = useState({
    full_name: rep.full_name ?? '',
    phone: rep.phone ?? '',
  })

  const settings = rep.settings ?? {}
  const [defaults, setDefaults] = useState({
    company_name: settings.company_name ?? 'Lifetime Home Remodeling',
    rep_title: settings.rep_title ?? 'Sales Representative',
    warranty_years: String(settings.warranty_years ?? '10'),
    default_margin: String(settings.default_margin ?? '35'),
  })

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [defaultsSaved, setDefaultsSaved] = useState(false)

  const saveProfile = async () => {
    setSavingProfile(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSavingProfile(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
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
    setDefaultsSaved(true)
    setTimeout(() => setDefaultsSaved(false), 2000)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-4 pt-6 pb-10 max-w-2xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Settings</h1>
      </div>

      {/* Rep Profile */}
      <Section title="Rep Profile">
        <Field label="Full Name">
          <FocusInput value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} placeholder="Eric Goldberg" />
        </Field>
        <Field label="Email">
          <div
            className="flex items-center h-12 px-4 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#6B7280' }}
          >
            {rep.email}
          </div>
        </Field>
        <Field label="Phone">
          <FocusInput value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} type="tel" placeholder="(719) 555-0100" />
        </Field>
        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="w-full h-11 rounded-xl text-sm font-semibold"
          style={{
            background: profileSaved ? 'rgba(16,185,129,0.2)' : 'rgba(29,78,216,0.2)',
            color: profileSaved ? '#34D399' : '#60A5FA',
            border: `1px solid ${profileSaved ? 'rgba(16,185,129,0.3)' : 'rgba(29,78,216,0.3)'}`,
          }}
        >
          {savingProfile ? 'Saving…' : profileSaved ? 'Saved!' : 'Save Profile'}
        </button>
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
        <button
          onClick={saveDefaults}
          disabled={savingDefaults}
          className="w-full h-11 rounded-xl text-sm font-semibold"
          style={{
            background: defaultsSaved ? 'rgba(16,185,129,0.2)' : 'rgba(29,78,216,0.2)',
            color: defaultsSaved ? '#34D399' : '#60A5FA',
            border: `1px solid ${defaultsSaved ? 'rgba(16,185,129,0.3)' : 'rgba(29,78,216,0.3)'}`,
          }}
        >
          {savingDefaults ? 'Saving…' : defaultsSaved ? 'Saved!' : 'Save Defaults'}
        </button>
      </Section>

      {/* Financing Options */}
      <Section title="Financing Options">
        <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>Available in proposal builder (Block 3)</p>
        <div className="space-y-2">
          {FINANCING_OPTIONS.map(f => (
            <div
              key={f.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-sm" style={{ color: '#D1D5DB' }}>{f.label}</span>
              <span className="text-xs font-medium" style={{ color: f.rate === 0 ? '#34D399' : '#9CA3AF' }}>
                {f.rate === 0 ? '0%' : `${f.rate}%`}
              </span>
            </div>
          ))}
        </div>
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
              <span className="text-sm font-mono" style={{ color: '#9CA3AF' }}>
                ${data.cost.toFixed(3)}
              </span>
            </div>
          ))}
          {usage.count === 0 && (
            <p className="text-sm" style={{ color: '#6B7280' }}>No API usage this month</p>
          )}
          {usage.count > 0 && (
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Total estimated</span>
              <span className="text-sm font-bold font-mono" style={{ color: '#06B6D4' }}>
                ${usage.totalCost.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* Account */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Account</h2>
        </div>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{rep.full_name || profile.full_name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{rep.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full px-5 py-4 text-left text-sm font-medium transition-all active:opacity-70"
          style={{ color: '#EF4444' }}
        >
          Sign out
        </button>
      </div>
    </motion.div>
  )
}
