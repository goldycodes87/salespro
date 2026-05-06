'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type CustomerInfo = {
  first_name: string
  last_name: string
  email: string
  phone: string
  spouse_first_name: string
  spouse_last_name: string
  address: string
  city: string
  state: string
  zip: string
}

type LeadResult = { id: string; first_name: string; last_name: string; city: string; state: string }

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

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function LeadSearch({
  linkedLead,
  onSelect,
  onCreateNew,
}: {
  linkedLead: { id: string; name: string } | null
  onSelect: (lead: { id: string; name: string; data: LeadResult }) => void
  onCreateNew: () => void
}) {
  const [query, setQuery] = useState(linkedLead?.name ?? '')
  const [results, setResults] = useState<LeadResult[]>([])
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (linkedLead) setQuery(linkedLead.name)
  }, [linkedLead])

  const search = (q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/leads/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data: LeadResult[] = await res.json()
        setResults(data)
        setOpen(true)
      }
    }, 300)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { search(e.target.value); if (linkedLead) onSelect({ id: '', name: '', data: { id: '', first_name: '', last_name: '', city: '', state: '' } }) }}
          placeholder="Search leads by name…"
          autoComplete="off"
          style={{ ...inputStyle, ...(focused ? focusStyle : {}), paddingRight: linkedLead ? '36px' : '14px' }}
          onFocus={() => { setFocused(true); if (query.length >= 2) setOpen(true) }}
          onBlur={() => setFocused(false)}
        />
        {linkedLead && (
          <button type="button" onClick={() => { onSelect({ id: '', name: '', data: { id: '', first_name: '', last_name: '', city: '', state: '' } }); setQuery('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {linkedLead && linkedLead.id && (
        <div className="flex items-center gap-2 mt-1.5 px-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399' }} />
          <span className="text-xs" style={{ color: '#34D399' }}>Linked to lead — customer info pre-filled</span>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
            style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            {results.map(r => (
              <button key={r.id} type="button"
                className="w-full px-4 py-3 text-left text-sm transition-colors"
                style={{ color: '#F9FAFB', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                onMouseDown={() => {
                  const name = `${r.first_name} ${r.last_name}`
                  onSelect({ id: r.id, name, data: r })
                  setQuery(name)
                  setOpen(false)
                }}>
                <span className="font-medium">{r.first_name} {r.last_name}</span>
                <span className="ml-2 text-xs" style={{ color: '#6B7280' }}>{r.city}, {r.state}</span>
              </button>
            ))}
            <button type="button"
              className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 font-medium"
              style={{ color: '#60A5FA' }}
              onMouseDown={() => { setOpen(false); onCreateNew() }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create New Lead
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CustomerStep({
  value,
  onChange,
  linkedLead,
  onLinkLead,
  onCreateNewLead,
}: {
  value: CustomerInfo
  onChange: (v: CustomerInfo) => void
  linkedLead?: { id: string; name: string } | null
  onLinkLead?: (lead: { id: string; name: string } | null) => void
  onCreateNewLead?: () => void
}) {
  const set = (key: keyof CustomerInfo) => (v: string) => onChange({ ...value, [key]: v })

  return (
    <div>
      <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>Customer Info</h2>
      <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Link to a lead or enter manually</p>

      {/* Lead search */}
      <div className="mb-5 p-4 rounded-2xl" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>LINK TO LEAD</p>
        <LeadSearch
          linkedLead={linkedLead ?? null}
          onSelect={lead => {
            if (onLinkLead) {
              if (!lead.id) { onLinkLead(null); return }
              onLinkLead({ id: lead.id, name: lead.name })
            }
          }}
          onCreateNew={() => onCreateNewLead?.()}
        />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" required>
            <Input value={value.first_name} onChange={set('first_name')} placeholder="John" />
          </Field>
          <Field label="Last Name" required>
            <Input value={value.last_name} onChange={set('last_name')} placeholder="Smith" />
          </Field>
        </div>
        <Field label="Email">
          <Input value={value.email} onChange={set('email')} type="email" placeholder="john@example.com" />
        </Field>
        <Field label="Phone">
          <Input value={value.phone} onChange={set('phone')} type="tel" placeholder="719-555-0100" />
        </Field>
        <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>SPOUSE (OPTIONAL)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Spouse First">
              <Input value={value.spouse_first_name} onChange={set('spouse_first_name')} placeholder="Jane" />
            </Field>
            <Field label="Spouse Last">
              <Input value={value.spouse_last_name} onChange={set('spouse_last_name')} placeholder="Smith" />
            </Field>
          </div>
        </div>
        <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>PROPERTY ADDRESS</p>
          <div className="space-y-3">
            <Field label="Street Address">
              <Input value={value.address} onChange={set('address')} placeholder="123 Main St" />
            </Field>
            <Field label="City">
              <Input value={value.city} onChange={set('city')} placeholder="Denver" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="State">
                <Input value={value.state} onChange={set('state')} placeholder="CO" />
              </Field>
              <Field label="ZIP">
                <Input value={value.zip} onChange={set('zip')} placeholder="80202" />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
