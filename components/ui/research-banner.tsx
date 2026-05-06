'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useResearch } from './research-context'

export default function ResearchBanner() {
  const { pending, clearResearch } = useResearch()
  const router = useRouter()
  const [complete, setComplete] = useState<{ leadId: string; leadName: string } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pending) return

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/leads/research-status/${pending.leadId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(intervalRef.current!)
          clearResearch()
          if (data.status === 'complete') {
            setComplete({ leadId: pending.leadId, leadName: pending.leadName })
            timeoutRef.current = setTimeout(() => setComplete(null), 8000)
          }
        }
      } catch {}
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pending, clearResearch])

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  return (
    <AnimatePresence>
      {complete && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={() => {
            router.push(`/leads/${complete.leadId}`)
            setComplete(null)
          }}
          className="fixed top-0 left-0 right-0 z-60 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #0F766E, #06B6D4)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Research complete for {complete.leadName}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Tap to view the lead file</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setComplete(null) }}
              className="p-1 rounded-full"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
