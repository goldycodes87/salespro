'use client'

import { useEffect } from 'react'

export default function CalendarSyncOnLoad() {
  useEffect(() => {
    fetch('/api/calendar/sync', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => console.log('[CalendarSync]', d))
      .catch((e) => console.error('[CalendarSync] error:', e))
  }, [])

  return null
}
