'use client'
import { useState, useEffect } from 'react'

interface HealthResult { service: string; status: 'healthy' | 'error' | 'slow'; ms: number; error?: string }

export default function AdminSystemPage() {
  const [results, setResults] = useState<HealthResult[]>([])
  const [loading, setLoading] = useState(true)
  const [logos, setLogos] = useState<any[]>([])
  const [uploading, setUploading] = useState<string | null>(null)

  const SERVICES = ['supabase', 'anthropic', 'google-maps', 'openai', 'resend']

  useEffect(() => {
    runHealthChecks()
    loadLogos()
  }, [])

  const runHealthChecks = async () => {
    setLoading(true)
    setResults([])
    const checks = await Promise.allSettled(
      SERVICES.map(async svc => {
        const start = Date.now()
        const res = await fetch(`/api/admin/health/${svc}`)
        const ms = Date.now() - start
        const data = await res.json()
        const status: HealthResult['status'] = data.ok ? (ms > 2000 ? 'slow' : 'healthy') : 'error'
        return { service: svc, status, ms, error: data.error }
      })
    )
    setResults(checks.map((r, i) => r.status === 'fulfilled' ? r.value : { service: SERVICES[i], status: 'error' as const, ms: 0, error: 'Request failed' }))
    setLoading(false)
  }

  const loadLogos = async () => {
    const res = await fetch('/api/admin/logos')
    const data = await res.json()
    setLogos(data.logos ?? [])
  }

  const uploadLogo = async (name: string, file: File) => {
    setUploading(name)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    await fetch('/api/admin/logos', { method: 'POST', body: fd })
    await loadLogos()
    setUploading(null)
  }

  const statusColor = (s: HealthResult['status']) => s === 'healthy' ? '#34D399' : s === 'slow' ? '#FCD34D' : '#F87171'
  const LOGO_SLOTS = [
    { name: 'clozr', label: 'Clozr' },
    { name: 'lifetime', label: 'Lifetime Home Remodeling' },
    { name: 'infinity', label: 'Infinity / Marvin' },
    { name: 'james_hardie', label: 'James Hardie' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#F9FAFB' }}>System</h1>

      {/* Health Checks */}
      <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Health Checks</h2>
          <button onClick={runHealthChecks} disabled={loading} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA' }}>
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
        <div className="p-4 space-y-3">
          {loading && results.length === 0 ? (
            SERVICES.map(svc => (
              <div key={svc} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.12)' }} />
                <span className="text-sm capitalize" style={{ color: '#6B7280' }}>{svc.replace('-', ' ')}</span>
              </div>
            ))
          ) : results.map(r => (
            <div key={r.service} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: statusColor(r.status) }} />
              <span className="text-sm flex-1 capitalize" style={{ color: '#D1D5DB' }}>{r.service.replace('-', ' ')}</span>
              <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{r.ms}ms</span>
              {r.error && <span className="text-xs" style={{ color: '#F87171' }}>{r.error}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Logo Management */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Logo Management</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {LOGO_SLOTS.map(slot => {
            const logo = logos.find((l: any) => l.name === slot.name)
            return (
              <div key={slot.name} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-medium mb-3" style={{ color: '#9CA3AF' }}>{slot.label}</p>
                <div className="h-16 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {logo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.url} alt={slot.label} className="max-h-12 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs" style={{ color: '#4B5563' }}>No logo</span>
                  )}
                </div>
                <label className="cursor-pointer">
                  <div className="text-center text-xs py-1.5 rounded-lg" style={{ background: uploading === slot.name ? 'rgba(29,78,216,0.1)' : 'rgba(255,255,255,0.05)', color: '#6B7280', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    {uploading === slot.name ? 'Uploading…' : 'Upload'}
                  </div>
                  <input type="file" accept="image/*" className="hidden" disabled={uploading === slot.name}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(slot.name, f) }} />
                </label>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
