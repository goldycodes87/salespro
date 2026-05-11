'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function VendoImport() {
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    setParsing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const res = await fetch('/api/proposals/parse-vendo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to parse PDF')

      router.push(`/proposals/${data.proposal_id}?imported=true`)
    } catch (err: any) {
      setError(err.message)
      setParsing(false)
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={parsing}
        className="w-full rounded-2xl p-5 flex flex-col items-center gap-3 transition-all"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1.5px dashed rgba(255,255,255,0.18)',
          cursor: parsing ? 'default' : 'pointer',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        {parsing ? (
          <>
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>Parsing proposal…</p>
          </>
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(29,78,216,0.12)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Import from Vendo</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                Upload a Vendo proposal PDF to auto-create a draft
              </p>
            </div>
          </>
        )}
      </button>

      {error && (
        <p className="text-xs mt-2 px-1" style={{ color: '#EF4444' }}>{error}</p>
      )}

      <div className="flex items-center gap-3 mt-5 mb-1">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <span className="text-xs" style={{ color: '#4B5563' }}>or create manually</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
    </div>
  )
}
