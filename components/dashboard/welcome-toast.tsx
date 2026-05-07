'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function WelcomeToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const firstName = searchParams.get('welcome')
    const coach = searchParams.get('coach')
    if (firstName) {
      setMessage(
        coach
          ? `Welcome to SalesPro, ${firstName}! Your coach ${coach} is ready.`
          : `Welcome to SalesPro, ${firstName}!`,
      )
      setVisible(true)
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      url.searchParams.delete('coach')
      router.replace(url.pathname, { scroll: false })
      const t = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(t)
    }
  }, [searchParams, router])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 z-[300] flex justify-center pointer-events-none"
        >
          <div
            className="px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl max-w-sm text-center"
            style={{
              background: 'linear-gradient(135deg, #059669, #10B981)',
              color: '#fff',
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
            }}
          >
            🎉 {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
