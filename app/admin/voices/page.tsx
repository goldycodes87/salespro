'use client'

import { useState, useEffect, useRef } from 'react'

interface VoiceConfig {
  id: string
  config_key: string
  voice_id: string
  voice_name: string
  provider: string
  gender: string | null
  persona: string | null
  active: boolean
  sort_order: number
}

const COACH_KEYS = ['coach_jordan', 'coach_victoria', 'coach_ray', 'coach_noel']
const COACH_PHOTOS: Record<string, string> = {
  coach_jordan: '/coaches/jordan.png',
  coach_victoria: '/coaches/victoria.png',
  coach_ray: '/coaches/coach-ray.png',
  coach_noel: '/coaches/noel.png',
}

function PreviewButton({ voiceId, label }: { voiceId: string; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const preview = async () => {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return }
    setPlaying(true)
    try {
      const res = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId }),
      })
      if (!res.ok) throw new Error('Preview failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.play()
    } catch {
      setPlaying(false)
    }
  }

  return (
    <button onClick={preview}
      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{
        background: playing ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${playing ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.1)'}`,
        color: playing ? '#06B6D4' : '#9CA3AF',
      }}
    >
      {playing ? '▶ Playing…' : (label ?? '▶ Preview')}
    </button>
  )
}

interface EditVoiceModalProps {
  voice: VoiceConfig
  onSave: (updates: Partial<VoiceConfig>) => void
  onClose: () => void
}

function EditVoiceModal({ voice, onSave, onClose }: EditVoiceModalProps) {
  const [voiceId, setVoiceId] = useState(voice.voice_id)
  const [voiceName, setVoiceName] = useState(voice.voice_name)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/voice-configs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_key: voice.config_key, voice_id: voiceId, voice_name: voiceName }),
    })
    onSave({ voice_id: voiceId, voice_name: voiceName })
    setSaving(false)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#F9FAFB',
    width: '100%',
    height: '42px',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: '#F9FAFB' }}>Edit Voice</h3>
          <button onClick={onClose} style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9CA3AF' }}>Voice Name</label>
            <input value={voiceName} onChange={e => setVoiceName(e.target.value)} style={inputStyle} placeholder="e.g. Jordan" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9CA3AF' }}>ElevenLabs Voice ID</label>
            <input value={voiceId} onChange={e => setVoiceId(e.target.value)} style={inputStyle} placeholder="pNInz6obpgDQGcFmaJgB" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs" style={{ color: '#6B7280' }}>Preview with entered ID:</span>
          <PreviewButton voiceId={voiceId} />
        </div>

        <p className="text-xs mb-4" style={{ color: '#4B5563' }}>
          Note: Reps will need to restart voice sessions to hear the new voice.
        </p>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#1D4ED8,#06B6D4)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AddVoiceModalProps {
  defaultGender: 'female' | 'male'
  onAdd: (voice: Omit<VoiceConfig, 'id' | 'created_at'>) => void
  onClose: () => void
}

function AddVoiceModal({ defaultGender, onAdd, onClose }: AddVoiceModalProps) {
  const [voiceName, setVoiceName] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [gender, setGender] = useState<'female' | 'male'>(defaultGender)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!voiceName.trim() || !voiceId.trim()) return
    setSaving(true)
    const configKey = `assistant_custom_${Date.now()}`
    const payload = {
      config_key: configKey,
      voice_id: voiceId.trim(),
      voice_name: voiceName.trim(),
      provider: 'elevenlabs',
      gender,
      persona: 'assistant',
      active: true,
      sort_order: 99,
    }
    await fetch('/api/admin/voice-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    onAdd(payload as any)
    setSaving(false)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#F9FAFB',
    width: '100%',
    height: '42px',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: '#F9FAFB' }}>Add Voice</h3>
          <button onClick={onClose} style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9CA3AF' }}>Voice Name</label>
            <input value={voiceName} onChange={e => setVoiceName(e.target.value)} style={inputStyle} placeholder="e.g. Rachel" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9CA3AF' }}>ElevenLabs Voice ID</label>
            <input value={voiceId} onChange={e => setVoiceId(e.target.value)} style={inputStyle} placeholder="pNInz6obpgDQGcFmaJgB" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9CA3AF' }}>Gender</label>
            <div className="flex gap-2">
              {(['female', 'male'] as const).map(g => (
                <button key={g} onClick={() => setGender(g)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: gender === g ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)',
                    border: gender === g ? '1px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: gender === g ? '#60A5FA' : '#9CA3AF',
                  }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {voiceId && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs" style={{ color: '#6B7280' }}>Preview:</span>
            <PreviewButton voiceId={voiceId} />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || !voiceName.trim() || !voiceId.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#1D4ED8,#06B6D4)', color: '#fff', opacity: saving || !voiceName || !voiceId ? 0.5 : 1 }}>
            {saving ? 'Adding…' : 'Add Voice'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminVoicesPage() {
  const [voices, setVoices] = useState<VoiceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editVoice, setEditVoice] = useState<VoiceConfig | null>(null)
  const [addGender, setAddGender] = useState<'female' | 'male' | null>(null)

  useEffect(() => {
    fetch('/api/admin/voice-configs')
      .then(r => r.json())
      .then(d => { setVoices(d.voices ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleActive = async (v: VoiceConfig) => {
    setVoices(prev => prev.map(x => x.id === v.id ? { ...x, active: !x.active } : x))
    await fetch('/api/admin/voice-configs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_key: v.config_key, active: !v.active }),
    })
  }

  const deleteVoice = async (v: VoiceConfig) => {
    if (!confirm(`Delete voice "${v.voice_name}"? Reps who already selected it will keep it.`)) return
    setVoices(prev => prev.filter(x => x.id !== v.id))
    await fetch('/api/admin/voice-configs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_key: v.config_key }),
    })
  }

  const coachVoices = voices.filter(v => COACH_KEYS.includes(v.config_key))
  const assistantVoices = voices.filter(v => !COACH_KEYS.includes(v.config_key))

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3B82F6' }} />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-16 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Voice Management</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Manage ElevenLabs voices for coaches and assistants</p>
      </div>

      {/* Coach Voices */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-base font-bold" style={{ color: '#F9FAFB' }}>Coach Voices</h2>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Voice used when reps talk to each coach</p>
        </div>
        <div className="space-y-2">
          {coachVoices.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={COACH_PHOTOS[v.config_key] ?? '/coaches/jordan.png'} alt={v.voice_name}
                className="w-10 h-10 rounded-xl object-cover object-top flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{v.voice_name}</p>
                <p className="text-xs mt-0.5 font-mono truncate" style={{ color: '#6B7280' }}>
                  {v.voice_id.slice(0, 12)}…
                </p>
              </div>
              <PreviewButton voiceId={v.voice_id} />
              <button onClick={() => setEditVoice(v)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.1)' }}>
                Edit
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Assistant Voices */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#F9FAFB' }}>Assistant Voices</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Voices reps can choose for their AI assistant</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {assistantVoices.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', opacity: v.active ? 1 : 0.5 }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                style={{ background: v.gender === 'female' ? 'rgba(168,85,247,0.15)' : 'rgba(29,78,216,0.15)' }}>
                {v.gender === 'female' ? '👩' : '👨'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{v.voice_name}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {v.gender ?? 'unknown'} · <span className="font-mono">{v.voice_id.slice(0, 10)}…</span>
                </p>
              </div>
              <PreviewButton voiceId={v.voice_id} />
              <button onClick={() => toggleActive(v)}
                className="w-10 h-6 rounded-full relative flex-shrink-0"
                style={{ background: v.active ? '#10B981' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white"
                  style={{ left: v.active ? 'calc(100% - 20px)' : '4px', transition: 'left 0.2s' }} />
              </button>
              <button onClick={() => deleteVoice(v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
          {assistantVoices.length === 0 && (
            <div className="rounded-2xl p-6 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm" style={{ color: '#4B5563' }}>No assistant voices yet. Add one below.</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setAddGender('female')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(168,85,247,0.1)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.2)' }}>
            + Add Female Voice
          </button>
          <button onClick={() => setAddGender('male')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.2)' }}>
            + Add Male Voice
          </button>
        </div>
      </section>

      {editVoice && (
        <EditVoiceModal
          voice={editVoice}
          onSave={updates => setVoices(prev => prev.map(v => v.id === editVoice.id ? { ...v, ...updates } : v))}
          onClose={() => setEditVoice(null)}
        />
      )}

      {addGender && (
        <AddVoiceModal
          defaultGender={addGender}
          onAdd={newVoice => setVoices(prev => [...prev, { ...newVoice, id: Date.now().toString() } as VoiceConfig])}
          onClose={() => setAddGender(null)}
        />
      )}
    </div>
  )
}
