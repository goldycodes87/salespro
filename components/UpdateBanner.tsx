'use client'
import { useEffect, useState } from 'react'

export default function UpdateBanner() {
  const [show, setShow] = useState(false)
  const [worker, setWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWorker(newWorker)
              setShow(true)
            }
          })
        })
      })
  }, [])

  const handleUpdate = () => {
    if (worker) {
      worker.postMessage('SKIP_WAITING')
    }
    window.location.reload()
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1e40af',
      color: 'white',
      padding: '12px 20px',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      zIndex: 9999,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 14 }}>Clozr has been updated</span>
      <button
        onClick={handleUpdate}
        style={{
          background: 'white',
          color: '#1e40af',
          border: 'none',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Refresh
      </button>
    </div>
  )
}
