'use client'
import { useState, useEffect } from 'react'

interface RepUsage { rep_id: string; name: string; email: string; anthropic: number; google: number; openai: number; total: number }

export default function AdminUsagePage() {
  const [summary, setSummary] = useState({ total: 0, anthropic: 0, google: 0, openai: 0 })
  const [repUsage, setRepUsage] = useState<RepUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerRep, setDrawerRep] = useState<RepUsage | null>(null)
  const [drawerData, setDrawerData] = useState<any>(null)

  useEffect(() => { loadUsage() }, [])

  const loadUsage = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/usage')
    const data = await res.json()
    setSummary(data.summary ?? { total: 0, anthropic: 0, google: 0, openai: 0 })
    setRepUsage(data.reps ?? [])
    setLoading(false)
  }

  const openDrawer = async (rep: RepUsage) => {
    setDrawerRep(rep)
    setDrawerData(null)
    const res = await fetch(`/api/admin/usage/${rep.rep_id}`)
    const data = await res.json()
    setDrawerData(data)
  }

  const exportCsv = async () => {
    const res = await fetch('/api/admin/usage/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usage-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Usage & Billing</h1>
        <button onClick={exportCsv} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(15,118,110,0.15)', color: '#06B6D4', border: '1px solid rgba(15,118,110,0.25)' }}>Export CSV</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total This Month', value: summary.total, color: '#7C3AED' },
          { label: 'Anthropic', value: summary.anthropic, color: '#1D4ED8' },
          { label: 'Google Maps', value: summary.google, color: '#0F766E' },
          { label: 'OpenAI', value: summary.openai, color: '#D97706' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4" style={{ background: '#111827', border: `1px solid ${card.color}33` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: card.color }}>{card.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: '#F9FAFB' }}>${card.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Per-rep table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Per-Rep Usage — This Month</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#6B7280' }}>Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Rep', 'Anthropic', 'Google', 'OpenAI', 'Total', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repUsage.map(rep => (
                  <tr key={rep.rep_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{rep.name || '—'}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{rep.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>${rep.anthropic.toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>${rep.google.toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>${rep.openai.toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: '#FCD34D' }}>${rep.total.toFixed(3)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDrawer(rep)} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}>Details</button>
                    </td>
                  </tr>
                ))}
                {repUsage.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#4B5563' }}>No usage this month</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage detail drawer */}
      {drawerRep && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={e => { if (e.target === e.currentTarget) setDrawerRep(null) }} style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md h-full overflow-y-auto flex flex-col" style={{ background: '#111827', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="font-semibold" style={{ color: '#F9FAFB' }}>{drawerRep.name || 'Rep'}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{drawerRep.email}</p>
              </div>
              <button onClick={() => setDrawerRep(null)} style={{ color: '#6B7280' }}>✕</button>
            </div>
            <div className="flex-1 p-5">
              {!drawerData ? (
                <div className="text-center py-8 text-sm" style={{ color: '#6B7280' }}>Loading…</div>
              ) : (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6B7280' }}>Recent Activity</h3>
                  <div className="space-y-2">
                    {(drawerData.recent ?? []).map((row: any) => (
                      <div key={row.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(29,78,216,0.12)', color: '#60A5FA' }}>{row.service}</span>
                          <span className="text-xs font-mono" style={{ color: '#34D399' }}>${(row.estimated_cost_usd ?? 0).toFixed(4)}</span>
                        </div>
                        <p className="text-xs font-mono truncate" style={{ color: '#6B7280' }}>{row.endpoint}</p>
                        <p className="text-xs mt-1" style={{ color: '#4B5563' }}>{new Date(row.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                    {(drawerData.recent ?? []).length === 0 && (
                      <p className="text-sm text-center py-4" style={{ color: '#4B5563' }}>No recent activity</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
