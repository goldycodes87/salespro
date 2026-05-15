'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { getPersona } from '@/lib/coach-personas'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface CoachPageProps {
  repName: string
  initialPersonaId: string | null
}

// ── Coach photo components ───────────────────────────────────────────────────

function CoachPhoto({ personaId, size, color }: { personaId: string; size: number; color: string }) {
  const [error, setError] = useState(false)
  const persona = getPersona(personaId)
  const src = `/coaches/${persona.photoFile}.png`

  if (error) {
    return (
      <div className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
        {persona.avatar}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={persona.name}
      className="rounded-full object-cover object-top flex-shrink-0"
      style={{ width: size, height: size, boxShadow: '0 0 0 2px rgba(6,182,212,0.4)' }}
      onError={() => setError(true)} />
  )
}

function SmallCoachPhoto({ personaId, color }: { personaId: string; color: string }) {
  const [error, setError] = useState(false)
  const persona = getPersona(personaId)
  const src = `/coaches/${persona.photoFile}.png`

  if (error) {
    return (
      <div className="rounded-full flex items-center justify-center flex-shrink-0 text-xs"
        style={{ width: 28, height: 28, background: color }}>
        {persona.avatar}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={persona.name}
      className="rounded-full object-cover object-top flex-shrink-0"
      style={{ width: 28, height: 28 }}
      onError={() => setError(true)} />
  )
}

function TypingIndicator({ personaId, color }: { personaId: string; color: string }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <SmallCoachPhoto personaId={personaId} color={color} />
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: '#1F2937', maxWidth: '80%' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#6B7280' }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── History modal ────────────────────────────────────────────────────────────

interface HistoryModalProps {
  personaId: string
  allMessages: Message[]
  onClose: () => void
  onClearAll: () => void
}

function groupByDate(messages: Message[]) {
  const groups: Record<string, Message[]> = {}
  for (const m of messages) {
    const dateKey = m.created_at
      ? new Date(m.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'Today'
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(m)
  }
  // Return as array sorted newest first
  return Object.entries(groups).reverse().slice(0, 10)
}

function HistoryModal({ allMessages, onClose, onClearAll }: HistoryModalProps) {
  const [clearState, setClearState] = useState<'idle' | 'confirm'>('idle')
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [viewDate, setViewDate] = useState<string | null>(null)

  const sessions = groupByDate(allMessages)

  const handleClearTap = () => {
    if (clearState === 'idle') {
      setClearState('confirm')
      clearTimerRef.current = setTimeout(() => setClearState('idle'), 3000)
    } else {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      onClearAll()
      onClose()
    }
  }

  useEffect(() => () => { if (clearTimerRef.current) clearTimeout(clearTimerRef.current) }, [])

  const viewMessages = viewDate ? (sessions.find(([d]) => d === viewDate)?.[1] ?? []) : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="rounded-t-3xl flex flex-col"
        style={{
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '80vh',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {viewDate ? (
            <button onClick={() => setViewDate(null)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#60A5FA' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </button>
          ) : (
            <h3 className="text-base font-bold" style={{ color: '#F9FAFB' }}>Conversation History</h3>
          )}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#9CA3AF' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {viewDate && viewMessages ? (
            <div className="space-y-3">
              {viewMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="px-3 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed"
                    style={{
                      background: m.role === 'user' ? '#1D4ED8' : '#1F2937',
                      color: '#F9FAFB',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#4B5563' }}>No conversation history yet</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(([dateLabel, msgs]) => {
                const firstUser = msgs.find(m => m.role === 'user')
                const preview = firstUser?.content.slice(0, 60) ?? '…'
                return (
                  <button key={dateLabel} onClick={() => setViewDate(dateLabel)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl text-left"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>{dateLabel}</p>
                      <p className="text-sm truncate" style={{ color: '#D1D5DB' }}>{preview}{preview.length === 60 ? '…' : ''}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 ml-3">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Clear all — double-tap, only shown in list view */}
        {!viewDate && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={handleClearTap}
              className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: clearState === 'confirm' ? 'rgba(239,68,68,0.12)' : 'transparent',
                border: clearState === 'confirm' ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                color: '#EF4444',
              }}>
              {clearState === 'confirm' ? 'Are you sure? Tap again to clear' : 'Clear all history'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Waveform animation ────────────────────────────────────────────────────────

function Waveform({ color, fast }: { color: string; fast?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1" style={{ height: 32 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: 4, borderRadius: 2, background: color }}
          animate={{ height: [6, fast ? 28 : 20, 6] }}
          transition={{ duration: fast ? 0.5 : 0.8, repeat: Infinity, delay: i * (fast ? 0.1 : 0.15), ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

const PERSONA_SOLID_COLORS: Record<string, string> = {
  jordan: '#1D4ED8',
  victoria: '#7C3AED',
  ray: '#D97706',
  noel: '#0F766E',
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CoachPage({ repName, initialPersonaId }: CoachPageProps) {
  const personaId = initialPersonaId ?? 'jordan'
  const persona = getPersona(personaId)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  // "new session" starts a fresh view without deleting history
  const [sessionStart, setSessionStart] = useState<number>(0)

  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat')

  // Voice state
  type CallStatus = 'idle' | 'loading' | 'active' | 'coach-speaking' | 'ending'
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [showPostCall, setShowPostCall] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState<{ role: string; text: string }[]>([])
  const vapiRef = useRef<any>(null)
  const liveTranscriptRef = useRef<{ role: string; text: string }[]>([])
  const callStartTimeRef = useRef<number>(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/coach/messages?personaId=${personaId}`)
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [personaId])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => { if (!loading) scrollToBottom() }, [messages, loading, scrollToBottom])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    const userMsg: Message = { role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)
    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId, content: text }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content, created_at: new Date().toISOString() }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearAll = async () => {
    await fetch(`/api/coach/messages?personaId=${personaId}`, { method: 'DELETE' })
    setMessages([])
    setSessionStart(0)
  }

  const startNewSession = () => {
    setSessionStart(messages.length)
  }

  const endCall = () => {
    setCallStatus('ending')
    vapiRef.current?.stop()
  }

  const startVoice = async () => {
    if (callStatus !== 'idle') return
    setVoiceError(null)
    setShowPostCall(false)
    setCallStatus('loading')
    liveTranscriptRef.current = []
    setLiveTranscript([])

    try {
      // Fetch fresh context from server — never expose API keys to browser
      const configRes = await fetch('/api/coach/voice-config')
      if (!configRes.ok) throw new Error('Failed to load coach config')
      const coachConfig = await configRes.json()

      const { default: Vapi } = await import('@vapi-ai/web')
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY!)
      vapiRef.current = vapi

      vapi.on('call-start', () => {
        callStartTimeRef.current = Date.now()
        setCallStatus('active')
      })

      vapi.on('speech-start', () => {
        setCallStatus('coach-speaking')
      })

      vapi.on('speech-end', () => {
        setCallStatus('active')
      })

      vapi.on('message', (message: any) => {
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          const turn = { role: message.role as string, text: message.transcript as string }
          liveTranscriptRef.current = [...liveTranscriptRef.current, turn]
          setLiveTranscript((prev) => [...prev, turn])
        }
      })

      vapi.on('call-end', () => {
        setCallStatus('ending')
        const durationSeconds = Math.round((Date.now() - callStartTimeRef.current) / 1000)

        const transcriptStr = liveTranscriptRef.current
          .map((t) => `${t.role === 'assistant' ? 'AI' : 'User'}: ${t.text}`)
          .join('\n')

        // Save to coach_messages (fire-and-forget from client)
        if (transcriptStr) {
          fetch('/api/coach/save-voice-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcriptStr, summary: '', durationSeconds }),
          }).catch(console.error)
        }

        vapiRef.current = null
        liveTranscriptRef.current = []
        setLiveTranscript([])
        setCallStatus('idle')
        setShowPostCall(true)
      })

      vapi.on('error', (err: any) => {
        console.error('VAPI ERROR:', JSON.stringify(err))
        vapiRef.current = null
        setCallStatus('idle')
        setVoiceError('Connection failed. Try again.')
        setTimeout(() => setVoiceError(null), 4000)
      })

      console.log('STARTING VOICE SESSION:', {
        persona: personaId,
        voiceId: coachConfig.voiceId,
        coachName: persona.name,
      })

      // Start transient session — fresh context every call, no persistent assistant ID
      vapi.start({
        name: `${coachConfig.repName} — ${persona.name} Voice Coach`,
        transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en-US' },
        model: {
          provider: 'anthropic',
          model: 'claude-haiku-4-5-20251001',
          messages: [{ role: 'system', content: coachConfig.systemPrompt }],
          temperature: 0.7,
          maxTokens: 150,
        },
        voice: {
          provider: '11labs',
          voiceId: coachConfig.voiceId,
          stability: 0.5,
          similarityBoost: 0.75,
          optimizeStreamingLatency: 3,
        },
        firstMessage: coachConfig.firstMessage,
        endCallMessage: 'Good talk. Go close something.',
        metadata: {
          rep_id: coachConfig.repId,
          rep_name: coachConfig.repName,
          company: coachConfig.company,
          persona: coachConfig.persona,
          session_type: 'voice_coach',
          app: 'clozr',
        },
      })
    } catch (e) {
      console.error('Voice start failed:', e)
      vapiRef.current = null
      setCallStatus('idle')
      setVoiceError('Could not start voice session.')
      setTimeout(() => setVoiceError(null), 4000)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      vapiRef.current?.stop()
      vapiRef.current = null
    }
  }, [])

  const firstName = repName.split(' ')[0]
  // Only show messages from current session start
  const visibleMessages = messages.slice(sessionStart)
  const showWelcome = !loading && visibleMessages.length === 0

  if (initialPersonaId === null) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6"
        style={{ height: 'calc(100vh - 76px)', background: '#0A0F1E' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 text-4xl"
          style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)' }}>
          🧠
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#F9FAFB' }}>Choose Your Coach</h2>
        <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: '#6B7280' }}>
          Pick a sales coach in Settings to get personalized guidance.
        </p>
        <Link href="/settings?tab=coach" className="px-6 py-3 rounded-2xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', color: '#fff' }}>
          Choose Coach
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 76px)', background: '#0A0F1E' }}>
        {/* Coach header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,15,30,0.8)' }}>
          <CoachPhoto personaId={personaId} size={44} color={persona.color} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-tight" style={{ color: '#F9FAFB' }}>{persona.name}</h2>
            <p className="text-xs font-medium" style={{ color: '#6B7280' }}>{persona.tagline}</p>
          </div>
          {/* History button */}
          <button onClick={() => setShowHistory(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <Link href="/settings?tab=coach"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}>
            Switch
          </Link>
        </div>

        {/* Chat / Voice tabs */}
        <div className="flex-shrink-0 flex gap-1 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['chat', 'voice'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeTab === t ? (t === 'voice' ? persona.color + '22' : 'rgba(29,78,216,0.2)') : 'transparent',
                color: activeTab === t ? (t === 'voice' ? persona.color : '#60A5FA') : '#6B7280',
                border: activeTab === t ? `1px solid ${t === 'voice' ? persona.color + '44' : 'rgba(29,78,216,0.4)'}` : '1px solid transparent',
              }}
            >
              {t === 'chat' ? '💬 Chat' : '🎙️ Voice'}
            </button>
          ))}
        </div>

        {/* Voice tab */}
        {activeTab === 'voice' && (
          <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-16 overflow-y-auto">
            <CoachPhoto personaId={personaId} size={96} color={persona.color} />
            <h2 className="text-xl font-bold mt-4 mb-0.5" style={{ color: '#F9FAFB' }}>{persona.name}</h2>
            <p className="text-xs mb-8" style={{ color: PERSONA_SOLID_COLORS[personaId] ?? '#1D4ED8' }}>{persona.tagline}</p>

            {voiceError && (
              <p className="text-sm mb-4 text-center" style={{ color: '#EF4444' }}>{voiceError}</p>
            )}

            <AnimatePresence mode="wait">
              {showPostCall ? (
                <motion.div
                  key="post-call"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <p className="text-lg font-bold mb-2" style={{ color: '#06B6D4' }}>Great session, {firstName}! 👊</p>
                  <p className="text-sm mb-5" style={{ color: '#6B7280' }}>Your conversation is being saved...</p>
                  <button
                    onClick={() => { setShowPostCall(false); setActiveTab('chat') }}
                    className="text-sm font-semibold px-6 py-3 rounded-xl"
                    style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', minHeight: 44 }}
                  >
                    View in chat →
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="tap-button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  {/* Tap-to-talk button */}
                  <motion.button
                    onClick={callStatus === 'idle' ? startVoice : undefined}
                    animate={
                      callStatus === 'idle'
                        ? { scale: [1, 1.03, 1] }
                        : callStatus === 'active' || callStatus === 'coach-speaking'
                        ? { scale: [1, 1.04, 1] }
                        : {}
                    }
                    transition={{ duration: callStatus === 'idle' ? 2.5 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 180,
                      height: 180,
                      minWidth: 160,
                      minHeight: 160,
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: callStatus === 'idle' ? 'pointer' : 'default',
                      transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
                      background:
                        callStatus === 'idle'
                          ? 'rgba(29,78,216,0.15)'
                          : callStatus === 'loading'
                          ? 'rgba(255,255,255,0.05)'
                          : callStatus === 'active'
                          ? 'rgba(29,78,216,0.3)'
                          : callStatus === 'coach-speaking'
                          ? `${PERSONA_SOLID_COLORS[personaId] ?? '#1D4ED8'}33`
                          : 'rgba(255,255,255,0.05)',
                      border:
                        callStatus === 'idle'
                          ? '2px solid rgba(29,78,216,0.3)'
                          : callStatus === 'loading' || callStatus === 'ending'
                          ? '2px solid rgba(255,255,255,0.2)'
                          : callStatus === 'active'
                          ? '2px solid #1D4ED8'
                          : `2px solid ${PERSONA_SOLID_COLORS[personaId] ?? '#1D4ED8'}`,
                      boxShadow:
                        callStatus === 'active'
                          ? '0 0 30px rgba(29,78,216,0.4)'
                          : callStatus === 'coach-speaking'
                          ? `0 0 30px ${PERSONA_SOLID_COLORS[personaId] ?? '#1D4ED8'}40`
                          : 'none',
                    }}
                  >
                    {callStatus === 'idle' && <span style={{ fontSize: 52 }}>🎙️</span>}
                    {callStatus === 'loading' && (
                      <div
                        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#60A5FA' }}
                      />
                    )}
                    {callStatus === 'active' && (
                      <Waveform color="#60A5FA" fast={false} />
                    )}
                    {callStatus === 'coach-speaking' && (
                      <Waveform color={PERSONA_SOLID_COLORS[personaId] ?? '#06B6D4'} fast={true} />
                    )}
                    {callStatus === 'ending' && (
                      <div
                        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.4)' }}
                      />
                    )}
                  </motion.button>

                  {/* Status text */}
                  <p className="text-sm mt-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {callStatus === 'idle' && `Tap to talk to ${persona.name}`}
                    {callStatus === 'loading' && `Getting ${persona.name} ready...`}
                    {callStatus === 'active' && 'Listening...'}
                    {callStatus === 'coach-speaking' && `${persona.name} is speaking...`}
                    {callStatus === 'ending' && 'Ending session...'}
                  </p>

                  {/* End call button */}
                  {(callStatus === 'active' || callStatus === 'coach-speaking') && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={endCall}
                      className="mt-6 px-6 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', minHeight: 44 }}
                    >
                      End conversation
                    </motion.button>
                  )}

                  {/* Live transcript */}
                  <AnimatePresence>
                    {liveTranscript.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 w-full max-w-sm space-y-2 overflow-y-auto"
                        style={{ maxHeight: 180 }}
                      >
                        {liveTranscript.map((turn, i) => (
                          <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className="px-3 py-2 rounded-2xl text-xs leading-relaxed max-w-[85%]"
                              style={{
                                background: turn.role === 'user' ? '#1D4ED8' : '#1F2937',
                                color: '#E5E7EB',
                                borderRadius: turn.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              }}
                            >
                              {turn.text}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Messages */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3B82F6' }} />
                </div>
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {showWelcome && (
                      <motion.div key="welcome" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center text-center py-6 px-4">
                        <CoachPhoto personaId={personaId} size={72} color={persona.color} />
                        <h2 className="text-lg font-bold mt-4 mb-1" style={{ color: '#F9FAFB' }}>{persona.name}</h2>
                        <p className="text-xs mb-5" style={{ color: '#6B7280' }}>{persona.tagline}</p>
                        <div className="max-w-xs rounded-2xl rounded-bl-sm px-4 py-3 text-left" style={{ background: '#1F2937' }}>
                          <p className="text-sm leading-relaxed" style={{ color: '#E5E7EB' }}>{persona.welcomeMessage(firstName)}</p>
                        </div>
                      </motion.div>
                    )}

                    {visibleMessages.map((msg, i) => (
                      <motion.div key={msg.id ?? (sessionStart + i)}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                        {msg.role === 'assistant' && <SmallCoachPhoto personaId={personaId} color={persona.color} />}
                        <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}
                          style={{ background: msg.role === 'user' ? '#1D4ED8' : '#1F2937', color: '#F9FAFB', maxWidth: '80%' }}>
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}

                    {isTyping && <TypingIndicator personaId={personaId} color={persona.color} />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div className="flex-shrink-0 px-4 py-3 flex items-end gap-2"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(17,24,39,0.95)',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              }}>
              {/* New session button */}
              <button onClick={startNewSession}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <textarea ref={inputRef} value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${persona.name}…`}
                rows={1}
                className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#F9FAFB',
                  maxHeight: '120px',
                  lineHeight: '1.5',
                }}
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                }} />

              <button onClick={sendMessage} disabled={!input.trim() || isTyping}
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
                style={{
                  background: !input.trim() || isTyping ? 'rgba(29,78,216,0.2)' : 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                  opacity: !input.trim() || isTyping ? 0.5 : 1,
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* History modal */}
      <AnimatePresence>
        {showHistory && (
          <HistoryModal
            personaId={personaId}
            allMessages={messages}
            onClose={() => setShowHistory(false)}
            onClearAll={clearAll}
          />
        )}
      </AnimatePresence>
    </>
  )
}
