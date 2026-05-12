'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Activity = {
  id: string
  event_type: string
  description: string
  created_at: string
}

type LeadFile = {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number | null
  description: string | null
  created_at: string
}

const cardStyle: React.CSSProperties = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
}

function fileBadge(type: string): { label: string; bg: string; color: string } {
  if (type === 'vendo' || type === 'vendo_proposal') return { label: 'Vendo', bg: 'rgba(29,78,216,0.15)', color: '#60A5FA' }
  if (type === 'pdf') return { label: 'PDF', bg: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }
  return { label: 'Doc', bg: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }
}

export default function FilesTab({
  leadId,
  repId,
  notes: initialNotes,
  onNotesSave,
  activity,
}: {
  leadId: string
  repId: string
  notes: string
  onNotesSave: (notes: string) => void
  activity: Activity[]
}) {
  const supabase = createClient()
  const [notes, setNotes] = useState(initialNotes)
  const [savingNotes, setSavingNotes] = useState(false)

  // Documents
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const docInputRef = useRef<HTMLInputElement>(null)

  // Photos
  const [photos, setPhotos] = useState<{ name: string; url: string; path: string }[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/leads/${leadId}/files`)
      .then(r => r.ok ? r.json() : [])
      .then((data: LeadFile[]) => {
        setLeadFiles(data)
        setFilesLoading(false)
      })
      .catch(() => setFilesLoading(false))
  }, [leadId])

  const uploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`/api/leads/${leadId}/files`, { method: 'POST', body: fd })
      if (res.ok) {
        const record: LeadFile = await res.json()
        setLeadFiles(prev => [record, ...prev])
      }
    } finally {
      setUploadingDoc(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const deleteDoc = async (id: string) => {
    setLeadFiles(prev => prev.filter(f => f.id !== id))
    await fetch(`/api/leads/${leadId}/files/${id}`, { method: 'DELETE' })
  }

  const loadPhotos = useCallback(async () => {
    if (photosLoaded) return
    setLoadingPhotos(true)
    const { data } = await supabase.storage
      .from('lead-photos')
      .list(`${repId}/${leadId}`)
    if (data) {
      const urls = await Promise.all(
        data.map(async file => {
          const path = `${repId}/${leadId}/${file.name}`
          const { data: urlData } = supabase.storage.from('lead-photos').getPublicUrl(path)
          return { name: file.name, url: urlData.publicUrl, path }
        })
      )
      setPhotos(urls)
    }
    setLoadingPhotos(false)
    setPhotosLoaded(true)
  }, [leadId, repId, photosLoaded, supabase])

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    if (photos.length + files.length > 10) { alert('Maximum 10 photos per lead'); return }
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${repId}/${leadId}/${name}`
      const { error } = await supabase.storage.from('lead-photos').upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('lead-photos').getPublicUrl(path)
        setPhotos(prev => [...prev, { name, url: urlData.publicUrl, path }])
      }
    }
    setUploading(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const deletePhoto = async (path: string) => {
    await supabase.storage.from('lead-photos').remove([path])
    setPhotos(prev => prev.filter(p => p.path !== path))
  }

  const saveNotes = async () => {
    if (notes === initialNotes) return
    setSavingNotes(true)
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    onNotesSave(notes)
    setSavingNotes(false)
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  if (!photosLoaded && !loadingPhotos) loadPhotos()

  return (
    <div>
      {/* Documents */}
      <div className="p-5 mb-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Documents</span>
        </div>

        {filesLoading ? (
          <div className="space-y-2 mb-3">
            {[1, 2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />)}
          </div>
        ) : leadFiles.length === 0 ? (
          <p className="text-sm mb-3" style={{ color: '#4B5563' }}>No documents yet</p>
        ) : (
          <div className="space-y-2 mb-3">
            {leadFiles.map(f => {
              const badge = fileBadge(f.file_type)
              return (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#D1D5DB' }}>{f.file_name}</p>
                    {f.description && (
                      <p className="text-xs truncate" style={{ color: '#6B7280' }}>{f.description}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold flex-shrink-0"
                    style={{ background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Download →
                  </a>
                  <button type="button" onClick={() => deleteDoc(f.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={uploadDoc}
        />
        <button
          onClick={() => docInputRef.current?.click()}
          disabled={uploadingDoc}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', color: uploadingDoc ? '#4B5563' : '#9CA3AF', border: '1px solid rgba(255,255,255,0.10)' }}>
          {uploadingDoc ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Document
            </>
          )}
        </button>
      </div>

      {/* Photos */}
      <div className="p-5 mb-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Photos</span>
          <span className="text-xs" style={{ color: '#6B7280' }}>{photos.length}/10</span>
        </div>

        {loadingPhotos ? (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="w-20 h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />)}
          </div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map(p => (
              <div key={p.path} className="relative aspect-square rounded-xl overflow-hidden group">
                <img
                  src={p.url}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(p.url)}
                />
                <button
                  onClick={() => deletePhoto(p.path)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {photos.length < 10 && (
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif"
              multiple
              className="hidden"
              onChange={uploadPhoto}
            />
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: uploading ? '#4B5563' : '#9CA3AF', border: '1px solid rgba(255,255,255,0.10)' }}>
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Photos
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Notes */}
      <div className="p-5 mb-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Notes</span>
          {savingNotes && <span className="text-xs" style={{ color: '#6B7280' }}>Saving…</span>}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Add notes about this lead…"
          rows={5}
          className="w-full rounded-xl px-3 py-3 text-sm resize-none outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#D1D5DB', lineHeight: '1.6' }}
        />
      </div>

      {/* Activity Log */}
      <div className="p-5 mb-4" style={cardStyle}>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B7280' }}>Activity</h3>
        {activity.length === 0 ? (
          <p className="text-sm" style={{ color: '#4B5563' }}>No activity yet</p>
        ) : (
          <div className="space-y-3">
            {activity.map(a => (
              <div key={a.id} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#374151' }} />
                <div>
                  <p className="text-sm" style={{ color: '#D1D5DB' }}>{a.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{fmtDate(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
