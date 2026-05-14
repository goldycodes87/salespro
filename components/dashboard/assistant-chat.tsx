'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantChatProps {
  assistantConfig: Record<string, any> | null
  assistantEnabled: boolean
  repName: string
}

const QUICK_CHIPS = [
  { label: 'My schedule today', message: "What's on my schedule today?" },
  { label: 'Pipeline summary', message: 'Give me a quick pipeline summary.' },
  { label: 'Recent leads', message: 'What are my most recent leads?' },
  { label: 'Draft follow-up', message: 'Help me draft a follow-up message for a lead.' },
]

// ── Phone number rendering ───────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={`tel:${part.replace(/\D/g, '')}`}
            className="underline font-semibold" style={{ color: '#60A5FA' }}>
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: 'rgba(16,185,129,0.2)' }}>
        🤖
      </div>
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

// ── Waveform ─────────────────────────────────────────────────────────────────

function Waveform({ fast }: { fast?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1" style={{ height: 32 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: 4, borderRadius: 2, background: '#10B981' }}
          animate={{ height: [6, fast ? 28 : 20, 6] }}
          transition={{ duration: fast ? 0.5 : 0.8, repeat: Infinity, delay: i * (fast ? 0.1 : 0.15), ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ── Voice tab ────────────────────────────────────────────────────────────────

function VoiceTab({ assistantName, firstName }: { assistantName: string; firstName: string }) {
  type CallStatus = 'idle' | 'loading' | 'active' | 'assistant-speaking' | 'ending'
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [showPostCall, setShowPostCall] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState<{ role: string; text: string }[]>([])

  const vapiRef = useRef<any>(null)
  const liveTranscriptRef = useRef<{ role: string; text: string }[]>([])

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
      const configRes = await fetch('/api/assistant/voice-config')
      if (!configRes.ok) throw new Error('Failed to load assistant config')
      const voiceConfig = await configRes.json()

      const { default: Vapi } = await import('@vapi-ai/web')
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY!)
      vapiRef.current = vapi

      vapi.on('call-start', () => setCallStatus('active'))
      vapi.on('speech-start', () => setCallStatus('assistant-speaking'))
      vapi.on('speech-end', () => setCallStatus('active'))

      vapi.on('message', (message: any) => {
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          const turn = { role: message.role as string, text: message.transcript as string }
          liveTranscriptRef.current = [...liveTranscriptRef.current, turn]
          setLiveTranscript((prev) => [...prev, turn])
        }
      })

      vapi.on('call-end', () => {
        vapiRef.current = null
        liveTranscriptRef.current = []
        setLiveTranscript([])
        setCallStatus('idle')
        setShowPostCall(true)
      })

      vapi.on('error', (err: any) => {
        console.error('Vapi error:', err)
        vapiRef.current = null
        setCallStatus('idle')
        setVoiceError('Connection failed. Try again.')
        setTimeout(() => setVoiceError(null), 4000)
      })

      vapi.start({
        transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en-US' },
        model: {
          provider: 'anthropic',
          model: 'claude-haiku-4-5-20251001',
          messages: [{ role: 'system', content: voiceConfig.systemPrompt }],
          temperature: 0.5,
          maxTokens: 120,
        },
        voice: {
          provider: '11labs',
          voiceId: voiceConfig.voiceId,
          stability: 0.5,
          similarityBoost: 0.75,
          optimizeStreamingLatency: 3,
        },
        firstMessage: voiceConfig.firstMessage,
        endCallMessage: "Got it. I'll let you get back to it.",
      })
    } catch (e) {
      console.error('Voice start failed:', e)
      vapiRef.current = null
      setCallStatus('idle')
      setVoiceError('Could not start voice session.')
      setTimeout(() => setVoiceError(null), 4000)
    }
  }

  useEffect(() => {
    return () => {
      vapiRef.current?.stop()
      vapiRef.current = null
    }
  }, [])

  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-16 overflow-y-auto" style={{ flex: 1 }}>
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 text-4xl"
        style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)' }}>
        🤖
      </div>
      <h2 className="text-xl font-bold mb-1" style={{ color: '#F9FAFB' }}>{assistantName}</h2>
      <p className="text-xs mb-8" style={{ color: '#10B981' }}>Task assistant</p>

      {voiceError && (
        <p className="text-sm mb-4 text-center" style={{ color: '#EF4444' }}>{voiceError}</p>
      )}

      <AnimatePresence mode="wait">
        {showPostCall ? (
          <motion.div key="post-call"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <p className="text-lg font-bold mb-2" style={{ color: '#10B981' }}>Done, {firstName}! ✅</p>
            <p className="text-sm mb-5" style={{ color: '#6B7280' }}>Switch to chat to see your history.</p>
          </motion.div>
        ) : (
          <motion.div key="tap-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <motion.button
              onClick={callStatus === 'idle' ? startVoice : undefined}
              animate={
                callStatus === 'idle'
                  ? { scale: [1, 1.03, 1] }
                  : callStatus === 'active' || callStatus === 'assistant-speaking'
                  ? { scale: [1, 1.04, 1] }
                  : {}
              }
              transition={{ duration: callStatus === 'idle' ? 2.5 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 180, height: 180,
                borderRadius: '50%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: callStatus === 'idle' ? 'pointer' : 'default',
                transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
                background:
                  callStatus === 'idle' ? 'rgba(16,185,129,0.15)'
                  : callStatus === 'loading' ? 'rgba(255,255,255,0.05)'
                  : callStatus === 'active' ? 'rgba(16,185,129,0.25)'
                  : callStatus === 'assistant-speaking' ? 'rgba(16,185,129,0.35)'
                  : 'rgba(255,255,255,0.05)',
                border:
                  callStatus === 'idle' ? '2px solid rgba(16,185,129,0.3)'
                  : callStatus === 'loading' || callStatus === 'ending' ? '2px solid rgba(255,255,255,0.2)'
                  : '2px solid #10B981',
                boxShadow:
                  callStatus === 'active' || callStatus === 'assistant-speaking'
                    ? '0 0 30px rgba(16,185,129,0.4)'
                    : 'none',
              }}
            >
              {callStatus === 'idle' && <span style={{ fontSize: 52 }}>🎙️</span>}
              {callStatus === 'loading' && (
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#10B981' }} />
              )}
              {callStatus === 'active' && <Waveform fast={false} />}
              {callStatus === 'assistant-speaking' && <Waveform fast={true} />}
              {callStatus === 'ending' && (
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.4)' }} />
              )}
            </motion.button>

            <p className="text-sm mt-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {callStatus === 'idle' && `Tap to talk to ${assistantName}`}
              {callStatus === 'loading' && `Getting ${assistantName} ready...`}
              {callStatus === 'active' && 'Listening...'}
              {callStatus === 'assistant-speaking' && `${assistantName} is speaking...`}
              {callStatus === 'ending' && 'Ending session...'}
            </p>

            {(callStatus === 'active' || callStatus === 'assistant-speaking') && (
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
                      <div className="px-3 py-2 rounded-2xl text-xs leading-relaxed max-w-[85%]"
                        style={{
                          background: turn.role === 'user' ? '#1D4ED8' : '#1F2937',
                          color: '#E5E7EB',
                          borderRadius: turn.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        }}>
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
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssistantChat({ assistantConfig, assistantEnabled, repName }: AssistantChatProps) {
  const assistantName = assistantConfig?.name || 'Alex'
  const firstName = repName.split(' ')[0]

  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return
    setInput('')

    const userMsg: Message = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setIsTyping(false)
    }
  }, [isTyping])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const openChat = () => {
    setActiveTab('chat')
    setOpen(true)
  }

  const openVoice = () => {
    setActiveTab('voice')
    setOpen(true)
  }

  if (!assistantEnabled) {
    return (
      <div className="rounded-2xl p-5" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.37 6.37l.72-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>AI Assistant</p>
            <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>Set up your assistant</p>
          </div>
          <a href="/settings?tab=assistant"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
            Set up →
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Dashboard widget */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.37 6.37l.72-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#F9FAFB' }}>
              {assistantName} — Active
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              {(assistantConfig?.capabilities as string[] | null)?.length
                ? `${(assistantConfig!.capabilities as string[]).length} capabilities`
                : 'AI Assistant'}
            </p>
          </div>
          <a href="/settings?tab=assistant"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
            Configure →
          </a>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={openChat}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat with {assistantName}
          </button>
          <button
            onClick={openVoice}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'rgba(16,185,129,0.06)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ fontSize: 14 }}>🎙️</span>
            Talk to {assistantName}
          </button>
        </div>
      </div>

      {/* Full-screen modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: '#0A0F1E' }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 safe-area-top"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,15,30,0.9)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: 'rgba(16,185,129,0.15)' }}>
                🤖
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold leading-tight" style={{ color: '#F9FAFB' }}>{assistantName}</h2>
                <p className="text-xs" style={{ color: '#10B981' }}>Task assistant</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex gap-1 px-4 py-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {(['chat', 'voice'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: activeTab === t
                      ? t === 'voice' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)'
                      : 'transparent',
                    color: activeTab === t ? '#10B981' : '#6B7280',
                    border: activeTab === t ? '1px solid rgba(16,185,129,0.35)' : '1px solid transparent',
                  }}
                >
                  {t === 'chat' ? '💬 Chat' : '🎙️ Voice'}
                </button>
              ))}
            </div>

            {/* Voice tab */}
            {activeTab === 'voice' && (
              <VoiceTab assistantName={assistantName} firstName={firstName} />
            )}

            {/* Chat tab */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {messages.length === 0 && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center text-center py-8"
                    >
                      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        🤖
                      </div>
                      <h3 className="text-base font-bold mb-1" style={{ color: '#F9FAFB' }}>Hey {firstName}!</h3>
                      <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: '#6B7280' }}>
                        I&apos;m {assistantName}. Ask me about your schedule, pipeline, or anything else.
                      </p>
                      {/* Quick chips */}
                      <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                        {QUICK_CHIPS.map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => sendMessage(chip.message)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                            style={{
                              background: 'rgba(16,185,129,0.1)',
                              color: '#10B981',
                              border: '1px solid rgba(16,185,129,0.2)',
                            }}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <AnimatePresence mode="popLayout">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                            style={{ background: 'rgba(16,185,129,0.2)' }}>
                            🤖
                          </div>
                        )}
                        <div
                          className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                          style={{
                            background: msg.role === 'user' ? '#1D4ED8' : '#1F2937',
                            color: '#F9FAFB',
                            maxWidth: '80%',
                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          }}
                        >
                          <MessageContent content={msg.content} />
                        </div>
                      </motion.div>
                    ))}
                    {isTyping && <TypingIndicator />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex-shrink-0 px-4 py-3 safe-area-bottom"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,15,30,0.9)' }}>
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything..."
                      rows={1}
                      className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#F9FAFB',
                        maxHeight: 120,
                        lineHeight: '1.5',
                      }}
                      onInput={(e) => {
                        const el = e.currentTarget
                        el.style.height = 'auto'
                        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                      }}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isTyping}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: input.trim() && !isTyping ? '#10B981' : 'rgba(255,255,255,0.06)',
                        color: input.trim() && !isTyping ? '#fff' : '#4B5563',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
