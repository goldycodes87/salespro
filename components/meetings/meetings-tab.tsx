'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useMeetingRecorder, formatDuration } from '@/lib/useMeetingRecorder'

type MeetingStatus = 'recording' | 'processing' | 'completed' | 'error'
type Meeting = {
  id: string
  status: MeetingStatus
  started_at: string
  ended_at?: string | null
  duration_seconds?: number | null
  summary?: Record<string, any> | null
  action_items?: any[] | null
  coach_debrief?: string | null
  transcript?: string | null
  processing_error?: string | null
  created_at: string
}

type ProcessingStep = 'uploading' | 'transcribing' | 'analyzing' | 'building' | 'done'

const PROCESSING_STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'uploading', label: 'Saving recording...' },
  { key: 'transcribing', label: 'Transcribing audio...' },
  { key: 'analyzing', label: 'Analyzing your meeting...' },
  { key: 'building', label: 'Building your summary...' },
]

function sentimentColor(s: string) {
  if (s === 'positive') return { bg: 'rgba(16,185,129,0.15)', text: '#34D399' }
  if (s === 'negative') return { bg: 'rgba(239,68,68,0.15)', text: '#F87171' }
  return { bg: 'rgba(107,114,128,0.2)', text: '#9CA3AF' }
}
function sentimentLabel(s: string) {
  if (s === 'positive') return 'Likely Interested'
  if (s === 'negative') return 'Unlikely'
  return 'Undecided'
}
function outcomeColor(s: string) {
  if (s === 'likely_to_close') return { bg: 'rgba(16,185,129,0.15)', text: '#34D399' }
  if (s === 'unlikely') return { bg: 'rgba(239,68,68,0.15)', text: '#F87171' }
  return { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D' }
}
function outcomeLabel(s: string) {
  if (s === 'likely_to_close') return 'High probability'
  if (s === 'unlikely') return 'Low probability'
  return 'Follow up needed'
}
function priorityColor(p: string) {
  if (p === 'high') return { bg: 'rgba(239,68,68,0.12)', text: '#F87171' }
  if (p === 'low') return { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' }
  return { bg: 'rgba(245,158,11,0.12)', text: '#FCD34D' }
}

// ─── Meeting Detail View ─────────────────────────────────────────────────────

function MeetingDetailView({
  meeting,
  onBack,
  leadEmail,
  repName,
}: {
  meeting: Meeting
  onBack: () => void
  leadEmail?: string | null
  repName?: string
}) {
  const s = meeting.summary ?? {}
  const actionItems: any[] = meeting.action_items ?? s.action_items ?? []
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [showTranscript, setShowTranscript] = useState(false)
  const [showKeyMoments, setShowKeyMoments] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copying, setCopying] = useState(false)

  const date = new Date(meeting.started_at || meeting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const durationMins = meeting.duration_seconds ? Math.round(meeting.duration_seconds / 60) : null

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/meetings/${meeting.id}`, { method: 'DELETE' })
    onBack()
  }

  const copySummary = async () => {
    const text = [
      `Meeting Summary — ${date}${durationMins ? ` · ${durationMins} min` : ''}`,
      '',
      s.executive_summary ?? '',
      '',
      actionItems.length ? 'Action Items:\n' + actionItems.map((a: any) => `• ${a.task}`).join('\n') : '',
      '',
      s.next_steps ? `Next Steps: ${s.next_steps}` : '',
    ].filter(Boolean).join('\n')
    setCopying(true)
    await navigator.clipboard.writeText(text).catch(() => {})
    setTimeout(() => setCopying(false), 1500)
  }

  const cardStyle = { background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm" style={{ color: '#9CA3AF' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Meetings
        </button>
      </div>
      <div className="mb-5">
        <p className="text-xl font-bold" style={{ color: '#F9FAFB' }}>Meeting Summary</p>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
          {date}{durationMins ? ` · ${durationMins} min` : ''}
        </p>
      </div>

      {/* Overview */}
      <div className="p-5 mb-4" style={cardStyle}>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Executive Summary</h3>
        <p className="text-sm leading-relaxed" style={{ color: '#D1D5DB', lineHeight: '1.6' }}>
          {s.executive_summary ?? 'No summary available'}
        </p>
        {(s.customer_sentiment || s.likely_outcome) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {s.customer_sentiment && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: sentimentColor(s.customer_sentiment).bg, color: sentimentColor(s.customer_sentiment).text }}>
                {sentimentLabel(s.customer_sentiment)}
              </span>
            )}
            {s.likely_outcome && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: outcomeColor(s.likely_outcome).bg, color: outcomeColor(s.likely_outcome).text }}>
                {outcomeLabel(s.likely_outcome)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Key Moments */}
      {(s.key_moments ?? []).length > 0 && (
        <div className="mb-4" style={cardStyle}>
          <button onClick={() => setShowKeyMoments(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Key Moments</h3>
            <motion.span animate={{ rotate: showKeyMoments ? 180 : 0 }} transition={{ duration: 0.2 }}
              style={{ color: '#6B7280', fontSize: '12px' }}>▼</motion.span>
          </button>
          <AnimatePresence>
            {showKeyMoments && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                <div className="px-5 pb-4 space-y-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {(s.key_moments ?? []).map((m: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: '#4B5563', minWidth: 40 }}>{m.timestamp_estimate}</span>
                      <p className="text-sm" style={{ color: '#D1D5DB' }}>{m.moment}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="p-5 mb-4" style={cardStyle}>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Action Items</h3>
          <div className="space-y-3">
            {actionItems.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <button
                  onClick={() => setCheckedItems(prev => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i); else next.add(i)
                    return next
                  })}
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: checkedItems.has(i) ? '#10B981' : 'transparent',
                    border: checkedItems.has(i) ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                  }}>
                  {checkedItems.has(i) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: checkedItems.has(i) ? '#4B5563' : '#D1D5DB', textDecoration: checkedItems.has(i) ? 'line-through' : 'none' }}>
                    {a.task}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {a.priority && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: priorityColor(a.priority).bg, color: priorityColor(a.priority).text }}>
                        {a.priority}
                      </span>
                    )}
                    {a.due && <span className="text-[11px]" style={{ color: '#4B5563' }}>{a.due}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What Worked / To Improve */}
      {((s.what_worked ?? []).length > 0 || (s.what_to_improve ?? []).length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: '#10B981' }}>What Worked</h4>
            <ul className="space-y-1.5">
              {(s.what_worked ?? []).map((w: string, i: number) => (
                <li key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>• {w}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: '#EF4444' }}>To Improve</h4>
            <ul className="space-y-1.5">
              {(s.what_to_improve ?? []).map((w: string, i: number) => (
                <li key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>• {w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Coach Debrief */}
      {meeting.coach_debrief && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-5 mb-4" style={cardStyle}>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Coach Debrief</h3>
          <p className="text-sm leading-relaxed" style={{ color: '#D1D5DB', lineHeight: '1.6', fontStyle: 'italic' }}>
            &ldquo;{meeting.coach_debrief}&rdquo;
          </p>
        </motion.div>
      )}

      {/* Full Transcript */}
      {meeting.transcript && (
        <div className="mb-4" style={cardStyle}>
          <button onClick={() => setShowTranscript(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>
              {showTranscript ? 'Hide' : 'View'} Full Transcript
            </h3>
            <motion.span animate={{ rotate: showTranscript ? 180 : 0 }} transition={{ duration: 0.2 }}
              style={{ color: '#6B7280', fontSize: '12px' }}>▼</motion.span>
          </button>
          <AnimatePresence>
            {showTranscript && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                <div className="px-5 pb-4 max-h-64 overflow-y-auto"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs leading-relaxed font-mono whitespace-pre-wrap" style={{ color: '#6B7280', lineHeight: '1.8', fontSize: '11px' }}>
                    {meeting.transcript}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={copySummary}
          className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span>{copying ? '✓' : '📋'}</span>
          {copying ? 'Copied!' : 'Copy Summary'}
        </button>
        {leadEmail && (
          <button
            className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'rgba(29,78,216,0.12)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}
            onClick={() => fetch(`/api/meetings/${meeting.id}/email`, { method: 'POST' }).catch(() => {})}>
            📧 Email Customer
          </button>
        )}
      </div>

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button onClick={() => setShowDeleteConfirm(true)}
          className="w-full h-10 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.06)', color: '#F87171', border: '1px solid rgba(239,68,68,0.12)' }}>
          🗑️ Delete Recording
        </button>
      ) : (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#F87171' }}>Delete this recording?</p>
          <p className="text-xs mb-4" style={{ color: 'rgba(248,113,113,0.7)' }}>This cannot be undone. The transcript and analysis will be permanently deleted.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 h-10 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
              Keep
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 h-10 rounded-xl text-sm font-bold"
              style={{ background: '#EF4444', color: '#fff' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Meeting Card ────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const s = meeting.summary ?? {}
  const date = new Date(meeting.started_at || meeting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const durationMins = meeting.duration_seconds ? Math.round(meeting.duration_seconds / 60) : null
  const actionCount = (meeting.action_items ?? s.action_items ?? []).length

  if (meeting.status === 'processing') {
    return (
      <div className="p-4 rounded-2xl mb-3 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
          style={{ borderColor: 'rgba(29,78,216,0.4)', borderTopColor: '#60A5FA' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Analyzing your meeting...</p>
          <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>This usually takes 1–2 minutes</p>
        </div>
      </div>
    )
  }

  if (meeting.status === 'error') {
    return (
      <div className="p-4 rounded-2xl mb-3"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: '#F87171' }}>Processing failed</span>
        </div>
        <p className="text-xs" style={{ color: 'rgba(248,113,113,0.7)' }}>{meeting.processing_error || 'Unknown error'}</p>
      </div>
    )
  }

  return (
    <button onClick={onClick} className="w-full text-left p-4 rounded-2xl mb-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold" style={{ color: '#F9FAFB' }}>🎙️ Meeting</span>
        <span className="text-xs" style={{ color: '#6B7280' }}>{date}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        {durationMins && <span className="text-xs" style={{ color: '#9CA3AF' }}>{durationMins} min</span>}
        {s.customer_sentiment && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: sentimentColor(s.customer_sentiment).bg, color: sentimentColor(s.customer_sentiment).text }}>
            {sentimentLabel(s.customer_sentiment)}
          </span>
        )}
      </div>
      {s.executive_summary && (
        <p className="text-xs line-clamp-2 mb-2" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
          {s.executive_summary}
        </p>
      )}
      <div className="flex items-center justify-between">
        {actionCount > 0 ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.12)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)' }}>
            {actionCount} action item{actionCount !== 1 ? 's' : ''}
          </span>
        ) : <span />}
        <span className="text-xs font-medium" style={{ color: '#60A5FA' }}>View Summary →</span>
      </div>
    </button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MeetingsTab({
  rep,
  leadId,
  leadName,
  leadEmail,
}: {
  rep: Record<string, any>
  leadId: string
  leadName: string
  leadEmail?: string | null
}) {
  const recorder = useMeetingRecorder()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('uploading')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const startTimeRef = useRef<Date>(new Date())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const assistantConfig = (rep?.assistant_config ?? {}) as Record<string, any>
  const meetingModeEnabled = !!assistantConfig.meeting_mode
  const meetingOptions = (assistantConfig.meeting_options ?? {}) as Record<string, boolean>
  const disclosureReminder = meetingOptions.disclosure_reminder !== false

  // Fetch past meetings
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('meeting_recordings')
      .select('id, status, started_at, ended_at, duration_seconds, summary, action_items, coach_debrief, transcript, processing_error, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMeetings(data ?? [])
        setLoadingMeetings(false)
      })
  }, [leadId])

  // Poll for processing completion
  useEffect(() => {
    if (!activeMeetingId || !isProcessing) return
    const supabase = createClient()
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('meeting_recordings')
        .select('id, status, started_at, ended_at, duration_seconds, summary, action_items, coach_debrief, transcript, processing_error, created_at')
        .eq('id', activeMeetingId)
        .single()
      if (!data) return

      if (data.status === 'completed') {
        if (pollRef.current) clearInterval(pollRef.current)
        setIsProcessing(false)
        setMeetings(prev => [data, ...prev.filter(m => m.id !== data.id)])
        setSelectedMeeting(data)
      } else if (data.status === 'error') {
        if (pollRef.current) clearInterval(pollRef.current)
        setIsProcessing(false)
        setProcessingError(data.processing_error || 'Processing failed')
        setMeetings(prev => prev.map(m => m.id === data.id ? data : m))
      }
    }, 3000)

    const timeout = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current)
      setIsProcessing(false)
      setProcessingError('Processing timed out. Try refreshing.')
    }, 300000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      clearTimeout(timeout)
    }
  }, [activeMeetingId, isProcessing])

  const handleStartRecording = async () => {
    startTimeRef.current = new Date()
    await recorder.startRecording()
    setIsRecording(true)
  }

  const handleEndAndProcess = async () => {
    setShowEndConfirm(false)
    const audioBlob = await recorder.stopRecording()
    setIsRecording(false)

    // Check size
    if (audioBlob.size > 24 * 1024 * 1024) {
      setProcessingError('Recording too large. Please keep meetings under 60 minutes.')
      return
    }

    setIsProcessing(true)
    setProcessingStep('uploading')

    try {
      // STEP 1 — Create meeting record
      const createRes = await fetch('/api/meetings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          started_at: startTimeRef.current.toISOString(),
          meeting_mode_config: meetingOptions,
        }),
      })
      const createData = await createRes.json()
      if (!createData.meetingId) throw new Error('Failed to create meeting record')
      const meetingId = createData.meetingId
      setActiveMeetingId(meetingId)

      // Add placeholder to list
      setMeetings(prev => [{
        id: meetingId,
        status: 'processing',
        started_at: startTimeRef.current.toISOString(),
        created_at: new Date().toISOString(),
      }, ...prev])

      // STEP 2 — Upload audio
      setProcessingStep('transcribing')
      const ext = audioBlob.type === 'audio/mp4' ? 'mp4' : audioBlob.type.includes('webm') ? 'webm' : 'ogg'
      const uploadForm = new FormData()
      uploadForm.append('audio', audioBlob, `recording.${ext}`)
      uploadForm.append('duration', String(recorder.duration))

      const uploadRes = await fetch(`/api/meetings/${meetingId}/upload`, { method: 'POST', body: uploadForm })
      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      // STEP 3 — Start processing (fire-and-forget)
      setProcessingStep('analyzing')
      fetch(`/api/meetings/${meetingId}/process`, { method: 'POST' })
        .then(() => setProcessingStep('building'))
        .catch(e => console.error('Process start error:', e))

    } catch (e: any) {
      console.error('Meeting upload error:', e)
      setIsProcessing(false)
      setProcessingError(e.message || 'Upload failed')
    }
  }

  const cardStyle = { background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }

  // ── Detail view ──
  if (selectedMeeting) {
    return (
      <MeetingDetailView
        meeting={selectedMeeting}
        onBack={() => setSelectedMeeting(null)}
        leadEmail={leadEmail}
        repName={rep?.full_name}
      />
    )
  }

  return (
    <>
      {/* ── Recording overlay (fixed) ── */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.97)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'space-between',
              padding: '48px 24px 56px',
              touchAction: 'none',
            }}>
            {/* Top */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)' }} />
              <span className="text-sm font-bold" style={{ color: '#F9FAFB' }}>Clozr</span>
            </div>

            {/* Center */}
            <div className="flex flex-col items-center">
              {/* Pulsing dot */}
              <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 16 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: recorder.status === 'paused' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                  animation: recorder.status === 'recording' ? 'meetingPulse 1.5s ease-out infinite' : 'none',
                }} />
                <div style={{
                  position: 'absolute', inset: 10, borderRadius: '50%',
                  background: recorder.status === 'paused' ? '#F59E0B' : '#EF4444',
                }} />
              </div>
              <p className="text-xs font-bold tracking-[3px]" style={{
                color: recorder.status === 'paused' ? '#FCD34D' : '#EF4444',
                marginBottom: 12
              }}>
                {recorder.status === 'paused' ? 'PAUSED' : 'RECORDING'}
              </p>
              <p className="font-bold tabular-nums" style={{ fontSize: 48, fontWeight: 800, color: '#F9FAFB', fontFamily: 'monospace', marginBottom: 16 }}>
                {recorder.formattedDuration}
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Recording: {leadName}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{rep?.company ?? ''}</p>
            </div>

            {/* Bottom */}
            <div className="flex gap-3 w-full max-w-xs">
              {recorder.status === 'paused' ? (
                <button onClick={recorder.resumeRecording}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold"
                  style={{ height: 52, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 16 }}>
                  ▶ Resume
                </button>
              ) : (
                <button onClick={recorder.pauseRecording}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold"
                  style={{ height: 52, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 16 }}>
                  ⏸ Pause
                </button>
              )}
              <button onClick={() => setShowEndConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl font-bold"
                style={{ height: 52, background: '#EF4444', color: '#fff', fontSize: 16 }}>
                ⏹ End Meeting
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End confirm modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px' }}>
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              className="w-full max-w-md rounded-t-3xl p-6 pb-10"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>End this recording?</p>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>{recorder.formattedDuration} recorded</p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Keep Recording
                </button>
                <button onClick={handleEndAndProcess}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold"
                  style={{ background: '#EF4444', color: '#fff' }}>
                  End and Process
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Processing overlay (fixed) ── */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.97)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 32,
            }}>
            <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mb-8"
              style={{ borderColor: 'rgba(29,78,216,0.3)', borderTopColor: '#60A5FA' }} />
            <div className="space-y-4 w-full max-w-xs mb-8">
              {PROCESSING_STEPS.map((step, i) => {
                const stepIdx = PROCESSING_STEPS.findIndex(s => s.key === processingStep)
                const isDone = i < stepIdx
                const isCurrent = i === stepIdx
                return (
                  <motion.div key={step.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.4 }}
                    className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: isDone ? 'rgba(6,182,212,0.15)' : 'transparent' }}>
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full"
                          style={{ background: isCurrent ? '#60A5FA' : 'rgba(255,255,255,0.15)', animation: isCurrent ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                      )}
                    </div>
                    <p className="text-sm"
                      style={{ color: isDone ? '#06B6D4' : isCurrent ? '#F9FAFB' : 'rgba(255,255,255,0.3)' }}>
                      {step.label}
                    </p>
                  </motion.div>
                )
              })}
            </div>
            <p className="text-xs text-center" style={{ color: '#4B5563' }}>
              This usually takes 1–2 minutes.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CSS keyframes injected ── */}
      <style>{`
        @keyframes meetingPulse {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>

      {/* ── List screen ── */}
      {!meetingModeEnabled ? (
        <div className="rounded-2xl p-8 text-center" style={cardStyle}>
          <p className="text-2xl mb-3">🎙️</p>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F9FAFB' }}>Meeting Mode is off</p>
          <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
            Enable it in Settings → Assistant to record and analyze appointments
          </p>
          <Link href="/settings?tab=assistant"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.25)' }}>
            Go to Settings →
          </Link>
        </div>
      ) : (
        <>
          {/* Privacy disclosure / start button */}
          {disclosureReminder ? (
            <div className="rounded-2xl p-5 mb-5"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <p className="text-sm font-bold mb-2" style={{ color: '#FCD34D' }}>⚠️ Recording Disclosure</p>
              <p className="text-xs mb-4" style={{ color: '#F9FAFB', lineHeight: '1.6' }}>
                Before recording, inform your customer:{' '}
                <em>&quot;I&apos;ll be recording this meeting for my notes and coaching. Is that okay?&quot;</em>
              </p>
              <button
                onClick={handleStartRecording}
                disabled={recorder.status === 'requesting'}
                className="w-full h-14 rounded-2xl text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#fff', fontSize: 15 }}>
                {recorder.status === 'requesting' ? 'Requesting microphone…' : "I've informed the customer — Start Recording"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartRecording}
              disabled={recorder.status === 'requesting'}
              className="w-full h-14 rounded-2xl text-sm font-bold mb-5"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #0F766E)', color: '#fff' }}>
              {recorder.status === 'requesting' ? 'Requesting microphone…' : '🎙️ Start Recording'}
            </button>
          )}

          {recorder.error && (
            <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              {recorder.error}
            </div>
          )}

          {processingError && (
            <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              {processingError}
              <button onClick={() => setProcessingError(null)} className="ml-2 underline text-xs">Dismiss</button>
            </div>
          )}

          {/* Meeting config row */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { key: 'saveToLead', label: 'Save to lead', icon: '💾' },
              { key: 'generateSummary', label: 'AI Summary', icon: '✨' },
              { key: 'coachDebrief', label: 'Coach debrief', icon: '🧠' },
              { key: 'sendToCustomer', label: 'Email customer', icon: '📧' },
            ].map(opt => (
              <span key={opt.key}
                className="text-[11px] px-2 py-1 rounded-full font-medium flex items-center gap-1"
                style={{
                  background: meetingOptions[opt.key] ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                  color: meetingOptions[opt.key] ? '#06B6D4' : '#4B5563',
                  border: meetingOptions[opt.key] ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                {opt.icon} {opt.label}
              </span>
            ))}
          </div>

          {/* Past meetings */}
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Past Meetings</h3>
          {loadingMeetings ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          ) : meetings.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={cardStyle}>
              <p className="text-sm" style={{ color: '#4B5563' }}>No recordings yet for this lead</p>
            </div>
          ) : (
            meetings.map(m => (
              <MeetingCard key={m.id} meeting={m} onClick={() => setSelectedMeeting(m)} />
            ))
          )}
        </>
      )}
    </>
  )
}
