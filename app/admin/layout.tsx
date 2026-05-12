import { requireAdmin } from '@/lib/admin-auth'
import Link from 'next/link'
import ClozrLogo from '@/components/ui/clozr-logo'
import { AdminCookieFixer, AdminLogout } from '@/components/admin/admin-client-init'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/reps', label: 'Reps', icon: '👥' },
  { href: '/admin/coach-prompts', label: 'Coach Prompts', icon: '🧠' },
  { href: '/admin/defaults', label: 'Defaults', icon: '⚙️' },
  { href: '/admin/usage', label: 'Usage & Billing', icon: '💰' },
  { href: '/admin/system', label: 'System', icon: '🔧' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex' }}>
      <AdminCookieFixer />

      {/* Sidebar - desktop */}
      <div className="hidden md:flex flex-col" style={{ width: '240px', background: '#0D1117', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'fixed', top: 0, bottom: 0, left: 0 }}>
        <div className="px-5 pt-6 pb-4">
          <ClozrLogo variant="icon" height={40} />
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7C3AED', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '4px', padding: '1px 6px' }}>Admin</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: '#9CA3AF' }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 pb-6 flex flex-col gap-3">
          <Link
            href="/dashboard"
            style={{ fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Back to App
          </Link>
          <AdminLogout />
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto" style={{ background: '#0D1117', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} className="flex-1 min-w-0 flex flex-col items-center py-2 px-1 gap-0.5">
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span style={{ fontSize: '9px', color: '#6B7280', whiteSpace: 'nowrap' }}>{item.label.split(' ')[0]}</span>
          </Link>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-[240px] pb-20 md:pb-0">
        {children}
      </div>
    </div>
  )
}
