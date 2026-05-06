'use client'

const TYPES = [
  {
    id: 'windows',
    label: 'Windows',
    desc: 'Replacement windows, sliders, patio doors',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'siding',
    label: 'Siding',
    desc: 'Siding, trim, gutters, roofing',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'both',
    label: 'Windows + Siding',
    desc: 'Full exterior package',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <rect x="8" y="10" width="8" height="7" rx="1" />
        <line x1="8" y1="13.5" x2="16" y2="13.5" />
        <line x1="12" y1="10" x2="12" y2="17" />
      </svg>
    ),
  },
] as const

export type ProposalType = 'windows' | 'siding' | 'both'

export default function TypeStep({
  value,
  onChange,
}: {
  value: ProposalType
  onChange: (v: ProposalType) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>What type of proposal?</h2>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Choose what products this proposal covers</p>
      <div className="space-y-3">
        {TYPES.map(t => {
          const selected = value === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id as ProposalType)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{
                background: selected ? 'rgba(29,78,216,0.12)' : '#111827',
                border: selected ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: selected ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.06)', color: selected ? '#60A5FA' : '#6B7280' }}>
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: '#F9FAFB' }}>{t.label}</p>
                <p className="text-sm" style={{ color: '#6B7280' }}>{t.desc}</p>
              </div>
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: selected ? '#1D4ED8' : 'rgba(255,255,255,0.08)', border: selected ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                {selected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
