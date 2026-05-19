'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type LeadFile = {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number | null
  mime_type: string | null
  description: string | null
  created_at: string
}

type Activity = {
  id: string
  event_type: string
  description: string
  created_at: string
}

function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const types: Record<string, string> = {
    pdf: 'pdf',
    doc: 'document', docx: 'document',
    xls: 'spreadsheet', xlsx: 'spreadsheet',
    jpg: 'image', jpeg: 'image', png: 'image', heic: 'image',
    gif: 'image', webp: 'image',
    txt: 'text', csv: 'text',
    mp3: 'audio', mp4: 'video', mov: 'video',
  }
  return types[ext] || 'document'
}

function getFileTypeConfig(type: string) {
  switch (type) {
    case 'pdf':
      return { icon: '📄', bg: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', label: 'PDF' }
    case 'document':
      return { icon: '📝', bg: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.3)', color: '#1D4ED8', label: 'Word' }
    case 'spreadsheet':
      return { icon: '📊', bg: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', label: 'Excel' }
    case 'image':
      return { icon: '🖼️', bg: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#8B5CF6', label: 'Image' }
    case 'vendo_proposal':
      return { icon: '📋', bg: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#06B6D4', label: 'Vendo' }
    case 'audio':
      return { icon: '🎵', bg: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', label: 'Audio' }
    case 'video':
      return { icon: '🎬', bg: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', label: 'Video' }
    case 'text':
      return { icon: '📃', bg: 'rgba(107,114,128,0.15)', border: '1px solid rgba(107,114,128,0.3)', color: '#6B7280', label: 'Text' }
    default:
      return { icon: '📄', bg: 'rgba(107,114,128,0.15)', border: '1px solid rgba(107,114,128,0.3)', color: '#6B7280', label: 'File' }
  }
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function relativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = diff / (1000 * 60 * 60)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${Math.floor(hours)}h ago`
  if (hours < 48) return 'Yesterday'
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const cardStyle: React.CSSProperties = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
}

const HARDIE_COLORS = [
  { name: 'Arctic White',    hex: '#F4F4F0' },
  { name: 'Autumn Tan',      hex: '#C4A882' },
  { name: 'Countrylane Red', hex: '#8B3A3A' },
  { name: 'Evening Blue',    hex: '#4A5568' },
  { name: 'Monterey Taupe',  hex: '#8B7355' },
  { name: 'Mountain Sage',   hex: '#7B9E87' },
  { name: 'Navajo Beige',    hex: '#D4B896' },
  { name: 'Night Gray',      hex: '#4A4A4A' },
  { name: 'Sail Cloth',      hex: '#E8DCC8' },
  { name: 'Timber Bark',     hex: '#5C4A3A' },
  { name: 'Woodstock Brown', hex: '#6B4E3D' },
]

export default function FilesTab({
  leadId,
  repId,
  notes: initialNotes,
  onNotesSave,
  activity,
  streetViewUrl,
}: {
  leadId: string
  repId: string
  notes: string
  onNotesSave: (notes: string) => void
  activity: Activity[]
  streetViewUrl?: string | null
}) {
  const supabase = createClient()
  const [notes, setNotes] = useState(initialNotes)
  const [savingNotes, setSavingNotes] = useState(false)

  // Documents
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingName, setUploadingName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<LeadFile | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Photos
  const [photos, setPhotos] = useState<{ name: string; url: string; path: string }[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Siding visualizer
  const [vizPhotoPreview, setVizPhotoPreview] = useState<string | null>(null)
  const [vizPhotoPayload, setVizPhotoPayload] = useState<{ imageUrl?: string; imageBase64?: string } | null>(null)
  const [selectedHardieColor, setSelectedHardieColor] = useState<typeof HARDIE_COLORS[0] | null>(null)
  const [vizGenerating, setVizGenerating] = useState(false)
  const [vizResult, setVizResult] = useState<{ url: string; colorName: string; path: string | null } | null>(null)
  const [vizError, setVizError] = useState<string | null>(null)
  const [vizToast, setVizToast] = useState<string | null>(null)
  const [vizSaved, setVizSaved] = useState(false)
  const vizInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/leads/${leadId}/files`)
      .then(r => r.ok ? r.json() : [])
      .then((data: LeadFile[]) => {
        setLeadFiles(Array.isArray(data) ? data : [])
        setFilesLoading(false)
      })
      .catch(() => setFilesLoading(false))
  }, [leadId])

  // Close delete confirm on outside interaction
  useEffect(() => {
    if (!deleteConfirm) return
    const handler = () => setDeleteConfirm(null)
    const t = setTimeout(handler, 4000)
    return () => clearTimeout(t)
  }, [deleteConfirm])

  const handleUpload = async (file: File) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      alert('File too large. Maximum 25MB.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadingName(file.name)

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/leads/${leadId}/files`, { method: 'POST', body: fd })
      clearInterval(progressTimer)
      setUploadProgress(100)

      if (res.ok) {
        const record: LeadFile = await res.json()
        setLeadFiles(prev => [record, ...prev])
      }

      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
        setUploadingName('')
      }, 500)
    } catch {
      clearInterval(progressTimer)
      setUploading(false)
      setUploadProgress(0)
      setUploadingName('')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async (id: string) => {
    setLeadFiles(prev => prev.filter(f => f.id !== id))
    setDeleteConfirm(null)
    await fetch(`/api/leads/${leadId}/files/${id}`, { method: 'DELETE' })
  }

  const loadPhotos = useCallback(async () => {
    if (photosLoaded) return
    setLoadingPhotos(true)
    const { data } = await supabase.storage.from('lead-photos').list(`${repId}/${leadId}`)
    if (data) {
      const urls = await Promise.all(
        data.map(async file => {
          const path = `${repId}/${leadId}/${file.name}`
          const { data: urlData } = supabase.storage.from('lead-photos').getPublicUrl(path)
          return { name: file.name, url: urlData.publicUrl, path }
        }),
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
    setUploadingPhoto(true)
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
    setUploadingPhoto(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const deletePhoto = async (path: string) => {
    await supabase.storage.from('lead-photos').remove([path])
    setPhotos(prev => prev.filter(p => p.path !== path))
  }

  // ── Siding visualizer handlers ──────────────────────────────────────────────
  const handleVizFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setVizPhotoPreview(dataUrl)
      setVizPhotoPayload({ imageBase64: dataUrl.split(',')[1] })
      setVizResult(null)
      setSelectedHardieColor(null)
      setVizSaved(false)
      setVizError(null)
    }
    reader.readAsDataURL(file)
    if (vizInputRef.current) vizInputRef.current.value = ''
  }

  const handleUseSatellitePhoto = () => {
    if (!streetViewUrl) return
    setVizPhotoPreview(streetViewUrl)
    setVizPhotoPayload({ imageUrl: streetViewUrl })
    setVizResult(null)
    setSelectedHardieColor(null)
    setVizSaved(false)
    setVizError(null)
  }

  const handleColorSelect = async (color: typeof HARDIE_COLORS[0]) => {
    if (!vizPhotoPayload || vizGenerating) return
    setSelectedHardieColor(color)
    setVizGenerating(true)
    setVizResult(null)
    setVizError(null)
    setVizSaved(false)
    try {
      const res = await fetch(`/api/leads/${leadId}/visualize-siding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vizPhotoPayload, color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed, try again')
      setVizResult({ url: data.generatedUrl, colorName: data.colorName, path: data.storagePath ?? null })
    } catch (err: any) {
      setVizError(err.message || 'Generation failed, try again')
      setSelectedHardieColor(null)
    } finally {
      setVizGenerating(false)
    }
  }

  const handleVizSave = () => {
    if (!vizResult || vizSaved) return
    const name = `siding_${vizResult.colorName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.jpg`
    setPhotos(prev => [...prev, { name, url: vizResult.url, path: vizResult.path ?? name }])
    setVizSaved(true)
    setVizToast('Saved to photos')
    setTimeout(() => setVizToast(null), 3000)
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

  if (!photosLoaded && !loadingPhotos) loadPhotos()

  return (
    <div>
      {/* ── DOCUMENTS ── */}
      <div
        className="p-5 mb-4"
        style={{
          ...cardStyle,
          border: dragOver ? '2px dashed rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
          background: dragOver ? 'rgba(29,78,216,0.05)' : '#111827',
          transition: 'border 0.15s, background 0.15s',
          position: 'relative',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay text */}
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-10 pointer-events-none">
            <p style={{ fontSize: 16, fontWeight: 700, color: '#60A5FA' }}>Drop file here</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F9FAFB' }}>Documents</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'rgba(29,78,216,0.2)',
              border: '1px solid rgba(29,78,216,0.4)',
              color: '#60A5FA',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? 'default' : 'pointer',
              opacity: uploading ? 0.5 : 1,
              minHeight: 44,
            }}
          >
            ↑ Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.txt,.csv"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
        </div>

        {/* Upload progress */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: 12, overflow: 'hidden' }}
            >
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 16px' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
                  <span className="flex-1 text-sm truncate" style={{ color: '#D1D5DB' }}>{uploadingName}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', flexShrink: 0 }}>{uploadProgress}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.2 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #1D4ED8, #06B6D4)', borderRadius: 2 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File list */}
        {filesLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />)}
          </div>
        ) : leadFiles.length === 0 && !uploading ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center text-center" style={{ padding: '40px 0' }}>
            <span style={{ fontSize: 48, opacity: 0.3 }}>📁</span>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#F9FAFB', marginTop: 16 }}>No files yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 240, marginTop: 8, lineHeight: 1.6 }}>
              Upload documents, photos, or import from Vendo to keep everything in one place.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginTop: 20,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Upload your first file
            </button>
          </div>
        ) : (
          <div>
            {leadFiles.map(f => {
              const fileType = f.file_type || detectFileType(f.file_name)
              const cfg = getFileTypeConfig(fileType)
              const isVendo = fileType === 'vendo_proposal'
              const isImage = fileType === 'image'
              const isPdf = fileType === 'pdf'

              return (
                <div
                  key={f.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Type icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: cfg.bg, border: cfg.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 18, lineHeight: 1,
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 500, color: '#F9FAFB',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {f.file_name.length > 30 ? f.file_name.slice(0, 30) + '…' : f.file_name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{
                        background: isVendo ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)',
                        borderRadius: 4, padding: '2px 6px',
                        fontSize: 11, color: isVendo ? '#06B6D4' : 'rgba(255,255,255,0.5)',
                        fontWeight: isVendo ? 700 : 400,
                      }}>
                        {cfg.label}
                      </span>
                      {f.file_size ? (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          · {formatSize(f.file_size)}
                        </span>
                      ) : null}
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                        · {relativeDate(f.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {/* Preview — image or PDF */}
                    {(isImage || isPdf) && (
                      <button
                        onClick={() => {
                          if (isPdf) window.open(f.file_url, '_blank')
                          else setPreviewFile(f)
                        }}
                        title="Preview"
                        style={{
                          width: 36, height: 44, borderRadius: 8, border: 'none',
                          background: 'transparent', color: 'rgba(255,255,255,0.4)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    )}

                    {/* Download */}
                    <button
                      onClick={() => window.open(f.file_url, '_blank')}
                      title="Download"
                      style={{
                        width: 36, height: 44, borderRadius: 8, border: 'none',
                        background: 'transparent', color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>

                    {/* Delete */}
                    {deleteConfirm === f.id ? (
                      <button
                        onClick={() => handleDelete(f.id)}
                        style={{
                          height: 44, borderRadius: 8, padding: '0 10px',
                          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#EF4444', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        }}
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(f.id)}
                        title="Delete"
                        style={{
                          width: 36, height: 44, borderRadius: 8, border: 'none',
                          background: 'transparent', color: 'rgba(239,68,68,0.4)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── IMAGE PREVIEW MODAL ── */}
      <AnimatePresence>
        {previewFile && previewFile.file_type === 'image' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}
            onClick={() => setPreviewFile(null)}
          >
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={previewFile.file_url}
              alt={previewFile.file_name}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHOTOS ── */}
      <div className="p-5 mb-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F9FAFB' }}>Photos</span>
          <span className="text-xs" style={{ color: '#6B7280' }}>{photos.length}/10</span>
        </div>

        {loadingPhotos ? (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="w-20 h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />)}
          </div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map(p => (
              <div key={p.path} className="relative aspect-square rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(p.url)}
                />
                <button
                  onClick={() => deletePhoto(p.path)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {photos.length < 10 && (
          <>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif" multiple className="hidden" onChange={uploadPhoto} />
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
              style={{ height: 44, background: 'rgba(255,255,255,0.06)', color: uploadingPhoto ? '#4B5563' : '#9CA3AF', border: '1px solid rgba(255,255,255,0.10)', cursor: uploadingPhoto ? 'default' : 'pointer' }}
            >
              {uploadingPhoto ? (
                <><div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> Uploading…</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Photos</>
              )}
            </button>
          </>
        )}
      </div>

      {/* ── SIDING VISUALIZER ── */}
      <div className="p-5 mb-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F9FAFB' }}>Siding Visualizer</span>
        </div>
        <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
          See this home with James Hardie siding colors.
        </p>

        {/* Input buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            ref={vizInputRef}
            type="file"
            accept="image/*"
            capture={'environment' as unknown as boolean}
            className="hidden"
            onChange={handleVizFileSelect}
          />
          <button
            onClick={() => vizInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl text-sm font-semibold"
            style={{
              height: 44, padding: '0 16px',
              background: 'linear-gradient(135deg, #1D4ED8, #0F766E)',
              color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Visualize Siding
          </button>
          {streetViewUrl && (
            <button
              onClick={handleUseSatellitePhoto}
              className="rounded-xl text-sm font-medium"
              style={{
                height: 44, padding: '0 14px',
                background: vizPhotoPayload?.imageUrl === streetViewUrl ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.06)',
                color: vizPhotoPayload?.imageUrl === streetViewUrl ? '#06B6D4' : '#9CA3AF',
                border: vizPhotoPayload?.imageUrl === streetViewUrl ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.10)',
                cursor: 'pointer',
              }}
            >
              Use Satellite Photo
            </button>
          )}
        </div>

        {/* Thumbnail preview */}
        {vizPhotoPreview && (
          <div className="rounded-xl overflow-hidden mb-4" style={{ height: 140 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vizPhotoPreview} alt="Selected" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Color swatches */}
        {vizPhotoPreview && (
          <div className="mb-4" style={{ opacity: vizGenerating ? 0.5 : 1, pointerEvents: vizGenerating ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#9CA3AF' }}>
              {vizGenerating ? 'Generating…' : 'Tap a color to visualize'}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {HARDIE_COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => handleColorSelect(c)}
                  className="flex flex-col items-center gap-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: c.hex,
                    border: selectedHardieColor?.name === c.name
                      ? '3px solid #fff'
                      : '2px solid rgba(255,255,255,0.18)',
                    boxShadow: selectedHardieColor?.name === c.name
                      ? '0 0 0 2px rgba(255,255,255,0.25)'
                      : 'none',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 9, color: '#6B7280', textAlign: 'center', lineHeight: 1.3, maxWidth: 60 }}>
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generating spinner */}
        {vizGenerating && (
          <div className="flex flex-col items-center py-6">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
              style={{ borderColor: 'rgba(29,78,216,0.3)', borderTopColor: '#1D4ED8' }} />
            <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Generating your render...</p>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>This takes 15–20 seconds</p>
          </div>
        )}

        {/* Side-by-side result */}
        {vizResult && !vizGenerating && (
          <div className="mt-1">
            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
              <div>
                <p className="text-xs mb-1.5" style={{ color: '#6B7280' }}>Current</p>
                <div className="rounded-xl overflow-hidden" style={{ height: 180 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vizPhotoPreview!} alt="Current" className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: '#6B7280' }}>{vizResult.colorName}</p>
                <div className="rounded-xl overflow-hidden" style={{ height: 180 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vizResult.url} alt={vizResult.colorName} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleVizSave}
                disabled={vizSaved}
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  background: vizSaved ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.2)',
                  border: vizSaved ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(29,78,216,0.4)',
                  color: vizSaved ? '#34D399' : '#60A5FA',
                  fontSize: 14, fontWeight: 600,
                  cursor: vizSaved ? 'default' : 'pointer',
                }}
              >
                {vizSaved ? 'Saved ✓' : 'Save to Lead'}
              </button>
              <button
                onClick={() => { setVizToast('Coming soon'); setTimeout(() => setVizToast(null), 3000) }}
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#9CA3AF',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Add to Proposal
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {vizError && (
          <div className="mt-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            {vizError}
          </div>
        )}
      </div>

      {/* Toast */}
      {vizToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-sm font-medium z-50 whitespace-nowrap"
          style={{ background: '#1F2937', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          {vizToast}
        </div>
      )}

      {/* ── NOTES ── */}
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

      {/* ── ACTIVITY ── */}
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

      {/* ── PHOTO LIGHTBOX ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
