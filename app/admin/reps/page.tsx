'use client'
import { useState, useEffect } from 'react'
import { formatPhone } from '@/hooks/usePhoneFormat'

// Types
interface Rep { id: string; full_name: string; email: string; phone?: string; settings?: any; is_admin?: boolean; is_active?: boolean }
interface RepStats { rep_id: string; proposal_count: number; signed_count: number; month_cost: number }

export default function AdminRepsPage() {
  const [reps, setReps] = useState<Rep[]>([])
  const [stats, setStats] = useState<Record<string, RepStats>>({})
  const [loading, setLoading] = useState(true)
  const [selectedRep, setSelectedRep] = useState<Rep | null>(null)
  const [modalTab, setModalTab] = useState<'info' | 'proposals' | 'coach' | 'usage'>('info')
  const [modalData, setModalData] = useState<any>(null)
  const [adding, setAdding] = useState(false)
  const [newRep, setNewRep] = useState({ full_name: '', email: '', phone: '', company: 'Lifetime Home Remodeling', sendWelcomeEmail: true })
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => { loadReps() }, [])

  const loadReps = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reps')
      const data = await res.json()
      setReps(data.reps ?? [])
      const statsMap: Record<string, RepStats> = {}
      for (const s of (data.stats ?? [])) statsMap[s.rep_id] = s
      setStats(statsMap)
    } finally {
      setLoading(false)
    }
  }

  const openRepModal = async (rep: Rep) => {
    setSelectedRep(rep)
    setModalTab('info')
    setModalData(null)
    const res = await fetch(`/api/admin/reps/${rep.id}`)
    const data = await res.json()
    setModalData(data)
  }

  const toggleActive = async (rep: Rep) => {
    setTogglingId(rep.id)
    await fetch(`/api/admin/reps/${rep.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !(rep.is_active !== false) }),
    })
    await loadReps()
    setTogglingId(null)
  }

  const makeAdmin = async (repId: string) => {
    await fetch(`/api/admin/reps/${repId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_admin: true }),
    })
    await loadReps()
  }

  const handleAddRep = async () => {
    if (!newRep.full_name || !newRep.email) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRep),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add rep')
      setAddSuccess(true)
      setNewRep({ full_name: '', email: '', phone: '', company: 'Lifetime Home Remodeling', sendWelcomeEmail: true })
      await loadReps()
      setTimeout(() => setAddSuccess(false), 3000)
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px', color: '#F9FAFB', padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%' }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#F9FAFB' }}>Rep Management</h1>

      {/* Reps Table */}
      <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>All Reps ({reps.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#6B7280' }}>Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Name', 'Email', 'Company', 'Proposals', 'Close Rate', 'Month Cost', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reps.map(rep => {
                  const s = stats[rep.id]
                  const closeRate = s && s.proposal_count > 0 ? Math.round((s.signed_count / s.proposal_count) * 100) : 0
                  const isActive = rep.is_active !== false
                  return (
                    <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#F9FAFB' }}>
                        {rep.full_name || '—'}
                        {rep.is_admin && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>Admin</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>{rep.email}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>{rep.settings?.company_name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#D1D5DB' }}>{s?.proposal_count ?? 0}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: closeRate >= 30 ? '#34D399' : '#9CA3AF' }}>{closeRate}%</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#FCD34D' }}>${(s?.month_cost ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: isActive ? '#34D399' : '#6B7280' }}>
                          {isActive ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openRepModal(rep)} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}>View</button>
                          <button onClick={() => toggleActive(rep)} disabled={togglingId === rep.id} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: isActive ? '#F87171' : '#34D399', border: `1px solid ${isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                            {togglingId === rep.id ? '…' : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {!rep.is_admin && (
                            <button onClick={() => makeAdmin(rep.id)} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>Make Admin</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Rep Form */}
      <div className="rounded-2xl p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>Add New Rep</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Full Name *</label>
            <input style={inputStyle} value={newRep.full_name} onChange={e => setNewRep(p => ({ ...p, full_name: e.target.value }))} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Email *</label>
            <input style={inputStyle} type="email" value={newRep.email} onChange={e => setNewRep(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Phone</label>
            <input style={inputStyle} type="tel" value={newRep.phone} onChange={e => setNewRep(p => ({ ...p, phone: formatPhone(e.target.value) }))} placeholder="720-555-0100" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Company</label>
            <input style={inputStyle} value={newRep.company} onChange={e => setNewRep(p => ({ ...p, company: e.target.value }))} placeholder="Lifetime Home Remodeling" />
          </div>
        </div>
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <div onClick={() => setNewRep(p => ({ ...p, sendWelcomeEmail: !p.sendWelcomeEmail }))} className="relative flex-shrink-0" style={{ width: '36px', height: '22px' }}>
            <div className="absolute inset-0 rounded-full" style={{ background: newRep.sendWelcomeEmail ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
            <div className="absolute top-[2px] rounded-full" style={{ width: '18px', height: '18px', background: '#fff', left: newRep.sendWelcomeEmail ? '16px' : '2px', transition: 'left 0.15s' }} />
          </div>
          <span className="text-sm" style={{ color: '#D1D5DB' }}>Send welcome email with login credentials</span>
        </label>
        {addError && <p className="text-sm mb-3" style={{ color: '#F87171' }}>{addError}</p>}
        <button onClick={handleAddRep} disabled={adding || !newRep.full_name || !newRep.email}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: addSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(29,78,216,0.2)', color: addSuccess ? '#34D399' : '#60A5FA', border: `1px solid ${addSuccess ? 'rgba(16,185,129,0.3)' : 'rgba(29,78,216,0.3)'}`, opacity: (!newRep.full_name || !newRep.email) ? 0.5 : 1 }}>
          {adding ? 'Creating…' : addSuccess ? '✓ Created!' : 'Create Rep'}
        </button>
      </div>

      {/* Rep Detail Modal */}
      {selectedRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelectedRep(null) }}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden max-h-[90vh] flex flex-col" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#F9FAFB' }}>{selectedRep.full_name}</h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>{selectedRep.email}</p>
              </div>
              <button onClick={() => setSelectedRep(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)', color: '#9CA3AF' }}>✕</button>
            </div>
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {(['info', 'proposals', 'coach', 'usage'] as const).map(tab => (
                <button key={tab} onClick={() => setModalTab(tab)} className="px-5 py-3 text-xs font-semibold capitalize"
                  style={{ color: modalTab === tab ? '#60A5FA' : '#6B7280', borderBottom: modalTab === tab ? '2px solid #1D4ED8' : '2px solid transparent' }}>
                  {tab}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!modalData ? (
                <div className="text-center py-8 text-sm" style={{ color: '#6B7280' }}>Loading…</div>
              ) : modalTab === 'info' ? (
                <div className="space-y-4">
                  {[
                    { label: 'Full Name', value: modalData.rep?.full_name },
                    { label: 'Email', value: modalData.rep?.email },
                    { label: 'Phone', value: modalData.rep?.phone },
                    { label: 'Company', value: modalData.rep?.settings?.company_name },
                    { label: 'Title', value: modalData.rep?.settings?.rep_title },
                    { label: 'Created', value: modalData.rep?.created_at ? new Date(modalData.rep.created_at).toLocaleDateString() : '—' },
                  ].map(field => (
                    <div key={field.label} className="flex gap-4">
                      <span className="text-xs w-24 flex-shrink-0 pt-0.5" style={{ color: '#6B7280' }}>{field.label}</span>
                      <span className="text-sm" style={{ color: '#D1D5DB' }}>{field.value ?? '—'}</span>
                    </div>
                  ))}
                </div>
              ) : modalTab === 'proposals' ? (
                <div>
                  {(modalData.proposals ?? []).length === 0 ? (
                    <p className="text-sm" style={{ color: '#6B7280' }}>No proposals yet</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Customer', 'Type', 'Price', 'Status'].map(h => <th key={h} className="pb-2 text-left text-xs" style={{ color: '#6B7280' }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(modalData.proposals ?? []).map((p: any) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="py-2 text-xs" style={{ color: '#D1D5DB' }}>{p.customer_name ?? '—'}</td>
                            <td className="py-2 text-xs capitalize" style={{ color: '#9CA3AF' }}>{p.pricing_data?.proposal_type ?? '—'}</td>
                            <td className="py-2 text-xs font-mono" style={{ color: '#F9FAFB' }}>${(p.your_price ?? 0).toLocaleString()}</td>
                            <td className="py-2"><span className="text-xs px-1.5 py-0.5 rounded" style={{ background: p.status === 'signed' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: p.status === 'signed' ? '#34D399' : '#9CA3AF' }}>{p.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : modalTab === 'coach' ? (
                <div className="space-y-3">
                  <div className="flex gap-4"><span className="text-xs w-40 flex-shrink-0" style={{ color: '#6B7280' }}>Active Persona</span><span className="text-sm capitalize" style={{ color: '#D1D5DB' }}>{modalData.coach?.active_persona_id ?? '—'}</span></div>
                  <div className="flex gap-4"><span className="text-xs w-40 flex-shrink-0" style={{ color: '#6B7280' }}>Total Messages</span><span className="text-sm" style={{ color: '#D1D5DB' }}>{modalData.coach?.message_count ?? 0}</span></div>
                  <div className="flex gap-4"><span className="text-xs w-40 flex-shrink-0" style={{ color: '#6B7280' }}>Last Session</span><span className="text-sm" style={{ color: '#D1D5DB' }}>{modalData.coach?.last_session ?? '—'}</span></div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: '#F9FAFB' }}>This Month Usage</h3>
                  {Object.entries(modalData.usage ?? {}).map(([svc, data]: [string, any]) => (
                    <div key={svc} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span className="text-sm capitalize" style={{ color: '#D1D5DB' }}>{svc}</span>
                      <span className="text-sm font-mono" style={{ color: '#9CA3AF' }}>${data.cost.toFixed(3)} ({data.count} calls)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
