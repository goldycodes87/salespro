'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'by_service' | 'by_rep'
type ServiceStatus = 'operational' | 'degraded' | 'down' | 'unconfigured'

interface ServiceCheck {
  name: string
  status: ServiceStatus
  responseMs: number | null
  lastChecked: string
  error?: string
}

interface ServiceStat {
  service: string
  calls_today: number
  calls_mtd: number
  cost_today: number
  cost_mtd: number
  avg_response_ms: number | null
  success_rate: string
}

interface RepStat {
  rep_id: string
  full_name: string
  email: string
  anthropic: number
  google: number
  openai: number
  total: number
  cost_today: number
  calls_today: number
  top_service: string | null
}

interface UsageSummary {
  total: number
  anthropic: number
  google: number
  openai: number
  today: number
}

// ─── Status colors ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ServiceStatus, string> = {
  operational: '#34D399',
  degraded: '#F59E0B',
  down: '#EF4444',
  unconfigured: '#6B7280',
}

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  unconfigured: 'Not configured',
}

// ─── Service Status Panel ─────────────────────────────────────────────────────

function ServiceStatusPanel() {
  const [services, setServices] = useState<ServiceCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/service-status${force ? '?refresh=1' : ''}`)
      const data = await res.json()
      setServices(data.services ?? [])
      setLastRefresh(new Date().toLocaleTimeString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(() => refresh(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [refresh])

  const downCount = services.filter(s => s.status === 'down').length
  const degradedCount = services.filter(s => s.status === 'degraded').length

  return (
    <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Service Status</span>
          {downCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              {downCount} down
            </span>
          )}
          {degradedCount > 0 && downCount === 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              {degradedCount} degraded
            </span>
          )}
          {downCount === 0 && degradedCount === 0 && services.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399' }}>
              All systems go
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs" style={{ color: '#4B5563' }}>Updated {lastRefresh}</span>
          )}
          <button
            onClick={e => { e.stopPropagation(); refresh(true) }}
            disabled={loading}
            className="px-3 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Checking…' : 'Check Now'}
          </button>
          <span style={{ color: '#6B7280', fontSize: 12 }}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {services.map(svc => (
            <div key={svc.name} className="px-4 py-3" style={{ background: '#0F172A' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 7, height: 7, background: STATUS_COLOR[svc.status], flexShrink: 0 }}
                />
                <span className="text-xs font-medium truncate" style={{ color: '#F9FAFB' }}>{svc.name}</span>
              </div>
              <p className="text-xs" style={{ color: STATUS_COLOR[svc.status] }}>{STATUS_LABEL[svc.status]}</p>
              {svc.responseMs != null && (
                <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{svc.responseMs}ms</p>
              )}
              {svc.error && (
                <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }} title={svc.error}>{svc.error}</p>
              )}
            </div>
          ))}
          {services.length === 0 && (
            <div className="col-span-5 px-4 py-6 text-center text-sm" style={{ color: '#4B5563' }}>
              {loading ? 'Checking services…' : 'No status available'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsagePage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [summary, setSummary] = useState<UsageSummary>({ total: 0, anthropic: 0, google: 0, openai: 0, today: 0 })
  const [byService, setByService] = useState<ServiceStat[]>([])
  const [repUsage, setRepUsage] = useState<RepStat[]>([])
  const [alerts, setAlerts] = useState<{ repAlerts: RepStat[]; platformAlert: boolean }>({ repAlerts: [], platformAlert: false })
  const [loading, setLoading] = useState(true)
  const [drawerRep, setDrawerRep] = useState<RepStat | null>(null)
  const [drawerData, setDrawerData] = useState<any>(null)

  useEffect(() => { loadUsage() }, [])

  const loadUsage = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/usage')
    const data = await res.json()
    setSummary(data.summary ?? { total: 0, anthropic: 0, google: 0, openai: 0, today: 0 })
    setByService(data.byService ?? [])
    setRepUsage(data.reps ?? [])
    setAlerts(data.alerts ?? { repAlerts: [], platformAlert: false })
    setLoading(false)
  }

  const openDrawer = async (rep: RepStat) => {
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'by_service', label: 'By Service' },
    { id: 'by_rep', label: 'By Rep' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Usage & Billing</h1>
        <button
          onClick={exportCsv}
          className="px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(15,118,110,0.15)', color: '#06B6D4', border: '1px solid rgba(15,118,110,0.25)' }}
        >
          Export CSV
        </button>
      </div>

      {/* Cost alerts */}
      {alerts.platformAlert && (
        <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <span style={{ color: '#EF4444', fontSize: 18 }}>⚠</span>
          <p className="text-sm font-medium" style={{ color: '#FCA5A5' }}>
            Platform spending today has exceeded $20.00 — total today: ${summary.today.toFixed(2)}
          </p>
        </div>
      )}
      {alerts.repAlerts.length > 0 && (
        <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#F59E0B' }}>Reps exceeding $5/day</p>
          <div className="flex flex-wrap gap-2">
            {alerts.repAlerts.map((r: any) => (
              <span key={r.rep_id} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D' }}>
                {r.full_name || r.email} — ${r.cost_today.toFixed(2)} today
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Service status */}
      <ServiceStatusPanel />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total MTD', value: summary.total, color: '#7C3AED' },
          { label: 'Today', value: summary.today, color: '#EC4899' },
          { label: 'Anthropic MTD', value: summary.anthropic, color: '#1D4ED8' },
          { label: 'Google Maps MTD', value: summary.google, color: '#0F766E' },
          { label: 'OpenAI MTD', value: summary.openai, color: '#D97706' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4" style={{ background: '#111827', border: `1px solid ${card.color}33` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: card.color }}>{card.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: '#F9FAFB' }}>${card.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: '#111827', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={tab === t.id
              ? { background: 'rgba(124,58,237,0.2)', color: '#A78BFA' }
              : { color: '#6B7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
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
                    {['Rep', 'Anthropic', 'Google', 'OpenAI', 'Total MTD', 'Today', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {repUsage.map(rep => (
                    <tr key={rep.rep_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{rep.full_name || '—'}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{rep.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>${rep.anthropic.toFixed(3)}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>${rep.google.toFixed(3)}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>${rep.openai.toFixed(3)}</td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: '#FCD34D' }}>${rep.total.toFixed(3)}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: rep.cost_today > 5 ? '#EF4444' : '#9CA3AF' }}>
                        ${rep.cost_today.toFixed(3)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDrawer(rep)}
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {repUsage.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: '#4B5563' }}>No usage this month</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: By Service */}
      {tab === 'by_service' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Usage by Service — This Month</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: '#6B7280' }}>Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Service', 'Calls Today', 'Calls MTD', 'Cost Today', 'Cost MTD', 'Avg Response', 'Success Rate'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byService.map(row => (
                    <tr key={row.service} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(29,78,216,0.12)', color: '#60A5FA' }}>
                          {row.service.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>{row.calls_today}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>{row.calls_mtd}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>${row.cost_today.toFixed(4)}</td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: '#FCD34D' }}>${row.cost_mtd.toFixed(4)}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>
                        {row.avg_response_ms != null ? `${row.avg_response_ms}ms` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: parseFloat(row.success_rate) < 90 ? '#EF4444' : '#34D399' }}>
                        {row.success_rate}%
                      </td>
                    </tr>
                  ))}
                  {byService.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: '#4B5563' }}>No service usage this month</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: By Rep */}
      {tab === 'by_rep' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Usage by Rep — This Month</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: '#6B7280' }}>Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Rep', 'Calls Today', 'Cost Today', 'Cost MTD', 'Top Service', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {repUsage.map(rep => (
                    <tr key={rep.rep_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{rep.full_name || '—'}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{rep.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF' }}>{rep.calls_today}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: rep.cost_today > 5 ? '#EF4444' : '#9CA3AF' }}>
                        ${rep.cost_today.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: '#FCD34D' }}>${rep.total.toFixed(3)}</td>
                      <td className="px-4 py-3">
                        {rep.top_service && (
                          <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA' }}>
                            {rep.top_service.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDrawer(rep)}
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}
                        >
                          Details
                        </button>
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
      )}

      {/* Usage detail drawer */}
      {drawerRep && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setDrawerRep(null) }}
        >
          <div className="w-full max-w-md h-full overflow-y-auto flex flex-col" style={{ background: '#111827', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="font-semibold" style={{ color: '#F9FAFB' }}>{drawerRep.full_name || 'Rep'}</p>
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
                          <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(29,78,216,0.12)', color: '#60A5FA' }}>
                            {row.service}
                          </span>
                          <span className="text-xs font-mono" style={{ color: '#34D399' }}>${(row.estimated_cost_usd ?? 0).toFixed(4)}</span>
                        </div>
                        <p className="text-xs font-mono truncate" style={{ color: '#6B7280' }}>{row.endpoint}</p>
                        {row.error_message && (
                          <p className="text-xs mt-1 truncate" style={{ color: '#EF4444' }}>{row.error_message}</p>
                        )}
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
