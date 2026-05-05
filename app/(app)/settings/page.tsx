'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="px-4 pt-14 pb-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Settings</h1>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>Account</p>
          <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Eric Goldberg</p>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>eric@lifetimewindows.com</p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full px-5 py-4 text-left text-sm font-medium transition-all active:opacity-70"
          style={{ color: '#EF4444' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
