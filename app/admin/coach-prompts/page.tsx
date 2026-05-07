'use client'
import { useState, useEffect } from 'react'

interface CoachPrompt {
  id?: string
  persona_id: string
  name: string
  tagline: string
  system_prompt: string
  welcome_message: string
  description?: string
}

const PERSONA_DEFAULTS = [
  { persona_id: 'jordan', name: 'Jordan', tagline: 'Mentor', description: 'Supportive mentor focused on long-term growth and strategy.', system_prompt: `You are Jordan, a seasoned sales mentor with 20+ years in home improvement sales. You're supportive, strategic, and focused on long-term rep growth. You give thoughtful advice on sales technique, customer psychology, objection handling, and building rapport. When the rep has shared context about themselves, use it to personalize guidance. Keep responses concise and actionable — 2-4 paragraphs max. Always end with one specific thing they can do right now.`, welcome_message: `Hey {name}! I'm Jordan — your sales mentor. I'm here to help you grow, strategize, and hit your goals. What's on your mind today?` },
  { persona_id: 'victoria', name: 'Victoria', tagline: 'Closer', description: 'Elite closer specializing in high-ticket objection handling.', system_prompt: `You are Victoria, an elite high-ticket sales closer who specializes in home improvement. You're direct, energetic, and tactically sharp. You focus on closing techniques, urgency creation, price presentation, and handling objections with precision. No fluff — just what works. You know every objection in the book and exactly how to flip it. Keep responses punchy and tactical. Give exact scripts when helpful.`, welcome_message: `{name}! Victoria here. I close deals — that's all I do. What are we working on?` },
  { persona_id: 'ray', name: 'Coach Ray', tagline: 'Performance', description: 'High-energy performance coach using sports analogies.', system_prompt: `You are Coach Ray, a high-energy sales performance coach who uses sports analogies to drive results. You treat sales like elite athletics — preparation, execution, game film review, and peak performance mindset. You're intense but encouraging. Use sports metaphors naturally. Focus on mental toughness, discipline, routine, and momentum. Keep it energetic and motivating.`, welcome_message: `Yo {name}, Coach Ray here! We're treating your sales game like elite athletics. Tell me about your last appointment.` },
  { persona_id: 'noel', name: 'Noel', tagline: 'Strategist', description: 'Data-driven strategist focused on metrics and repeatable systems.', system_prompt: `You are Noel, a data-driven sales strategist who specializes in optimizing the home improvement sales process. You're analytical, systematic, and focused on patterns and metrics. You help reps understand their numbers, identify what's working, and build repeatable systems. Ask probing questions to understand the full picture before giving advice. Break things down into frameworks.`, welcome_message: `Hello {name}, I'm Noel. What aspect of your sales would you like to analyze today?` },
]

export default function AdminCoachPromptsPage() {
  const [prompts, setPrompts] = useState<CoachPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ jordan: true })
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [testPersona, setTestPersona] = useState<string | null>(null)
  const [testInput, setTestInput] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => { loadPrompts() }, [])

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/coach-prompts')
      const data = await res.json()
      if (data.prompts?.length > 0) {
        setPrompts(data.prompts)
      } else {
        // Seed with defaults
        setPrompts(PERSONA_DEFAULTS.map(d => ({ ...d })))
      }
    } finally {
      setLoading(false)
    }
  }

  const updatePrompt = (personaId: string, field: keyof CoachPrompt, value: string) => {
    setPrompts(prev => prev.map(p => p.persona_id === personaId ? { ...p, [field]: value } : p))
  }

  const savePrompt = async (personaId: string) => {
    const prompt = prompts.find(p => p.persona_id === personaId)
    if (!prompt) return
    setSaving(prev => ({ ...prev, [personaId]: true }))
    try {
      await fetch('/api/admin/coach-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      })
      setSaved(prev => ({ ...prev, [personaId]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [personaId]: false })), 2000)
    } finally {
      setSaving(prev => ({ ...prev, [personaId]: false }))
    }
  }

  const testPrompt = async (personaId: string) => {
    const prompt = prompts.find(p => p.persona_id === personaId)
    if (!prompt || !testInput.trim()) return
    setTesting(true)
    setTestResponse('')
    try {
      const res = await fetch('/api/admin/coach-prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: prompt.system_prompt, message: testInput }),
      })
      const data = await res.json()
      setTestResponse(data.response ?? 'No response')
    } finally {
      setTesting(false)
    }
  }

  const taStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px', color: '#F9FAFB', padding: '10px 12px', fontSize: '13px', outline: 'none', width: '100%', resize: 'vertical' }
  const inputStyle: React.CSSProperties = { ...taStyle, height: '40px', resize: 'none' }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#F9FAFB' }}>Coach Persona Prompts</h1>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Changes take effect immediately — no redeploy needed.</p>

      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: '#6B7280' }}>Loading…</div>
      ) : (
        <div className="space-y-4">
          {prompts.map(prompt => (
            <div key={prompt.persona_id} className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setExpanded(prev => ({ ...prev, [prompt.persona_id]: !prev[prompt.persona_id] }))}
                className="w-full flex items-center justify-between px-5 pt-4 pb-4">
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: '#F9FAFB' }}>{prompt.name}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{prompt.tagline}</p>
                </div>
                <span style={{ color: '#6B7280', fontSize: '12px' }}>{expanded[prompt.persona_id] ? '▲' : '▼'}</span>
              </button>

              {expanded[prompt.persona_id] && (
                <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Name</label>
                      <input style={inputStyle} value={prompt.name} onChange={e => updatePrompt(prompt.persona_id, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Tagline</label>
                      <input style={inputStyle} value={prompt.tagline} onChange={e => updatePrompt(prompt.persona_id, 'tagline', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Description (shown in Settings)</label>
                    <textarea style={{ ...taStyle, minHeight: '60px' }} value={prompt.description ?? ''} onChange={e => updatePrompt(prompt.persona_id, 'description', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>System Prompt</label>
                    <textarea style={{ ...taStyle, minHeight: '300px', fontFamily: 'monospace', fontSize: '12px' }} value={prompt.system_prompt} onChange={e => updatePrompt(prompt.persona_id, 'system_prompt', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Welcome Message</label>
                    <textarea style={{ ...taStyle, minHeight: '80px' }} value={prompt.welcome_message} onChange={e => updatePrompt(prompt.persona_id, 'welcome_message', e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setTestPersona(prompt.persona_id); setTestInput(''); setTestResponse('') }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(15,118,110,0.15)', color: '#06B6D4', border: '1px solid rgba(15,118,110,0.25)' }}>
                      Test Prompt
                    </button>
                    <button onClick={() => savePrompt(prompt.persona_id)} disabled={saving[prompt.persona_id]}
                      className="px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: saved[prompt.persona_id] ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.15)', color: saved[prompt.persona_id] ? '#34D399' : '#60A5FA', border: `1px solid ${saved[prompt.persona_id] ? 'rgba(16,185,129,0.25)' : 'rgba(29,78,216,0.25)'}` }}>
                      {saving[prompt.persona_id] ? 'Saving…' : saved[prompt.persona_id] ? '✓ Saved' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Test Prompt Modal */}
      {testPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setTestPersona(null) }}>
          <div className="w-full max-w-lg rounded-3xl p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: '#F9FAFB' }}>Test Prompt — {prompts.find(p => p.persona_id === testPersona)?.name}</h2>
              <button onClick={() => setTestPersona(null)} style={{ color: '#6B7280' }}>✕</button>
            </div>
            <textarea
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="Type a test message…"
              rows={3}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px', color: '#F9FAFB', padding: '10px 12px', fontSize: '14px', outline: 'none', width: '100%', resize: 'none', marginBottom: '12px' }}
            />
            {testResponse && (
              <div className="rounded-xl p-4 mb-3 text-sm leading-relaxed" style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.15)', color: '#D1D5DB' }}>
                {testResponse}
              </div>
            )}
            <button onClick={() => testPrompt(testPersona!)} disabled={testing || !testInput.trim()}
              className="w-full h-10 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(29,78,216,0.2)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.3)', opacity: !testInput.trim() ? 0.5 : 1 }}>
              {testing ? 'Thinking…' : 'Send Test Message'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
