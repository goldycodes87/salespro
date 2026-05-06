'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const LEAD_SOURCES = [
  'Lifetime Home Remodeling',
  'Self-Generated',
  'Referral',
  'Online/Web',
  'Costco',
  'Other',
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
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

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
        {label}
        {required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

function Input({
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
      style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...inputStyle,
        appearance: 'none',
        WebkitAppearance: 'none',
        cursor: 'pointer',
        ...(focused ? focusStyle : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o} value={o} style={{ background: '#1F2937' }}>
          {o}
        </option>
      ))}
    </select>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B7280' }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

type ReferralResult = { id: string; first_name: string; last_name: string; city: string; state: string }

function ReferralSearch({
  value,
  onSelect,
}: {
  value: { id: string; name: string } | null
  onSelect: (lead: { id: string; name: string } | null) => void
}) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<ReferralResult[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) setQuery(value.name)
  }, [value])

  const search = (q: string) => {
    setQuery(q)
    onSelect(null)
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/leads/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data: ReferralResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      }
    }, 300)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => search(e.target.value)}
        placeholder="Search by name…"
        style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery('') }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: '#6B7280' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
            style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {results.map(r => (
              <button
                key={r.id}
                type="button"
                className="w-full px-4 py-3 text-left text-sm"
                style={{ color: '#F9FAFB', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                onMouseDown={() => {
                  const name = `${r.first_name} ${r.last_name}`
                  onSelect({ id: r.id, name })
                  setQuery(name)
                  setOpen(false)
                }}
              >
                <span className="font-medium">{r.first_name} {r.last_name}</span>
                <span className="ml-2 text-xs" style={{ color: '#6B7280' }}>{r.city}, {r.state}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LeadForm({ redirectAfterSave }: { redirectAfterSave?: string }) {
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    is_married: false,
    spouse_first_name: '',
    spouse_last_name: '',
    spouse_phone: '',
    spouse_email: '',
    address: '',
    city: '',
    state: 'CO',
    zip: '',
    appointment_date: today,
    lead_source: '',
    lead_source_other: '',
    notes: '',
  })

  const [referredBy, setReferredBy] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form) => (v: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: v }))

  const validate = () => {
    if (!form.first_name || !form.last_name || !form.address || !form.city || !form.zip) {
      setError('Please fill in all required fields.')
      return false
    }
    setError(null)
    return true
  }

  const buildPayload = () => ({
    ...form,
    lead_source: form.lead_source === 'Other' ? form.lead_source_other || 'Other' : form.lead_source,
    referred_by_lead_id: referredBy?.id ?? null,
  })

  const saveLead = async () => {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save lead')
    return data.id as string
  }

  const handleSave = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const id = await saveLead()
      router.push(redirectAfterSave ? `${redirectAfterSave}?lead_id=${id}` : `/leads/${id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const busy = loading

  return (
    <>
      <form className="pb-48">
        {/* Primary Contact */}
        <Section title="Primary Contact">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required>
              <Input value={form.first_name} onChange={set('first_name')} placeholder="John" />
            </Field>
            <Field label="Last Name" required>
              <Input value={form.last_name} onChange={set('last_name')} placeholder="Smith" />
            </Field>
          </div>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} type="tel" placeholder="(719) 555-0100" />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={set('email')} type="email" placeholder="john@example.com" />
          </Field>
        </Section>

        {/* Spouse / Co-owner */}
        <Section title="Spouse / Co-owner">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('is_married')(!form.is_married)}
              className="relative flex-shrink-0"
              style={{ width: '44px', height: '26px' }}
            >
              <div
                className="absolute inset-0 rounded-full transition-all"
                style={{ background: form.is_married ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }}
              />
              <div
                className="absolute top-1 rounded-full transition-all"
                style={{
                  width: '18px', height: '18px',
                  background: '#fff',
                  left: form.is_married ? '22px' : '4px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              />
            </div>
            <span className="text-sm font-medium" style={{ color: '#D1D5DB' }}>
              Married / Co-owner
            </span>
          </label>

          <AnimatePresence>
            {form.is_married && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Spouse First Name">
                    <Input value={form.spouse_first_name} onChange={set('spouse_first_name')} placeholder="Jane" />
                  </Field>
                  <Field label="Spouse Last Name">
                    <Input value={form.spouse_last_name} onChange={set('spouse_last_name')} placeholder="Smith" />
                  </Field>
                </div>
                <Field label="Spouse Phone">
                  <Input value={form.spouse_phone} onChange={set('spouse_phone')} type="tel" placeholder="(719) 555-0101" />
                </Field>
                <Field label="Spouse Email">
                  <Input value={form.spouse_email} onChange={set('spouse_email')} type="email" placeholder="jane@example.com" />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* Address */}
        <Section title="Property Address">
          <Field label="Street Address" required>
            <Input value={form.address} onChange={set('address')} placeholder="123 Main St" />
          </Field>
          <Field label="City" required>
            <Input value={form.city} onChange={set('city')} placeholder="Denver" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State">
              <Select value={form.state} onChange={set('state')} options={US_STATES} />
            </Field>
            <Field label="ZIP" required>
              <Input value={form.zip} onChange={set('zip')} placeholder="80202" />
            </Field>
          </div>
        </Section>

        {/* Appointment Info */}
        <Section title="Appointment Info">
          <Field label="Appointment Date">
            <Input value={form.appointment_date} onChange={set('appointment_date')} type="date" />
          </Field>
          <Field label="Lead Source">
            <Select
              value={form.lead_source}
              onChange={set('lead_source')}
              options={LEAD_SOURCES}
              placeholder="Select source…"
            />
          </Field>
          <AnimatePresence>
            {form.lead_source === 'Other' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Field label="Describe source">
                  <Input value={form.lead_source_other} onChange={set('lead_source_other')} placeholder="e.g. Door knock, Trade show…" />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {form.lead_source === 'Referral' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Field label="Referred by">
                  <ReferralSearch value={referredBy} onSelect={setReferredBy} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* Notes */}
        <Section title="Notes (optional)">
          <textarea
            value={form.notes}
            onChange={e => set('notes')(e.target.value)}
            placeholder="Any context about this lead…"
            rows={4}
            style={{
              ...inputStyle,
              height: 'auto',
              padding: '12px 14px',
              resize: 'none',
              lineHeight: '1.5',
            }}
          />
        </Section>

        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
          >
            {error}
          </div>
        )}

        {/* Sticky save bar — sits above the 72px bottom nav */}
        <div
          className="fixed left-0 right-0 z-50 px-4 py-3"
          style={{
            bottom: 'calc(72px + env(safe-area-inset-bottom))',
            background: 'rgba(10,15,30,0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="w-full h-12 rounded-2xl text-base font-semibold"
            style={{
              background: busy ? 'rgba(29,78,216,0.4)' : 'linear-gradient(135deg, #1D4ED8, #0F766E)',
              color: '#fff',
              boxShadow: busy ? 'none' : '0 4px 24px rgba(29,78,216,0.35)',
            }}
          >
            {loading ? 'Saving…' : 'Save Lead'}
          </button>
        </div>
      </form>
    </>
  )
}
