'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AdminCookieFixer() {
  useEffect(() => {
    // Ensure admin cookies are set — covers users with old sp_admin/sp_onboarded cookies
    document.cookie = 'clozr_admin=true; path=/; max-age=31536000; samesite=lax'
    document.cookie = 'clozr_onboarded=true; path=/; max-age=31536000; samesite=lax'
  }, [])
  return null
}

export function AdminLogout() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Clear cookies
    document.cookie = 'clozr_admin=; path=/; max-age=0'
    document.cookie = 'clozr_onboarded=; path=/; max-age=0'
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        borderRadius: 10,
        background: 'none',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#EF4444',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Sign out
    </button>
  )
}
