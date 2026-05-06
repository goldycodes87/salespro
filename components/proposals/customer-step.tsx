'use client'

import { useState } from 'react'

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

export default function CustomerStep({
  value,
  onChange,
}: {
  value: CustomerInfo
  onChange: (v: CustomerInfo) => void
}) {
  const set = (key: keyof CustomerInfo) => (v: string) => onChange({ ...value, [key]: v })

  return (
    <div>
      <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>Customer Info</h2>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Pre-filled from lead — edit if needed</p>

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
          <Input value={value.phone} onChange={set('phone')} type="tel" placeholder="(719) 555-0100" />
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
