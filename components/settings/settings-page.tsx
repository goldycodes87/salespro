'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { FinancingOptionSetting, DiscountOptionSetting } from '@/lib/pricing'
import { DEFAULT_FINANCING_SETTINGS, DEFAULT_DISCOUNT_SETTINGS } from '@/lib/pricing'
import { formatPhone } from '@/hooks/usePhoneFormat'
import { PERSONAS } from '@/lib/coach-personas'
import { getPlatformsForIndustry, PLATFORM_REGISTRY } from '@/lib/platform-registry'
import JobTypesTab from './job-types-tab'

function PersonaPhoto({ personaId, color }: { personaId: string; color: string }) {
  const [error, setError] = useState(false)
  const persona = PERSONAS.find(p => p.id === personaId)!
  if (error) {
    return (
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
        style={{ background: color }}
      >
        {persona.avatar}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/coaches/${persona.photoFile}.png`}
      alt={persona.name}
      className="w-14 h-14 rounded-2xl object-cover object-top flex-shrink-0"
      onError={() => setError(true)}
    />
  )
}

type Rep = Record<string, any>
type Usage = {
  byService: Record<string, { count: number; cost: number }>
  totalCost: number
  count: number
}
type Contact = {
  id: string
  name: string
  relationship: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px',
  color: '#F9FAFB',
  width: '100%',
  height: '44px',
  padding: '0 14px',
  fontSize: '14px',
  outline: 'none',
}

const focusStyle: React.CSSProperties = {
  background: 'rgba(29,78,216,0.08)',
  border: '1px solid rgba(29,78,216,0.5)',
}

function FocusInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === 'tel' ? formatPhone(e.target.value) : e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, height: '48px', fontSize: '15px', ...(focused ? focusStyle : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function SmallInput({ value, onChange, placeholder, type = 'text', style }: {
  value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, height: '38px', fontSize: '13px', ...(focused ? focusStyle : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className="relative flex-shrink-0 cursor-pointer" style={{ width: '36px', height: '22px' }}>
      <div className="absolute inset-0 rounded-full transition-all"
        style={{ background: on ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
      <div className="absolute top-[2px] rounded-full transition-all"
        style={{ width: '18px', height: '18px', background: '#fff', left: on ? '16px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function CollapsibleSection({
  title, children, defaultOpen = false, storageKey,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; storageKey: string
}) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`section_${storageKey}`)
      if (stored !== null) return stored === 'true'
    }
    return defaultOpen
  })

  const toggle = () => {
    setIsOpen(prev => {
      const next = !prev
      if (typeof window !== 'undefined') localStorage.setItem(`section_${storageKey}`, String(next))
      return next
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 pt-4 pb-3"
        style={{ borderBottom: isOpen ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>{title}</h2>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
          <ChevronDown size={14} color="#6B7280" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <div className="p-5 space-y-4">{children}</div>
      </motion.div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
      {children}
    </div>
  )
}

function SaveButton({ saving, saved, onClick, label = 'Save' }: {
  saving: boolean; saved: boolean; onClick: () => void; label?: string
}) {
  return (
    <button onClick={onClick} disabled={saving}
      className="w-full h-11 rounded-xl text-sm font-semibold"
      style={{
        background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(29,78,216,0.2)',
        color: saved ? '#34D399' : '#60A5FA',
        border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(29,78,216,0.3)'}`,
      }}>
      {saving ? 'Saving…' : saved ? 'Saved!' : label}
    </button>
  )
}

const VOICE_OPTIONS = {
  female: [
    { name: 'Rachel', voice_id: '21m00Tcm4TlvDq8ikWAM' },
    { name: 'Bella',  voice_id: 'EXAVITQu4vr4xnSDxMaL' },
    { name: 'Elli',   voice_id: 'MF3mGyEYCl7XYWbV9V6O' },
  ],
  male: [
    { name: 'Adam', voice_id: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Josh', voice_id: 'TxGEqnHWrfWFTfGW9XjX' },
    { name: 'Sam',  voice_id: 'yoZ06aMxZJJ28mfd3POQ' },
  ],
}

const CAPABILITIES = [
  { id: 'answer_all',     icon: '📞', label: 'Answer all calls' },
  { id: 'answer_dnd',    icon: '🔕', label: 'Answer calls on DND only' },
  { id: 'schedule',      icon: '📅', label: 'Schedule appointments' },
  { id: 'qualify',       icon: '👤', label: 'Qualify leads' },
  { id: 'email_summary', icon: '📧', label: 'Send call summary emails' },
  { id: 'outbound',      icon: '📱', label: 'Make outbound calls' },
]

type TabId = 'general' | 'assistant' | 'coach' | 'calendar' | 'integrations' | 'jobtypes'

export default function SettingsPage({
  rep,
  usage,
  coachConfig,
  calendarConnections,
  contacts: initialContacts = [],
  industry,
}: {
  rep: Rep
  usage: Usage
  coachConfig?: { active_persona_id?: string } | null
  calendarConnections?: Array<{ id: string; provider: string; ical_url?: string | null; last_synced_at?: string | null }> | null
  contacts?: Contact[]
  industry?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const settings = rep.settings ?? {}

  const initialTab = (searchParams.get('tab') as TabId) ?? 'general'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Notification from OAuth callback
  const connectedParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  const [profile, setProfile] = useState({
    full_name: rep.full_name ?? '',
    phone: rep.phone ?? '',
  })
  const [industries, setIndustries] = useState<string[]>(Array.isArray(rep.industries) ? rep.industries as string[] : [])
  const [territory, setTerritory] = useState(rep.territory as string ?? '')
  const [defaults, setDefaults] = useState({
    company_name: settings.company_name ?? 'Lifetime Home Remodeling',
    rep_title: settings.rep_title ?? 'Sales Representative',
    warranty_years: String(settings.warranty_years ?? '10'),
    default_margin: String(settings.default_margin ?? '35'),
  })
  const [financingOpts, setFinancingOpts] = useState<FinancingOptionSetting[]>(
    settings.financing_options ?? DEFAULT_FINANCING_SETTINGS
  )
  const [discountOpts, setDiscountOpts] = useState<DiscountOptionSetting[]>(
    settings.discount_options ?? DEFAULT_DISCOUNT_SETTINGS
  )

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [savingFinancing, setSavingFinancing] = useState(false)
  const [savingDiscounts, setSavingDiscounts] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [defaultsSaved, setDefaultsSaved] = useState(false)
  const [financingSaved, setFinancingSaved] = useState(false)
  const [discountsSaved, setDiscountsSaved] = useState(false)
  const [headshot, setHeadshot] = useState<string | null>(rep.headshot_url ?? null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Coach state
  const [activePersonaId, setActivePersonaId] = useState(coachConfig?.active_persona_id ?? 'jordan')
  const [savingPersona, setSavingPersona] = useState(false)
  const [personaSaved, setPersonaSaved] = useState(false)
  const [clearingPersona, setClearingPersona] = useState<string | null>(null)
  const [pendingPersonaId, setPendingPersonaId] = useState<string | null>(null)
  const [switchToast, setSwitchToast] = useState<string | null>(null)

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [addingContact, setAddingContact] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactDraft, setContactDraft] = useState<Omit<Contact, 'id'>>({ name: '', relationship: '', phone: '', email: '', notes: '' })
  const [deletingContact, setDeletingContact] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Calendar state
  const [connections, setConnections] = useState(calendarConnections ?? [])
  const [icalUrl, setIcalUrl] = useState('')
  const [addingIcal, setAddingIcal] = useState(false)
  const [icalError, setIcalError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [removingConn, setRemovingConn] = useState<string | null>(null)
  const [showICloudModal, setShowICloudModal] = useState(false)
  const [iCloudEmail, setICloudEmail] = useState('')
  const [iCloudPassword, setICloudPassword] = useState('')
  const [connectingICloud, setConnectingICloud] = useState(false)
  const [iCloudError, setICloudError] = useState<string | null>(null)

  // Assistant state
  const initConfig = (rep.assistant_config ?? {}) as Record<string, any>
  const [assistantEnabled, setAssistantEnabled] = useState<boolean>(initConfig.enabled ?? false)
  const [assistantName, setAssistantName]       = useState<string>(initConfig.name ?? 'Alex')
  const [selectedVoice, setSelectedVoice]       = useState<string>(initConfig.voice_id ?? '')
  const [voiceTab, setVoiceTab]                 = useState<'female' | 'male'>('female')
  const [capabilities, setCapabilities]         = useState<string[]>(initConfig.capabilities ?? [])
  const [qualifyCriteria, setQualifyCriteria]   = useState<string>(initConfig.qualifying_criteria ?? '')
  const [asPhoneType, setAsPhoneType]           = useState<string>(initConfig.phone_type ?? '')
  const [areaCode, setAreaCode]                 = useState('')
  const [availableNumbers, setAvailableNumbers] = useState<{ phoneNumber: string; friendlyName: string }[]>([])
  const [searchingNumbers, setSearchingNumbers] = useState(false)
  const [selectedNumber, setSelectedNumber]     = useState<string>(initConfig.business_number ?? '')
  const [dndActive, setDndActive]               = useState<boolean>(initConfig.dnd_active ?? false)
  const [dndDuringAppts, setDndDuringAppts]     = useState<boolean>(initConfig.dnd_during_appointments ?? false)
  const initMeetingOptions = (initConfig.meeting_options ?? {}) as Record<string, boolean>
  const [disclosureReminder, setDisclosureReminder] = useState<boolean>(initMeetingOptions.disclosure_reminder !== false)
  const [previewingVoice, setPreviewingVoice]   = useState('')
  const [showVoicePicker, setShowVoicePicker]   = useState(false)
  const [savingAssistant, setSavingAssistant]   = useState(false)
  const [assistantSaved, setAssistantSaved]     = useState(false)
  const [usesExternalQuoting, setUsesExternalQuoting] = useState<boolean>(rep.uses_external_quoting ?? false)
  const [copiedAgentmail, setCopiedAgentmail]   = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const previewVoice = async (voice_id: string) => {
    if (previewingVoice === voice_id) return
    setPreviewingVoice(voice_id)
    try {
      const res = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id }),
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      audio.onended = () => setPreviewingVoice('')
    } catch {
      setPreviewingVoice('')
    }
  }

  const searchNumbers = async () => {
    if (areaCode.length !== 3) return
    setSearchingNumbers(true)
    try {
      const res = await fetch('/api/twilio/search-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaCode }),
      })
      const data = await res.json()
      setAvailableNumbers(data.numbers ?? [])
    } catch {
      setAvailableNumbers([])
    } finally {
      setSearchingNumbers(false)
    }
  }

  const toggleCap = (id: string) =>
    setCapabilities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const saveAssistant = async () => {
    setSavingAssistant(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uses_external_quoting: usesExternalQuoting,
        assistant_config: {
          enabled: assistantEnabled,
          name: assistantName,
          voice_id: selectedVoice || null,
          capabilities,
          qualifying_criteria: qualifyCriteria || null,
          phone_type: asPhoneType || null,
          business_number: selectedNumber || null,
          dnd_active: dndActive,
          dnd_during_appointments: dndDuringAppts,
          meeting_options: { ...initMeetingOptions, disclosure_reminder: disclosureReminder },
        },
      }),
    })
    setSavingAssistant(false)
    savedFlash(setAssistantSaved)
    // If enabling assistant and no vapi_assistant_id yet, create it
    if (assistantEnabled && !rep.vapi_assistant_id) {
      fetch('/api/vapi/create-assistant', { method: 'POST' }).catch(() => {})
    }
  }

  const savedFlash = (setter: (v: boolean) => void) => {
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const uploadHeadshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/reps/headshot', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setHeadshot(data.headshot_url)
    } catch (err: any) {
      setPhotoError(err.message)
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: profile.full_name, phone: profile.phone.replace(/\D/g, '') || null, industries, territory: territory.trim() || null }),
    })
    setSavingProfile(false)
    savedFlash(setProfileSaved)
  }

  const saveDefaults = async () => {
    setSavingDefaults(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          ...settings,
          company_name: defaults.company_name,
          rep_title: defaults.rep_title,
          warranty_years: Number(defaults.warranty_years),
          default_margin: Number(defaults.default_margin),
        },
      }),
    })
    setSavingDefaults(false)
    savedFlash(setDefaultsSaved)
  }

  const saveFinancing = async () => {
    setSavingFinancing(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...settings, financing_options: financingOpts } }),
    })
    setSavingFinancing(false)
    savedFlash(setFinancingSaved)
  }

  const saveDiscounts = async () => {
    setSavingDiscounts(true)
    await fetch('/api/reps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...settings, discount_options: discountOpts } }),
    })
    setSavingDiscounts(false)
    savedFlash(setDiscountsSaved)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const updateFinancing = (idx: number, updates: Partial<FinancingOptionSetting>) =>
    setFinancingOpts(prev => prev.map((o, i) => i === idx ? { ...o, ...updates } : o))
  const removeFinancing = (idx: number) =>
    setFinancingOpts(prev => prev.filter((_, i) => i !== idx))
  const addFinancing = () =>
    setFinancingOpts(prev => [...prev, {
      id: `custom_${Date.now()}`, label: '', method: 'factor', factor: 0.01, active: true,
    }])

  const updateDiscount = (idx: number, updates: Partial<DiscountOptionSetting>) =>
    setDiscountOpts(prev => prev.map((o, i) => i === idx ? { ...o, ...updates } : o))
  const removeDiscount = (idx: number) =>
    setDiscountOpts(prev => prev.filter((_, i) => i !== idx))
  const addDiscount = () =>
    setDiscountOpts(prev => [...prev, {
      id: `custom_${Date.now()}`, name: '', pct: 10, type: 'promotion', active: true,
    }])

  const savePersona = async (personaId: string) => {
    setActivePersonaId(personaId)
    setPendingPersonaId(null)
    setSavingPersona(true)
    await fetch('/api/coach/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_persona_id: personaId }),
    })
    // Insert welcome message from new coach
    const persona = PERSONAS.find(p => p.id === personaId)
    if (persona) {
      const repName = rep.full_name?.split(' ')[0] ?? 'there'
      fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId, content: `__switch_welcome__${persona.welcomeMessage(repName)}` }),
      }).catch(() => {})
    }
    setSavingPersona(false)
    savedFlash(setPersonaSaved)
    const pName = PERSONAS.find(p => p.id === personaId)?.name ?? 'Coach'
    setSwitchToast(`${pName} is ready. They know everything.`)
    setTimeout(() => setSwitchToast(null), 3000)
    if (rep.vapi_coach_id) {
      fetch('/api/vapi/create-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: personaId }),
      }).catch(() => {})
    }
  }

  const addContact = async () => {
    if (!contactDraft.name.trim()) return
    setSavingContact(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactDraft),
      })
      const data = await res.json()
      if (data.contact) {
        setContacts(prev => [data.contact, ...prev])
        setContactDraft({ name: '', relationship: '', phone: '', email: '', notes: '' })
        setAddingContact(false)
      }
    } finally {
      setSavingContact(false)
    }
  }

  const updateContact = async () => {
    if (!editingContact) return
    setSavingContact(true)
    try {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactDraft),
      })
      const data = await res.json()
      if (data.contact) {
        setContacts(prev => prev.map(c => c.id === editingContact.id ? data.contact : c))
        setEditingContact(null)
      }
    } finally {
      setSavingContact(false)
    }
  }

  const deleteContact = async (id: string) => {
    setDeletingContact(id)
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      setContacts(prev => prev.filter(c => c.id !== id))
      setConfirmDeleteId(null)
    } finally {
      setDeletingContact(null)
    }
  }

  const openEditContact = (c: Contact) => {
    setEditingContact(c)
    setContactDraft({ name: c.name, relationship: c.relationship ?? '', phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '' })
  }

  const clearPersonaHistory = async (personaId: string) => {
    setClearingPersona(personaId)
    await fetch(`/api/coach/messages?personaId=${personaId}`, { method: 'DELETE' })
    setClearingPersona(null)
  }

  const addIcalUrl = async () => {
    if (!icalUrl.trim()) return
    setAddingIcal(true)
    setIcalError(null)
    try {
      const res = await fetch('/api/calendar/ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icalUrl: icalUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add calendar')
      setIcalUrl('')
      router.refresh()
    } catch (err: any) {
      setIcalError(err.message)
    } finally {
      setAddingIcal(false)
    }
  }

  const syncCalendars = async () => {
    setSyncing(true)
    try {
      await fetch('/api/calendar/sync', { method: 'POST' })
    } finally {
      setSyncing(false)
    }
  }

  const removeConnection = async (id: string) => {
    setRemovingConn(id)
    try {
      await fetch(`/api/calendar/connections/${id}`, { method: 'DELETE' })
      setConnections(prev => prev.filter(c => c.id !== id))
    } finally {
      setRemovingConn(null)
    }
  }

  const connectICloud = async () => {
    if (!iCloudEmail.trim() || !iCloudPassword.trim()) return
    setConnectingICloud(true)
    setICloudError(null)
    try {
      const res = await fetch('/api/calendar/caldav/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: iCloudEmail.trim(), password: iCloudPassword.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Connection failed')
      setConnections(prev => {
        const filtered = prev.filter(c => c.provider !== 'caldav_icloud')
        return [...filtered, { id: data.id ?? 'icloud', provider: 'caldav_icloud', last_synced_at: null }]
      })
      setShowICloudModal(false)
      setICloudEmail('')
      setICloudPassword('')
    } catch (err: any) {
      setICloudError(err.message)
    } finally {
      setConnectingICloud(false)
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general',      label: 'General' },
    { id: 'assistant',    label: 'Assistant' },
    { id: 'coach',        label: 'Coach' },
    { id: 'calendar',     label: 'Calendar' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'jobtypes',     label: 'Job Types' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="px-4 pt-6 pb-10 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Settings</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
            style={{
              background: activeTab === tab.id ? 'rgba(29,78,216,0.3)' : 'transparent',
              color: activeTab === tab.id ? '#60A5FA' : '#6B7280',
              border: activeTab === tab.id ? '1px solid rgba(29,78,216,0.3)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications from OAuth */}
      {activeTab === 'calendar' && connectedParam && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34D399' }}>
          {connectedParam === 'google' ? 'Google Calendar connected!' : 'Calendar connected!'}
        </div>
      )}
      {activeTab === 'calendar' && errorParam && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
          Connection failed. Please try again.
        </div>
      )}

      {/* GENERAL TAB */}
      {activeTab === 'general' && (
        <>
          {/* Profile Photo */}
          <CollapsibleSection title="Profile Photo" storageKey="profile-photo">
            <div className="flex flex-col items-center gap-4 py-2">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(29,78,216,0.15)', border: '2px solid rgba(29,78,216,0.3)' }}>
                  {headshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={headshot} alt="Headshot" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif"
                  className="hidden" onChange={uploadHeadshot} disabled={uploadingPhoto} />
              </label>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                {uploadingPhoto ? 'Uploading…' : 'Tap to upload (JPG, PNG, HEIC)'}
              </p>
              {photoError && <p className="text-xs" style={{ color: '#EF4444' }}>{photoError}</p>}
            </div>
          </CollapsibleSection>

          {/* Rep Profile */}
          <CollapsibleSection title="Rep Profile" storageKey="rep-profile" defaultOpen={true}>
            <Field label="Full Name">
              <FocusInput value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} placeholder="Eric Goldberg" />
            </Field>
            <Field label="Email">
              <div className="flex items-center h-12 px-4 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#6B7280' }}>
                {rep.email}
              </div>
            </Field>
            <Field label="Phone">
              <FocusInput value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} type="tel" placeholder="719-555-0100" />
            </Field>
            <Field label="Industries">
              <div className="flex flex-wrap gap-2">
                {(['windows_doors', 'siding', 'roofing', 'hvac', 'solar', 'gutters', 'other'] as const).map(id => {
                  const labels: Record<string, string> = { windows_doors: 'Windows', siding: 'Siding', roofing: 'Roofing', hvac: 'HVAC', solar: 'Solar', gutters: 'Gutters', other: 'Other' }
                  const selected = industries.includes(id)
                  return (
                    <button key={id} type="button"
                      onClick={() => setIndustries(prev => selected ? prev.filter(i => i !== id) : [...prev, id])}
                      className="px-3 h-9 rounded-xl text-sm font-medium"
                      style={{
                        background: selected ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.05)',
                        border: selected ? '1.5px solid rgba(29,78,216,0.5)' : '1px solid rgba(255,255,255,0.10)',
                        color: selected ? '#60A5FA' : '#9CA3AF',
                      }}>
                      {labels[id]}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="Territory">
              <FocusInput value={territory} onChange={setTerritory} placeholder="e.g. Colorado Springs, Denver Metro" />
            </Field>
            <SaveButton saving={savingProfile} saved={profileSaved} onClick={saveProfile} label="Save Profile" />
          </CollapsibleSection>

          {/* Proposal Defaults, Financing Options, Promotional Discounts — moved to Job Types */}
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              These settings have moved to Job Types. Configure your pricing in the Job Types section above.
            </p>
          </div>

          {/* API Usage */}
          <CollapsibleSection title="API Usage This Month" storageKey="api-usage">
            <div className="space-y-3">
              {Object.entries(usage.byService).map(([svc, data]) => (
                <div key={svc} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize" style={{ color: '#F9FAFB' }}>{svc.replace('_', ' ')}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{data.count} call{data.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-sm font-mono" style={{ color: '#9CA3AF' }}>${data.cost.toFixed(3)}</span>
                </div>
              ))}
              {usage.count === 0 && (
                <p className="text-sm" style={{ color: '#6B7280' }}>No API usage this month</p>
              )}
              {usage.count > 0 && (
                <div className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Total estimated</span>
                  <span className="text-sm font-bold font-mono" style={{ color: '#06B6D4' }}>${usage.totalCost.toFixed(3)}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Account */}
          <CollapsibleSection title="Account" storageKey="account">
            <div className="-m-5">
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{rep.full_name || profile.full_name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{rep.email}</p>
              </div>
              <button onClick={handleSignOut}
                className="w-full px-5 py-4 text-left text-sm font-medium transition-all active:opacity-70"
                style={{ color: '#EF4444' }}>
                Sign out
              </button>
            </div>
          </CollapsibleSection>
        </>
      )}

      {/* ASSISTANT TAB */}
      {activeTab === 'assistant' && (
        <>
          {!rep.vapi_assistant_id && assistantEnabled && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between gap-3"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#FCD34D' }}>Assistant not fully set up</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(252,211,77,0.6)' }}>Your AI assistant hasn&apos;t been created yet.</p>
              </div>
              <button
                onClick={() => fetch('/api/vapi/create-assistant', { method: 'POST' }).catch(() => {})}
                className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                Complete setup
              </button>
            </div>
          )}
          {/* Section 1 — Status */}
          <div className="rounded-2xl mb-4 overflow-hidden"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>AI Assistant</p>
                <p className="text-xs mt-0.5" style={{ color: assistantEnabled ? '#10B981' : '#6B7280' }}>
                  {assistantEnabled ? 'Active' : 'Disabled'}
                </p>
              </div>
              <Toggle on={assistantEnabled} onToggle={() => setAssistantEnabled(v => !v)} />
            </div>
          </div>

          {/* External Quoting Software */}
          <div className="rounded-2xl mb-4 overflow-hidden"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>External Quoting Software</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>I use separate quoting software. I&apos;ll enter all prices and discount amounts directly.</p>
              </div>
              <Toggle on={usesExternalQuoting} onToggle={() => setUsesExternalQuoting(v => !v)} />
            </div>
          </div>

          <div style={{ opacity: assistantEnabled ? 1 : 0.4, pointerEvents: assistantEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
            {/* Section 2 — Identity */}
            <CollapsibleSection title="Identity" storageKey="assistant-identity" defaultOpen={true}>
              <Field label="Assistant Name">
                <FocusInput value={assistantName} onChange={v => setAssistantName(v.slice(0, 20))} placeholder="Alex" />
              </Field>

              <Field label="Voice">
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
                      {selectedVoice
                        ? ([...VOICE_OPTIONS.female, ...VOICE_OPTIONS.male].find(v => v.voice_id === selectedVoice)?.name ?? 'Custom voice')
                        : 'No voice selected'}
                    </p>
                    {selectedVoice && (
                      <button
                        onClick={() => previewVoice(selectedVoice)}
                        className="text-xs mt-0.5"
                        style={{ color: previewingVoice === selectedVoice ? '#06B6D4' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {previewingVoice === selectedVoice ? '▶ Playing…' : '▶ Preview'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowVoicePicker(v => !v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(29,78,216,0.15)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.3)' }}
                  >
                    {showVoicePicker ? 'Close' : 'Change Voice'}
                  </button>
                </div>

                {showVoicePicker && (
                  <div className="mt-2 rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex gap-1 p-2">
                      {(['female', 'male'] as const).map(tab => (
                        <button key={tab} onClick={() => setVoiceTab(tab)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                          style={{
                            background: voiceTab === tab ? 'rgba(29,78,216,0.2)' : 'transparent',
                            color: voiceTab === tab ? '#60A5FA' : '#6B7280',
                            border: voiceTab === tab ? '1px solid rgba(29,78,216,0.3)' : '1px solid transparent',
                          }}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="px-2 pb-2 space-y-1.5">
                      {VOICE_OPTIONS[voiceTab].map(v => (
                        <div key={v.voice_id}
                          onClick={() => { setSelectedVoice(v.voice_id); setShowVoicePicker(false) }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer"
                          style={{
                            background: selectedVoice === v.voice_id ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)',
                            border: selectedVoice === v.voice_id ? '1px solid #06B6D4' : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{v.name}</span>
                          <button
                            onClick={e => { e.stopPropagation(); previewVoice(v.voice_id) }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{
                              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                              color: previewingVoice === v.voice_id ? '#06B6D4' : 'rgba(255,255,255,0.6)',
                            }}
                          >
                            {previewingVoice === v.voice_id ? '▶ Playing…' : '▶ Preview'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Field>
            </CollapsibleSection>

            {/* Section 3 — Phone */}
            <CollapsibleSection title="Phone" storageKey="assistant-phone" defaultOpen={true}>
              {initConfig.business_number ? (
                <div>
                  <div className="flex items-center justify-between p-3 rounded-xl mb-3"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{initConfig.business_number}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#10B981' }}>Business number · Active</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>
                      Active
                    </span>
                  </div>
                  <button
                    onClick={() => setAsPhoneType('business')}
                    className="text-xs" style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Change number
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: '#6B7280' }}>How should your assistant handle calls?</p>
                  {[
                    { id: 'business', label: 'Get a business number', sub: 'Dedicated Clozr number. Calls forward to your cell.' },
                    { id: 'cell',     label: 'Use my cell number',    sub: 'Assistant activates when you\'re in DND mode.' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setAsPhoneType(opt.id)}
                      className="w-full text-left p-3 rounded-xl"
                      style={{
                        background: asPhoneType === opt.id ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.03)',
                        border: asPhoneType === opt.id ? '1px solid #06B6D4' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{opt.sub}</p>
                    </button>
                  ))}

                  {asPhoneType === 'business' && (
                    <div>
                      <p className="text-xs mb-2 font-medium" style={{ color: '#9CA3AF' }}>Enter your area code</p>
                      <div className="flex gap-2">
                        <input
                          value={areaCode}
                          onChange={e => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder="719"
                          type="tel"
                          style={{ ...inputStyle, width: 80, height: 40, fontSize: 14 }}
                        />
                        <button
                          onClick={searchNumbers}
                          disabled={areaCode.length !== 3 || searchingNumbers}
                          className="px-4 h-10 rounded-xl text-sm font-semibold"
                          style={{
                            background: areaCode.length === 3 ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(29,78,216,0.3)',
                            color: areaCode.length === 3 ? '#60A5FA' : '#4B5563',
                          }}
                        >
                          {searchingNumbers ? 'Searching…' : 'Search'}
                        </button>
                      </div>
                      {availableNumbers.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {availableNumbers.map(n => (
                            <button key={n.phoneNumber} onClick={() => setSelectedNumber(n.phoneNumber)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg"
                              style={{
                                background: selectedNumber === n.phoneNumber ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)',
                                border: selectedNumber === n.phoneNumber ? '1px solid #06B6D4' : '1px solid rgba(255,255,255,0.06)',
                              }}
                            >
                              <span className="text-sm" style={{ color: '#F9FAFB' }}>{n.friendlyName}</span>
                              <span className="text-xs" style={{ color: selectedNumber === n.phoneNumber ? '#06B6D4' : '#6B7280' }}>
                                {selectedNumber === n.phoneNumber ? 'Selected ✓' : 'Select'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>

            {/* Section 4 — Capabilities */}
            <CollapsibleSection title="Capabilities" storageKey="assistant-capabilities" defaultOpen={true}>
              <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>What can your assistant do?</p>
              <div className="space-y-2">
                {CAPABILITIES.map(cap => (
                  <div key={cap.id}>
                    <button
                      onClick={() => toggleCap(cap.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                      style={{
                        background: capabilities.includes(cap.id) ? 'rgba(29,78,216,0.1)' : 'rgba(255,255,255,0.03)',
                        border: capabilities.includes(cap.id) ? '1px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{cap.icon}</span>
                      <span className="flex-1 text-sm font-medium" style={{ color: '#F9FAFB' }}>{cap.label}</span>
                      {capabilities.includes(cap.id) && (
                        <span style={{ color: '#06B6D4', fontSize: 14 }}>✓</span>
                      )}
                    </button>
                    {cap.id === 'qualify' && capabilities.includes('qualify') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginTop: 6 }}
                      >
                        <textarea
                          value={qualifyCriteria}
                          onChange={e => setQualifyCriteria(e.target.value)}
                          placeholder="e.g. Homeowner, project over $5,000, within my territory"
                          rows={3}
                          style={{
                            ...inputStyle, height: 'auto', padding: '10px 14px',
                            resize: 'none', lineHeight: 1.5, fontSize: 13,
                          } as React.CSSProperties}
                        />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Section 5 — DND */}
            <CollapsibleSection title="Do Not Disturb" storageKey="assistant-dnd">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Enable DND now</p>
                  {dndActive && (
                    <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: '#10B981' }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                      DND Active — calls go to assistant
                    </p>
                  )}
                </div>
                <Toggle on={dndActive} onToggle={() => setDndActive(v => !v)} />
              </div>
              <div className="flex items-center justify-between py-1 mt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>During appointments</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Auto-activates when a calendar event is active</p>
                </div>
                <Toggle on={dndDuringAppts} onToggle={() => setDndDuringAppts(v => !v)} />
              </div>
            </CollapsibleSection>

            {/* Meeting Mode */}
            <CollapsibleSection title="Meeting Mode" storageKey="meeting-mode">
              <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>
                Record appointments and get AI analysis, coach debrief, and action items.
              </p>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Disclosure reminder</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Show privacy disclosure before each recording</p>
                </div>
                <Toggle on={disclosureReminder} onToggle={() => setDisclosureReminder(v => !v)} />
              </div>
            </CollapsibleSection>
          </div>

          {/* Save */}
          <div className="mt-2">
            <SaveButton saving={savingAssistant} saved={assistantSaved} onClick={saveAssistant} label="Save Assistant Settings" />
          </div>

          {/* Personal Contacts */}
          <div className="rounded-2xl overflow-hidden mb-4"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>Personal Contacts</h2>
                <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>
                  {assistantName} can call these people on your command
                </p>
              </div>
              <button
                onClick={() => { setAddingContact(true); setContactDraft({ name: '', relationship: '', phone: '', email: '', notes: '' }) }}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.3)', color: '#60A5FA', fontSize: '18px', lineHeight: 1 }}>
                +
              </button>
            </div>

            <div className="px-4 py-3">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>No contacts yet</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>Add people {assistantName} can call for you</p>
                  </div>
                  <button
                    onClick={() => { setAddingContact(true); setContactDraft({ name: '', relationship: '', phone: '', email: '', notes: '' }) }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                    style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.3)', color: '#60A5FA' }}>
                    + Add Contact
                  </button>
                </div>
              ) : (
                <div>
                  {contacts.map(c => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px' }}>
                      {/* Initials circle */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', color: '#fff', fontSize: '14px' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Name + relationship */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#F9FAFB' }}>{c.name}</p>
                        {c.relationship && (
                          <p className="text-xs italic" style={{ color: '#9CA3AF' }}>{c.relationship}</p>
                        )}
                      </div>
                      {/* Phone */}
                      {c.phone && (
                        <p className="text-[13px] flex-shrink-0 hidden sm:block" style={{ color: '#6B7280' }}>{c.phone}</p>
                      )}
                      {/* Action icons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {confirmDeleteId === c.id ? (
                          <>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg text-xs font-medium"
                              style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                              No
                            </button>
                            <button onClick={() => deleteContact(c.id)} disabled={deletingContact === c.id}
                              className="px-2 py-1 rounded-lg text-xs font-semibold"
                              style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                              {deletingContact === c.id ? '…' : 'Delete?'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openEditContact(c)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                              title="Edit">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button onClick={() => setConfirmDeleteId(c.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                              title="Delete">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* COACH TAB */}
      {activeTab === 'coach' && (
        <>
          <CollapsibleSection title="Default Coach" storageKey="default-coach" defaultOpen={true}>
            <p className="text-xs -mt-1 mb-1" style={{ color: '#6B7280' }}>
              Your active coach when you open the Coach tab.
            </p>
            <div className="space-y-2">
              {PERSONAS.map((persona) => {
                const isActive = persona.id === activePersonaId
                return (
                  <button
                    key={persona.id}
                    onClick={() => { if (!isActive) setPendingPersonaId(persona.id) }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      background: isActive ? 'rgba(29,78,216,0.12)' : 'rgba(255,255,255,0.03)',
                      border: isActive ? '1.5px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <PersonaPhoto personaId={persona.id} color={persona.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{persona.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                          {persona.tagline}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>
                        {persona.welcomeMessage('you').slice(0, 60)}…
                      </p>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#1D4ED8' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Conversation History" storageKey="conversation-history">
            <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>
              Clear chat history for a specific coach. This also clears their memory of you.
            </p>
            <div className="space-y-2">
              {PERSONAS.map((persona) => (
                <div key={persona.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '18px' }}>{persona.avatar}</span>
                    <span className="text-sm font-medium" style={{ color: '#D1D5DB' }}>{persona.name}</span>
                  </div>
                  <button
                    onClick={() => clearPersonaHistory(persona.id)}
                    disabled={clearingPersona === persona.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#F87171',
                    }}
                  >
                    {clearingPersona === persona.id ? 'Clearing…' : 'Clear'}
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </>
      )}

      {/* CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <>
          {/* Google Calendar */}
          <CollapsibleSection title="Google Calendar" storageKey="google-calendar" defaultOpen={true}>
            {connections.some(c => c.provider === 'google') ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Connected</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>Google Calendar</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const conn = connections.find(c => c.provider === 'google')
                    if (conn) removeConnection(conn.id)
                  }}
                  disabled={removingConn !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                  Sync your Google Calendar to see appointments in Clozr.
                </p>
                <a
                  href="/api/auth/google/calendar"
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(29,78,216,0.2)', border: '1px solid rgba(29,78,216,0.3)', color: '#60A5FA' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Connect Google Calendar
                </a>
              </div>
            )}
          </CollapsibleSection>

          {/* iCal URL */}
          <CollapsibleSection title="iCal / CalDAV URL" storageKey="ical-url">
            <p className="text-xs -mt-1" style={{ color: '#6B7280' }}>
              Add an iCal feed URL (Apple Calendar, Outlook, or any .ics feed).
            </p>
            <div className="space-y-2">
              {connections.filter(c => c.provider === 'ical').map((conn) => (
                <div key={conn.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#9CA3AF' }}>
                      {conn.ical_url ?? 'iCal feed'}
                    </p>
                    {conn.last_synced_at && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#4B5563' }}>
                        Synced {new Date(conn.last_synced_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeConnection(conn.id)}
                    disabled={removingConn === conn.id}
                    style={{ color: '#4B5563', flexShrink: 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <Field label="iCal Feed URL">
              <FocusInput
                value={icalUrl}
                onChange={setIcalUrl}
                placeholder="https://calendar.google.com/calendar/ical/..."
              />
            </Field>
            {icalError && (
              <p className="text-xs" style={{ color: '#F87171' }}>{icalError}</p>
            )}
            <button
              onClick={addIcalUrl}
              disabled={addingIcal || !icalUrl.trim()}
              className="w-full h-11 rounded-xl text-sm font-semibold"
              style={{
                background: 'rgba(29,78,216,0.2)',
                border: '1px solid rgba(29,78,216,0.3)',
                color: '#60A5FA',
                opacity: !icalUrl.trim() ? 0.5 : 1,
              }}
            >
              {addingIcal ? 'Adding…' : 'Add iCal URL'}
            </button>
          </CollapsibleSection>

          {/* Microsoft Outlook */}
          <CollapsibleSection title="Microsoft Outlook" storageKey="outlook">
            {connections.some(c => c.provider === 'microsoft') ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(29,78,216,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#D1D5DB' }}>Outlook Connected</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Microsoft calendar is syncing</p>
                </div>
                <button
                  onClick={() => {
                    const conn = connections.find(c => c.provider === 'microsoft')
                    if (conn) removeConnection(conn.id)
                  }}
                  disabled={!!removingConn}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                  Connect your Outlook calendar to see upcoming appointments in Clozr.
                </p>
                <a href="/api/auth/microsoft/calendar"
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.3)', color: '#60A5FA' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Connect Outlook
                </a>
              </div>
            )}
          </CollapsibleSection>

          {/* Apple iCloud */}
          <CollapsibleSection title="Apple iCloud Calendar" storageKey="icloud-calendar">
            {connections.some(c => c.provider === 'caldav_icloud') ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(29,78,216,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#D1D5DB' }}>iCloud Connected</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Apple Calendar is syncing</p>
                </div>
                <button
                  onClick={() => {
                    const conn = connections.find(c => c.provider === 'caldav_icloud')
                    if (conn) removeConnection(conn.id)
                  }}
                  disabled={!!removingConn}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                  Connect with an iCloud app-specific password. Generate one at appleid.apple.com under Sign-In &amp; Security.
                </p>
                <button
                  onClick={() => { setShowICloudModal(true); setICloudError(null) }}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#D1D5DB' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  </svg>
                  Connect iCloud Calendar
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* Sync */}
          {connections.length > 0 && (
            <button
              onClick={syncCalendars}
              disabled={syncing}
              className="w-full h-11 rounded-xl text-sm font-semibold mb-4"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9CA3AF',
              }}
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          )}
        </>
      )}

      {/* INTEGRATIONS TAB */}
      {activeTab === 'integrations' && (
        <>
          {/* Email Lead Capture */}
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: 'rgba(16,185,129,0.1)' }}>
                📧
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>Email Lead Capture</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>
                    Active
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                  Forward appointment confirmation emails to automatically create leads in Clozr.
                </p>
                <p className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Forward appointment emails to:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg px-3 py-2 font-mono text-sm"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#60A5FA' }}>
                    qgnprchi@mailparser.io
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('qgnprchi@mailparser.io')
                      setCopiedAgentmail(true)
                      setTimeout(() => setCopiedAgentmail(false), 2000)
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ background: copiedAgentmail ? 'rgba(16,185,129,0.2)' : 'rgba(29,78,216,0.15)', color: copiedAgentmail ? '#34D399' : '#60A5FA', border: `1px solid ${copiedAgentmail ? 'rgba(16,185,129,0.3)' : 'rgba(29,78,216,0.2)'}`, transition: 'all 0.15s' }}>
                    {copiedAgentmail ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {(() => {
            const industryKey = industry ?? rep.industry ?? null
            const platforms = industryKey ? getPlatformsForIndustry(industryKey) : Object.values(PLATFORM_REGISTRY)
            const activePlatforms = platforms.filter(p => p.status === 'active')
            const comingSoonPlatforms = platforms.filter(p => p.status === 'coming_soon')
            return (
              <>
                {!industryKey && (
                  <div className="rounded-xl px-4 py-3 mb-4 text-sm"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#FCD34D' }}>
                    Set your industry in General settings to see relevant integrations.
                  </div>
                )}

                {activePlatforms.length > 0 && (
                  <CollapsibleSection title="Active Integrations" storageKey="active-integrations" defaultOpen={true}>
                    <div className="space-y-3">
                      {activePlatforms.map(platform => (
                        <div key={platform.key} className="rounded-xl p-4"
                          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                              style={{ background: 'rgba(16,185,129,0.1)' }}>
                              {platform.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{platform.name}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>
                                  Active
                                </span>
                              </div>
                              <p className="text-xs mb-2" style={{ color: '#6B7280' }}>{platform.description}</p>
                              {platform.instructions && (
                                <div className="rounded-lg px-3 py-2"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Setup</p>
                                  <p className="text-xs mt-0.5" style={{ color: '#D1D5DB' }}>{platform.instructions}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {comingSoonPlatforms.length > 0 && (
                  <CollapsibleSection title="Coming Soon" storageKey="coming-soon-integrations" defaultOpen={true}>
                    <div className="space-y-2">
                      {comingSoonPlatforms.map(platform => (
                        <div key={platform.key} className="flex items-center gap-3 p-4 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.7 }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                            style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {platform.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>{platform.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#4B5563' }}>{platform.description}</p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full flex-shrink-0 font-medium"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Soon
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {platforms.length === 0 && (
                  <div className="rounded-2xl p-8 text-center"
                    style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm" style={{ color: '#6B7280' }}>No integrations available for your industry yet.</p>
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}

      {activeTab === 'jobtypes' && <JobTypesTab />}

      {/* Add / Edit Contact Modal */}
      {(addingContact || editingContact) && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setAddingContact(false); setEditingContact(null) } }}>
          <div className="w-full max-w-md rounded-t-3xl pb-8"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-bold" style={{ color: '#F9FAFB' }}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={() => { setAddingContact(false); setEditingContact(null) }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                ✕
              </button>
            </div>
            <div className="px-6 pt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Name *</label>
                <input
                  type="text"
                  value={contactDraft.name ?? ''}
                  onChange={e => setContactDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="Full name"
                  autoFocus
                  style={{ ...inputStyle, height: '48px', fontSize: '15px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Relationship</label>
                <input
                  type="text"
                  value={contactDraft.relationship ?? ''}
                  onChange={e => setContactDraft(d => ({ ...d, relationship: e.target.value }))}
                  placeholder="wife, manager, brother, assistant…"
                  style={{ ...inputStyle, height: '48px', fontSize: '15px', fontStyle: contactDraft.relationship ? 'italic' : 'normal' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Phone *</label>
                <input
                  type="tel"
                  value={contactDraft.phone ?? ''}
                  onChange={e => setContactDraft(d => ({ ...d, phone: formatPhone(e.target.value) }))}
                  placeholder="(555) 000-0000"
                  style={{ ...inputStyle, height: '48px', fontSize: '15px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Email (optional)</label>
                <input
                  type="email"
                  value={contactDraft.email ?? ''}
                  onChange={e => setContactDraft(d => ({ ...d, email: e.target.value }))}
                  placeholder="email@example.com"
                  style={{ ...inputStyle, height: '48px', fontSize: '15px' }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setAddingContact(false); setEditingContact(null) }}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
                <button
                  onClick={editingContact ? updateContact : addContact}
                  disabled={savingContact || !contactDraft.name?.trim() || !contactDraft.phone?.trim()}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold"
                  style={{
                    background: (contactDraft.name?.trim() && contactDraft.phone?.trim()) ? 'rgba(29,78,216,0.3)' : 'rgba(255,255,255,0.04)',
                    color: (contactDraft.name?.trim() && contactDraft.phone?.trim()) ? '#60A5FA' : '#4B5563',
                    border: (contactDraft.name?.trim() && contactDraft.phone?.trim()) ? '1px solid rgba(29,78,216,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  {savingContact ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coach Switch Transition Modal */}
      {pendingPersonaId && (() => {
        const persona = PERSONAS.find(p => p.id === pendingPersonaId)
        if (!persona) return null
        const repFirstName = rep.full_name?.split(' ')[0] ?? 'there'
        return (
          <div className="fixed inset-0 z-[200] flex items-end justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setPendingPersonaId(null) }}>
            <div className="w-full max-w-md rounded-t-3xl pb-8 overflow-hidden"
              style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Coach header */}
              <div className="flex items-center gap-4 px-6 pt-6 pb-5"
                style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <PersonaPhoto personaId={persona.id} color={persona.color} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7280' }}>Switching to</p>
                  <p className="text-xl font-bold" style={{ color: '#F9FAFB' }}>{persona.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{persona.tagline}</p>
                </div>
              </div>

              <div className="px-6 pt-5 pb-1 space-y-4">
                {/* Memory carry-over message */}
                <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="text-lg flex-shrink-0 mt-0.5">🧠</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#34D399' }}>Memory carries over</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(52,211,153,0.7)' }}>
                      {persona.name} already knows your deals, customers, and selling style from previous sessions.
                    </p>
                  </div>
                </div>

                {/* First message preview */}
                <div className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>First message</p>
                  <p className="text-sm italic" style={{ color: '#D1D5DB' }}>
                    &ldquo;{persona.welcomeMessage(repFirstName)}&rdquo;
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setPendingPersonaId(null)}
                    className="flex-1 h-12 rounded-2xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Cancel
                  </button>
                  <button onClick={() => savePersona(pendingPersonaId)} disabled={savingPersona}
                    className="flex-1 h-12 rounded-2xl text-sm font-bold"
                    style={{ background: 'rgba(29,78,216,0.25)', color: '#60A5FA', border: '1px solid rgba(29,78,216,0.4)' }}>
                    {savingPersona ? 'Switching…' : `Switch to ${persona.name}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Coach switch success toast */}
      {switchToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399', backdropFilter: 'blur(8px)' }}>
          {switchToast}
        </div>
      )}

      {/* iCloud Connect Modal */}
      {showICloudModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowICloudModal(false) }}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-8"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: '#F9FAFB' }}>Connect iCloud Calendar</h3>
              <button onClick={() => setShowICloudModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                ✕
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Use your Apple ID email and an app-specific password (not your Apple ID password).
              Generate one at <span style={{ color: '#60A5FA' }}>appleid.apple.com</span> → Sign-In &amp; Security → App-Specific Passwords.
            </p>
            <div className="space-y-3 mb-4">
              <input
                type="email"
                placeholder="Apple ID email"
                value={iCloudEmail}
                onChange={e => setICloudEmail(e.target.value)}
                style={{ ...inputStyle, height: '48px', fontSize: '15px' }}
              />
              <input
                type="password"
                placeholder="App-specific password"
                value={iCloudPassword}
                onChange={e => setICloudPassword(e.target.value)}
                style={{ ...inputStyle, height: '48px', fontSize: '15px' }}
              />
            </div>
            {iCloudError && (
              <div className="rounded-xl px-4 py-3 mb-4 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                {iCloudError}
              </div>
            )}
            <button
              onClick={connectICloud}
              disabled={connectingICloud || !iCloudEmail.trim() || !iCloudPassword.trim()}
              className="w-full h-12 rounded-2xl text-sm font-semibold"
              style={{
                background: connectingICloud ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
                color: '#fff',
                opacity: (!iCloudEmail.trim() || !iCloudPassword.trim()) ? 0.5 : 1,
              }}
            >
              {connectingICloud ? 'Connecting…' : 'Connect Calendar'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
