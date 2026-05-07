'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PERSONAS, getPersona, type Persona } from '@/lib/coach-personas'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface CoachPageProps {
  repName: string
  initialPersonaId: string
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        •••
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: '#1F2937', maxWidth: '80%' }}
      >
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#6B7280' }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CoachPage({ repName, initialPersonaId }: CoachPageProps) {
  const [activePersonaId, setActivePersonaId] = useState(initialPersonaId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const persona = getPersona(activePersonaId)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async (personaId: string) => {
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
  }, [])

  useEffect(() => {
    loadMessages(activePersonaId)
  }, [activePersonaId, loadMessages])

  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [messages, loading, scrollToBottom])

  const switchPersona = async (personaId: string) => {
    setActivePersonaId(personaId)
    await fetch('/api/coach/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_persona_id: personaId }),
    })
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isTyping) return

    setInput('')
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: activePersonaId, content: text }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const firstName = repName.split(' ')[0]
  const showWelcome = !loading && messages.length === 0

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - 72px)', background: '#0A0F1E' }}
    >
      {/* Persona selector */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {PERSONAS.map((p) => {
            const isActive = p.id === activePersonaId
            return (
              <button
                key={p.id}
                onClick={() => switchPersona(p.id)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: isActive ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.05)',
                  border: isActive
                    ? '1.5px solid rgba(59,130,246,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: isActive ? '#60A5FA' : '#9CA3AF',
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>{p.avatar}</span>
                <span>{p.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#93C5FD' : '#6B7280',
                  }}
                >
                  {p.tagline}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Messages */}
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
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center py-8 px-4"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  >
                    {persona.avatar}
                  </div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>
                    {persona.name}
                  </h2>
                  <p className="text-xs mb-6" style={{ color: '#6B7280' }}>
                    {persona.tagline}
                  </p>
                  <div
                    className="max-w-xs rounded-2xl rounded-bl-sm px-4 py-3 text-left"
                    style={{ background: '#1F2937' }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: '#E5E7EB' }}>
                      {persona.welcomeMessage(firstName)}
                    </p>
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id ?? i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'}`}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                      {persona.avatar}
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'rounded-2xl rounded-br-sm'
                        : 'rounded-2xl rounded-bl-sm'
                    }`}
                    style={{
                      background: msg.role === 'user' ? '#1D4ED8' : '#1F2937',
                      color: '#F9FAFB',
                      maxWidth: '80%',
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isTyping && <TypingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-end gap-3"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(17,24,39,0.95)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
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
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isTyping}
          className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
          style={{
            background:
              !input.trim() || isTyping
                ? 'rgba(29,78,216,0.2)'
                : 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
            opacity: !input.trim() || isTyping ? 0.5 : 1,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
