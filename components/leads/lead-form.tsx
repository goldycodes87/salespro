'use client'

import { useState } from 'react'
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
      onChange={e => onChange(e.target.value)}
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

export default function LeadForm() {
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form) => (v: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.address || !form.city || !form.zip) {
      setError('Please fill in all required fields.')
      return
    }
    setError(null)
    setLoading(true)

    const payload = {
      ...form,
      lead_source: form.lead_source === 'Other' ? form.lead_source_other || 'Other' : form.lead_source,
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save lead')
      router.push(`/leads/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      {/* Research loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
            style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(12px)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', boxShadow: '0 8px 32px rgba(29,78,216,0.4)' }}
            >
              <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" style={{ borderWidth: '3px' }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1" style={{ color: '#F9FAFB' }}>
                Researching property and homeowner…
              </p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Searching county records and public data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="pb-32">
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

        {/* Sticky submit bar */}
        <div
          className="fixed bottom-0 left-0 right-0 z-30 px-4 py-4"
          style={{
            background: 'rgba(10,15,30,0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl text-base font-semibold"
            style={{
              background: loading ? 'rgba(29,78,216,0.4)' : 'linear-gradient(135deg, #1D4ED8, #0F766E)',
              color: '#fff',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(29,78,216,0.35)',
            }}
          >
            {loading ? 'Researching…' : 'Save Lead & Research'}
          </button>
        </div>
      </form>
    </>
  )
}
