export default function ProposalsPage() {
  return (
    <div className="px-4 pt-14 pb-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Proposals</h1>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {['All', 'Draft', 'Sent', 'Signed'].map((filter) => (
          <button
            key={filter}
            className="flex-shrink-0 px-4 h-9 rounded-xl text-sm font-medium transition-all"
            style={{
              background: filter === 'All' ? '#1D4ED8' : 'rgba(255,255,255,0.06)',
              color: filter === 'All' ? '#fff' : '#9CA3AF',
              border: filter === 'All' ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>No proposals yet</p>
        <p className="text-xs" style={{ color: '#6B7280' }}>Tap + to create your first proposal</p>
      </div>
    </div>
  )
}
