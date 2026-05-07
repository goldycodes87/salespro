export const dynamic = 'force-dynamic'
import { requireAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export default async function AdminOverview() {
  await requireAdmin()
  const admin = getSupabaseAdmin()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [repsRes, proposalsRes, pipelineRes, costRes, activityRes] = await Promise.all([
    admin.from('reps').select('id', { count: 'exact', head: true }),
    admin.from('proposals').select('id', { count: 'exact', head: true }),
    admin.from('proposals').select('your_price').neq('status', 'signed'),
    admin.from('api_usage_log').select('estimated_cost_usd').gte('created_at', monthStart),
    admin.from('api_usage_log').select('*, reps(full_name, email)').order('created_at', { ascending: false }).limit(20),
  ])

  const totalReps = repsRes.count ?? 0
  const totalProposals = proposalsRes.count ?? 0
  const pipelineValue = (pipelineRes.data ?? []).reduce((s: number, r: any) => s + (r.your_price ?? 0), 0)
  const monthCost = (costRes.data ?? []).reduce((s: number, r: any) => s + (r.estimated_cost_usd ?? 0), 0)
  const activity = activityRes.data ?? []

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#F9FAFB' }}>Overview</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Reps', value: totalReps, color: '#7C3AED' },
          { label: 'Total Proposals', value: totalProposals, color: '#1D4ED8' },
          { label: 'Pipeline Value', value: fmt(pipelineValue), color: '#0F766E' },
          { label: 'This Month Cost', value: '$' + monthCost.toFixed(2), color: '#D97706' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4" style={{ background: '#111827', border: `1px solid ${card.color}33` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: card.color }}>{card.label}</p>
            <p className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Recent API Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Time', 'Rep', 'Service', 'Endpoint', 'Cost', 'Error'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.map((row: any) => (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#D1D5DB' }}>{(row.reps as any)?.full_name ?? (row.reps as any)?.email ?? row.rep_id?.slice(0,8)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA' }}>{row.service}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9CA3AF', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.endpoint}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#34D399' }}>${(row.estimated_cost_usd ?? 0).toFixed(4)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#EF4444', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.error_message ?? ''}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#4B5563' }}>No activity yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
