'use client'
import { useState, useEffect } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

interface CoachPrompt {
  id?: string
  persona_id: string
  name: string
  tagline: string
  system_prompt: string
  welcome_message: string
  description?: string
}

interface AssistantPrompt {
  id?: string
  prompt_key: string
  display_name: string
  description?: string
  system_prompt: string
}

// ── Coach defaults ───────────────────────────────────────────────────────────

const PERSONA_DEFAULTS: CoachPrompt[] = [
  { persona_id: 'jordan', name: 'Jordan', tagline: 'Mentor', description: 'Supportive mentor focused on long-term growth and strategy.', system_prompt: `You are Jordan, a seasoned sales mentor with 20+ years in home improvement sales. You're supportive, strategic, and focused on long-term rep growth. You give thoughtful advice on sales technique, customer psychology, objection handling, and building rapport. When the rep has shared context about themselves, use it to personalize guidance. Keep responses concise and actionable — 2-4 paragraphs max. Always end with one specific thing they can do right now.`, welcome_message: `Hey {name}! I'm Jordan — your sales mentor. I'm here to help you grow, strategize, and hit your goals. What's on your mind today?` },
  { persona_id: 'victoria', name: 'Victoria', tagline: 'Closer', description: 'Elite closer specializing in high-ticket objection handling.', system_prompt: `You are Victoria, an elite high-ticket sales closer who specializes in home improvement. You're direct, energetic, and tactically sharp. You focus on closing techniques, urgency creation, price presentation, and handling objections with precision. No fluff — just what works. You know every objection in the book and exactly how to flip it. Keep responses punchy and tactical. Give exact scripts when helpful.`, welcome_message: `{name}! Victoria here. I close deals — that's all I do. What are we working on?` },
  { persona_id: 'ray', name: 'Coach Ray', tagline: 'Performance', description: 'High-energy performance coach using sports analogies.', system_prompt: `You are Coach Ray, a high-energy sales performance coach who uses sports analogies to drive results. You treat sales like elite athletics — preparation, execution, game film review, and peak performance mindset. You're intense but encouraging. Use sports metaphors naturally. Focus on mental toughness, discipline, routine, and momentum. Keep it energetic and motivating.`, welcome_message: `Yo {name}, Coach Ray here! We're treating your sales game like elite athletics. Tell me about your last appointment.` },
  { persona_id: 'noel', name: 'Noel', tagline: 'Strategist', description: 'Data-driven strategist focused on metrics and repeatable systems.', system_prompt: `You are Noel, a data-driven sales strategist who specializes in optimizing the home improvement sales process. You're analytical, systematic, and focused on patterns and metrics. You help reps understand their numbers, identify what's working, and build repeatable systems. Ask probing questions to understand the full picture before giving advice. Break things down into frameworks.`, welcome_message: `Hello {name}, I'm Noel. What aspect of your sales would you like to analyze today?` },
]

// ── Assistant defaults ───────────────────────────────────────────────────────

const ASSISTANT_DEFAULTS: AssistantPrompt[] = [
  {
    prompt_key: 'base_assistant',
    display_name: 'Base Assistant Prompt',
    description: 'Core personality and capabilities for all rep assistants',
    system_prompt: `You are {assistantName}, the AI assistant for {repName} at {company}.

You are professional, friendly, and efficient. You represent {company} with excellence on every call.

Your capabilities:
{capabilities}

Qualifying criteria (if applicable):
{qualifyingCriteria}

Always:
- Be concise and helpful
- Take accurate messages
- Represent {company} positively
- Let callers know {repName} will follow up promptly
- Keep calls under 3 minutes when possible`,
  },
  {
    prompt_key: 'greeting',
    display_name: 'Call Greeting',
    description: 'How the assistant answers calls',
    system_prompt: `Hi, you've reached {repName} at {company}. I'm {assistantName}. How can I help you today?`,
  },
  {
    prompt_key: 'voicemail',
    display_name: 'Voicemail / End of Call',
    description: 'What assistant says at end of call',
    system_prompt: `Thanks for calling {company}. I'll make sure {repName} gets your message and follows up with you shortly. Have a great day!`,
  },
  {
    prompt_key: 'qualify_leads',
    display_name: 'Lead Qualification Script',
    description: 'How assistant qualifies callers when qualify leads is enabled',
    system_prompt: `I'd love to help connect you with {repName}. To make sure we can best serve you, may I ask a few quick questions?

{qualifyingCriteria}

Based on what you've shared, I'll make sure {repName} reaches out right away.`,
  },
  {
    prompt_key: 'schedule_appointment',
    display_name: 'Appointment Scheduling Script',
    description: 'How assistant handles appointment requests',
    system_prompt: `I'd be happy to help schedule a time for {repName} to meet with you.

I'll need:
- Your name
- Your address
- Your preferred date and time
- Best number to reach you

{repName} will confirm the appointment shortly.`,
  },
]

// Sample data used when testing assistant prompts
const SAMPLE_VARS: Record<string, string> = {
  repName: 'Sarah Johnson',
  assistantName: 'Alex',
  company: 'Lifetime Home Remodeling',
  capabilities: 'schedule appointments, qualify leads, take messages',
  qualifyingCriteria: 'Homeowner within 30 miles, interested in windows or siding',
}

function replaceVars(text: string): string {
  return text
    .replace(/{repName}/g, SAMPLE_VARS.repName)
    .replace(/{assistantName}/g, SAMPLE_VARS.assistantName)
    .replace(/{company}/g, SAMPLE_VARS.company)
    .replace(/{capabilities}/g, SAMPLE_VARS.capabilities)
    .replace(/{qualifyingCriteria}/g, SAMPLE_VARS.qualifyingCriteria)
}

// ── Shared styles ────────────────────────────────────────────────────────────

const taBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '10px',
  color: '#F9FAFB',
  padding: '10px 12px',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  resize: 'vertical',
}
const inputStyle: React.CSSProperties = { ...taBase, height: '40px', resize: 'none' }

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminPromptsPage() {
  const [activeTab, setActiveTab] = useState<'coach' | 'assistant'>('coach')

  // Coach state
  const [coachPrompts, setCoachPrompts] = useState<CoachPrompt[]>([])
  const [coachLoading, setCoachLoading] = useState(true)
  const [coachExpanded, setCoachExpanded] = useState<Record<string, boolean>>({ jordan: true })
  const [coachSaving, setCoachSaving] = useState<Record<string, boolean>>({})
  const [coachSaved, setCoachSaved] = useState<Record<string, boolean>>({})

  // Assistant state
  const [assistantPrompts, setAssistantPrompts] = useState<AssistantPrompt[]>([])
  const [assistantLoading, setAssistantLoading] = useState(true)
  const [assistantExpanded, setAssistantExpanded] = useState<Record<string, boolean>>({ base_assistant: true })
  const [assistantSaving, setAssistantSaving] = useState<Record<string, boolean>>({})
  const [assistantSaved, setAssistantSaved] = useState<Record<string, boolean>>({})

  // Shared test modal state
  const [testTarget, setTestTarget] = useState<{ type: 'coach' | 'assistant'; key: string } | null>(null)
  const [testInput, setTestInput] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => { loadCoachPrompts() }, [])
  useEffect(() => { if (activeTab === 'assistant' && assistantLoading) loadAssistantPrompts() }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Coach ────────────────────────────────────────────────────────────────

  const loadCoachPrompts = async () => {
    setCoachLoading(true)
    try {
      const res = await fetch('/api/admin/coach-prompts')
      const data = await res.json()
      setCoachPrompts(data.prompts?.length > 0 ? data.prompts : PERSONA_DEFAULTS.map(d => ({ ...d })))
    } finally {
      setCoachLoading(false)
    }
  }

  const updateCoach = (personaId: string, field: keyof CoachPrompt, value: string) => {
    setCoachPrompts(prev => prev.map(p => p.persona_id === personaId ? { ...p, [field]: value } : p))
  }

  const saveCoach = async (personaId: string) => {
    const prompt = coachPrompts.find(p => p.persona_id === personaId)
    if (!prompt) return
    setCoachSaving(prev => ({ ...prev, [personaId]: true }))
    try {
      await fetch('/api/admin/coach-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      })
      setCoachSaved(prev => ({ ...prev, [personaId]: true }))
      setTimeout(() => setCoachSaved(prev => ({ ...prev, [personaId]: false })), 2000)
    } finally {
      setCoachSaving(prev => ({ ...prev, [personaId]: false }))
    }
  }

  // ── Assistant ────────────────────────────────────────────────────────────

  const loadAssistantPrompts = async () => {
    setAssistantLoading(true)
    try {
      const res = await fetch('/api/admin/assistant-prompts')
      const data = await res.json()
      if (data.prompts?.length > 0) {
        // Merge DB data with defaults (DB wins on system_prompt, keep defaults for display_name/description)
        const merged = ASSISTANT_DEFAULTS.map(def => {
          const dbRow = data.prompts.find((p: AssistantPrompt) => p.prompt_key === def.prompt_key)
          return dbRow ? { ...def, ...dbRow } : def
        })
        setAssistantPrompts(merged)
      } else {
        setAssistantPrompts(ASSISTANT_DEFAULTS.map(d => ({ ...d })))
      }
    } finally {
      setAssistantLoading(false)
    }
  }

  const updateAssistant = (promptKey: string, value: string) => {
    setAssistantPrompts(prev => prev.map(p => p.prompt_key === promptKey ? { ...p, system_prompt: value } : p))
  }

  const saveAssistant = async (promptKey: string) => {
    const prompt = assistantPrompts.find(p => p.prompt_key === promptKey)
    if (!prompt) return
    setAssistantSaving(prev => ({ ...prev, [promptKey]: true }))
    try {
      await fetch('/api/admin/assistant-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      })
      setAssistantSaved(prev => ({ ...prev, [promptKey]: true }))
      setTimeout(() => setAssistantSaved(prev => ({ ...prev, [promptKey]: false })), 2000)
    } finally {
      setAssistantSaving(prev => ({ ...prev, [promptKey]: false }))
    }
  }

  // ── Test ─────────────────────────────────────────────────────────────────

  const openTest = (type: 'coach' | 'assistant', key: string) => {
    setTestTarget({ type, key })
    setTestInput('')
    setTestResponse('')
  }

  const runTest = async () => {
    if (!testTarget || !testInput.trim()) return
    setTesting(true)
    setTestResponse('')
    try {
      let systemPrompt = ''
      if (testTarget.type === 'coach') {
        systemPrompt = coachPrompts.find(p => p.persona_id === testTarget.key)?.system_prompt ?? ''
      } else {
        const raw = assistantPrompts.find(p => p.prompt_key === testTarget.key)?.system_prompt ?? ''
        systemPrompt = replaceVars(raw)
      }
      const res = await fetch('/api/admin/coach-prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, message: testInput }),
      })
      const data = await res.json()
      setTestResponse(data.response ?? 'No response')
    } finally {
      setTesting(false)
    }
  }

  const testLabel = testTarget?.type === 'coach'
    ? coachPrompts.find(p => p.persona_id === testTarget.key)?.name
    : assistantPrompts.find(p => p.prompt_key === testTarget?.key)?.display_name

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#F9FAFB' }}>Prompt Editor</h1>
      <p className="text-sm mb-5" style={{ color: '#6B7280' }}>Changes take effect immediately — no redeploy needed.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'inline-flex' }}>
        {(['coach', 'assistant'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab ? (tab === 'coach' ? 'rgba(29,78,216,0.25)' : 'rgba(6,182,212,0.2)') : 'transparent',
              color: activeTab === tab ? (tab === 'coach' ? '#60A5FA' : '#06B6D4') : '#6B7280',
              border: activeTab === tab ? `1px solid ${tab === 'coach' ? 'rgba(29,78,216,0.35)' : 'rgba(6,182,212,0.3)'}` : '1px solid transparent',
            }}>
            {tab === 'coach' ? 'Coach Personas' : 'Assistant Prompts'}
          </button>
        ))}
      </div>

      {/* ── COACH TAB ── */}
      {activeTab === 'coach' && (
        <>
          {coachLoading ? (
            <div className="text-center py-12 text-sm" style={{ color: '#6B7280' }}>Loading…</div>
          ) : (
            <div className="space-y-4">
              {coachPrompts.map(prompt => (
                <div key={prompt.persona_id} className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => setCoachExpanded(prev => ({ ...prev, [prompt.persona_id]: !prev[prompt.persona_id] }))}
                    className="w-full flex items-center justify-between px-5 pt-4 pb-4">
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: '#F9FAFB' }}>{prompt.name}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{prompt.tagline}</p>
                    </div>
                    <span style={{ color: '#6B7280', fontSize: '12px' }}>{coachExpanded[prompt.persona_id] ? '▲' : '▼'}</span>
                  </button>

                  {coachExpanded[prompt.persona_id] && (
                    <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                          <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Name</label>
                          <input style={inputStyle} value={prompt.name} onChange={e => updateCoach(prompt.persona_id, 'name', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Tagline</label>
                          <input style={inputStyle} value={prompt.tagline} onChange={e => updateCoach(prompt.persona_id, 'tagline', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Description (shown in Settings)</label>
                        <textarea style={{ ...taBase, minHeight: '60px' }} value={prompt.description ?? ''} onChange={e => updateCoach(prompt.persona_id, 'description', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>System Prompt</label>
                        <textarea style={{ ...taBase, minHeight: '300px', fontFamily: 'monospace', fontSize: '12px' }} value={prompt.system_prompt} onChange={e => updateCoach(prompt.persona_id, 'system_prompt', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Welcome Message</label>
                        <textarea style={{ ...taBase, minHeight: '80px' }} value={prompt.welcome_message} onChange={e => updateCoach(prompt.persona_id, 'welcome_message', e.target.value)} />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => openTest('coach', prompt.persona_id)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: 'rgba(15,118,110,0.15)', color: '#06B6D4', border: '1px solid rgba(15,118,110,0.25)' }}>
                          Test Prompt
                        </button>
                        <button onClick={() => saveCoach(prompt.persona_id)} disabled={coachSaving[prompt.persona_id]}
                          className="px-4 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: coachSaved[prompt.persona_id] ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.15)', color: coachSaved[prompt.persona_id] ? '#34D399' : '#60A5FA', border: `1px solid ${coachSaved[prompt.persona_id] ? 'rgba(16,185,129,0.25)' : 'rgba(29,78,216,0.25)'}` }}>
                          {coachSaving[prompt.persona_id] ? 'Saving…' : coachSaved[prompt.persona_id] ? '✓ Saved' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ASSISTANT TAB ── */}
      {activeTab === 'assistant' && (
        <>
          <h2 className="text-lg font-bold mb-1" style={{ color: '#F9FAFB' }}>AI Assistant Prompts</h2>
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Edit how rep assistants speak and behave. Changes apply immediately — no redeploy needed.</p>

          {/* Variables info banner */}
          <div className="mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#06B6D4' }}>Variables you can use in prompts:</p>
            <p className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
              {'{repName}'}{'  '}{'{assistantName}'}{'  '}{'{company}'}{'  '}{'{capabilities}'}{'  '}{'{qualifyingCriteria}'}
            </p>
            <p className="text-xs mt-1.5" style={{ color: '#4B5563' }}>Test button uses sample data: <span className="font-medium" style={{ color: '#6B7280' }}>Sarah Johnson · Alex · Lifetime Home Remodeling</span></p>
          </div>

          {assistantLoading ? (
            <div className="text-center py-12 text-sm" style={{ color: '#6B7280' }}>Loading…</div>
          ) : (
            <div className="space-y-4">
              {assistantPrompts.map(prompt => (
                <div key={prompt.prompt_key} className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => setAssistantExpanded(prev => ({ ...prev, [prompt.prompt_key]: !prev[prompt.prompt_key] }))}
                    className="w-full flex items-center justify-between px-5 pt-4 pb-4">
                    <p className="text-sm font-bold text-left" style={{ color: '#F9FAFB' }}>{prompt.display_name}</p>
                    <span style={{ color: '#6B7280', fontSize: '12px' }}>{assistantExpanded[prompt.prompt_key] ? '▲' : '▼'}</span>
                  </button>

                  {assistantExpanded[prompt.prompt_key] && (
                    <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {prompt.description && (
                        <p className="pt-4 text-xs leading-relaxed" style={{ color: '#6B7280', fontStyle: 'italic' }}>{prompt.description}</p>
                      )}
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Prompt</label>
                        <textarea
                          style={{ ...taBase, minHeight: '200px', fontFamily: 'monospace' }}
                          value={prompt.system_prompt}
                          onChange={e => updateAssistant(prompt.prompt_key, e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => openTest('assistant', prompt.prompt_key)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: 'rgba(6,182,212,0.08)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)' }}>
                          Test Prompt
                        </button>
                        <button onClick={() => saveAssistant(prompt.prompt_key)} disabled={assistantSaving[prompt.prompt_key]}
                          className="px-4 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: assistantSaved[prompt.prompt_key] ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, rgba(29,78,216,0.3), rgba(6,182,212,0.3))', color: assistantSaved[prompt.prompt_key] ? '#34D399' : '#60A5FA', border: `1px solid ${assistantSaved[prompt.prompt_key] ? 'rgba(16,185,129,0.25)' : 'rgba(29,78,216,0.25)'}` }}>
                          {assistantSaving[prompt.prompt_key] ? 'Saving…' : assistantSaved[prompt.prompt_key] ? '✓ Prompt updated' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SHARED TEST MODAL ── */}
      {testTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setTestTarget(null) }}>
          <div className="w-full max-w-lg rounded-3xl p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: '#F9FAFB' }}>Test Prompt — {testLabel}</h2>
              <button onClick={() => setTestTarget(null)} style={{ color: '#6B7280', fontSize: '18px' }}>✕</button>
            </div>

            {testTarget.type === 'assistant' && (
              <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ color: '#6B7280', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}>
                Variables replaced with sample data: {SAMPLE_VARS.repName} · {SAMPLE_VARS.assistantName} · {SAMPLE_VARS.company}
              </p>
            )}

            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Test with this caller message:</p>
            <textarea
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="e.g. I'd like to schedule a free estimate…"
              rows={3}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px', color: '#F9FAFB', padding: '10px 12px', fontSize: '14px', outline: 'none', width: '100%', resize: 'none', marginBottom: '12px' }}
            />

            {testResponse && (
              <div className="rounded-xl p-4 mb-3 text-sm leading-relaxed" style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.15)', color: '#D1D5DB' }}>
                {testResponse}
              </div>
            )}

            <button onClick={runTest} disabled={testing || !testInput.trim()}
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
