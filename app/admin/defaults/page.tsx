'use client'
import { useState, useEffect } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Financing option type
interface FinancingOpt { id: string; name: string; calc_type: 'factor' | 'months'; value: number; active: boolean; sort_order: number }
interface DiscountOpt { id: string; name: string; type: 'promotion' | 'bnsn' | 'cash'; percentage: number; active: boolean; sort_order: number }
interface EmailTemplate { id?: string; template_key: string; subject: string; body_html: string }

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <td className="px-2 py-2 cursor-grab" style={{ color: '#4B5563' }} {...attributes} {...listeners}>⠿</td>
      {children}
    </tr>
  )
}

const DEFAULT_FINANCING: FinancingOpt[] = [
  { id: 'cash', name: 'Cash / Credit Card', calc_type: 'factor', value: 0, active: true, sort_order: 0 },
  { id: '12mo', name: '12 Mo 0% No Payments', calc_type: 'months', value: 12, active: true, sort_order: 1 },
  { id: '18mo', name: '18 Mo 0% No Payments', calc_type: 'months', value: 18, active: true, sort_order: 2 },
  { id: '24mo', name: '24 Mo 0% No Payments', calc_type: 'months', value: 24, active: true, sort_order: 3 },
  { id: '6.99_10yr', name: '6.99% / 10yr', calc_type: 'factor', value: 0.01161, active: true, sort_order: 4 },
  { id: '6.99_12yr', name: '6.99% / 12yr', calc_type: 'factor', value: 0.00978, active: true, sort_order: 5 },
  { id: '6.99_15yr', name: '6.99% / 15yr', calc_type: 'factor', value: 0.00896, active: true, sort_order: 6 },
  { id: '9.99_10yr', name: '9.99% / 10yr', calc_type: 'factor', value: 0.01322, active: true, sort_order: 7 },
]

const DEFAULT_DISCOUNTS: DiscountOpt[] = [
  { id: 'promo_20', name: '20% Package Discount', type: 'promotion', percentage: 20, active: true, sort_order: 0 },
  { id: 'promo_25', name: '25% Package Discount', type: 'promotion', percentage: 25, active: true, sort_order: 1 },
  { id: 'bnsn_10', name: 'Buy Now Save Now +10%', type: 'bnsn', percentage: 10, active: true, sort_order: 2 },
  { id: 'bnsn_5', name: 'Buy Now Save Now +5%', type: 'bnsn', percentage: 5, active: true, sort_order: 3 },
  { id: 'bnsn_30', name: 'Full 30% Combined', type: 'bnsn', percentage: 30, active: true, sort_order: 4 },
  { id: 'cash_6', name: 'Cash Incentive', type: 'cash', percentage: 6, active: true, sort_order: 5 },
]

export default function AdminDefaultsPage() {
  const [financing, setFinancing] = useState<FinancingOpt[]>([])
  const [discounts, setDiscounts] = useState<DiscountOpt[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({ financing: true, discounts: false, emails: false })
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [editingFin, setEditingFin] = useState<string | null>(null)
  const [editingDisc, setEditingDisc] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/defaults')
      const data = await res.json()
      setFinancing(data.financing?.length ? data.financing : DEFAULT_FINANCING)
      setDiscounts(data.discounts?.length ? data.discounts : DEFAULT_DISCOUNTS)
      setTemplates(data.templates ?? [])
    } finally {
      setLoading(false)
    }
  }

  const saveSection = async (section: string, data: any) => {
    setSaving(p => ({ ...p, [section]: true }))
    await fetch('/api/admin/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, data }),
    })
    setSaving(p => ({ ...p, [section]: false }))
    setSaved(p => ({ ...p, [section]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [section]: false })), 2000)
  }

  const handleFinDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFinancing(items => {
        const oldIdx = items.findIndex(i => i.id === active.id)
        const newIdx = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIdx, newIdx).map((item, i) => ({ ...item, sort_order: i }))
      })
    }
  }

  const handleDiscDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setDiscounts(items => {
        const oldIdx = items.findIndex(i => i.id === active.id)
        const newIdx = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIdx, newIdx).map((item, i) => ({ ...item, sort_order: i }))
      })
    }
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', color: '#F9FAFB', padding: '4px 8px', fontSize: '12px', outline: 'none', width: '100%' }
  const sectionHeader = (key: 'financing' | 'discounts' | 'emails', label: string) => (
    <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-5 py-4">
      <h2 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>{label}</h2>
      <span style={{ color: '#6B7280', fontSize: '12px' }}>{expanded[key] ? '▲' : '▼'}</span>
    </button>
  )

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: '#6B7280' }}>Loading…</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#F9FAFB' }}>Defaults</h1>

      {/* Financing Options */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        {sectionHeader('financing', 'Financing Options')}
        {expanded.financing && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleFinDragEnd}>
              <SortableContext items={financing.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="px-2 py-2 w-6"></th>
                      {['Name', 'Type', 'Value', 'Active', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left" style={{ color: '#6B7280' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {financing.map(opt => (
                      <SortableRow key={opt.id} id={opt.id}>
                        <td className="px-3 py-2">
                          {editingFin === opt.id ? (
                            <input style={inputStyle} value={opt.name} onChange={e => setFinancing(f => f.map(o => o.id === opt.id ? { ...o, name: e.target.value } : o))} />
                          ) : <span style={{ color: '#D1D5DB' }}>{opt.name}</span>}
                        </td>
                        <td className="px-3 py-2" style={{ color: '#9CA3AF' }}>{opt.calc_type}</td>
                        <td className="px-3 py-2">
                          {editingFin === opt.id ? (
                            <input style={{ ...inputStyle, width: '80px' }} type="number" value={opt.value} onChange={e => setFinancing(f => f.map(o => o.id === opt.id ? { ...o, value: parseFloat(e.target.value) || 0 } : o))} />
                          ) : <span style={{ color: '#9CA3AF' }}>{opt.calc_type === 'factor' ? opt.value.toFixed(5) : opt.value}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div onClick={() => setFinancing(f => f.map(o => o.id === opt.id ? { ...o, active: !o.active } : o))} className="cursor-pointer inline-flex" style={{ width: '30px', height: '18px', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '9px', background: opt.active ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
                            <div style={{ position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', left: opt.active ? '14px' : '2px', transition: 'left 0.15s' }} />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => setEditingFin(editingFin === opt.id ? null : opt.id)} className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA' }}>{editingFin === opt.id ? 'Done' : 'Edit'}</button>
                            <button onClick={() => setFinancing(f => f.filter(o => o.id !== opt.id))} className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>Del</button>
                          </div>
                        </td>
                      </SortableRow>
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setFinancing(f => [...f, { id: `custom_${Date.now()}`, name: 'New Option', calc_type: 'factor', value: 0.01, active: true, sort_order: f.length }])}
                className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA', border: '1px dashed rgba(29,78,216,0.3)' }}>+ Add Financing Option</button>
              <button onClick={() => saveSection('financing', financing)} disabled={saving.financing}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: saved.financing ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.15)', color: saved.financing ? '#34D399' : '#60A5FA' }}>
                {saving.financing ? 'Saving…' : saved.financing ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discount Options */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        {sectionHeader('discounts', 'Discount Options')}
        {expanded.discounts && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDiscDragEnd}>
              <SortableContext items={discounts.map(d => d.id)} strategy={verticalListSortingStrategy}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="px-2 py-2 w-6"></th>
                      {['Name', 'Type', '%', 'Active', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left" style={{ color: '#6B7280' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map(opt => (
                      <SortableRow key={opt.id} id={opt.id}>
                        <td className="px-3 py-2">
                          {editingDisc === opt.id ? (
                            <input style={inputStyle} value={opt.name} onChange={e => setDiscounts(d => d.map(o => o.id === opt.id ? { ...o, name: e.target.value } : o))} />
                          ) : <span style={{ color: '#D1D5DB' }}>{opt.name}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: opt.type === 'promotion' ? 'rgba(16,185,129,0.12)' : opt.type === 'bnsn' ? 'rgba(245,158,11,0.12)' : 'rgba(29,78,216,0.12)', color: opt.type === 'promotion' ? '#34D399' : opt.type === 'bnsn' ? '#FCD34D' : '#60A5FA' }}>{opt.type}</span>
                        </td>
                        <td className="px-3 py-2">
                          {editingDisc === opt.id ? (
                            <input style={{ ...inputStyle, width: '60px' }} type="number" value={opt.percentage} onChange={e => setDiscounts(d => d.map(o => o.id === opt.id ? { ...o, percentage: parseFloat(e.target.value) || 0 } : o))} />
                          ) : <span style={{ color: '#9CA3AF' }}>{opt.percentage}%</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div onClick={() => setDiscounts(d => d.map(o => o.id === opt.id ? { ...o, active: !o.active } : o))} className="cursor-pointer inline-flex" style={{ width: '30px', height: '18px', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '9px', background: opt.active ? '#1D4ED8' : 'rgba(255,255,255,0.12)' }} />
                            <div style={{ position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', left: opt.active ? '14px' : '2px', transition: 'left 0.15s' }} />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => setEditingDisc(editingDisc === opt.id ? null : opt.id)} className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA' }}>{editingDisc === opt.id ? 'Done' : 'Edit'}</button>
                            <button onClick={() => setDiscounts(d => d.filter(o => o.id !== opt.id))} className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>Del</button>
                          </div>
                        </td>
                      </SortableRow>
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setDiscounts(d => [...d, { id: `custom_${Date.now()}`, name: 'New Discount', type: 'promotion', percentage: 10, active: true, sort_order: d.length }])}
                className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(29,78,216,0.1)', color: '#60A5FA', border: '1px dashed rgba(29,78,216,0.3)' }}>+ Add Discount Option</button>
              <button onClick={() => saveSection('discounts', discounts)} disabled={saving.discounts}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: saved.discounts ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.15)', color: saved.discounts ? '#34D399' : '#60A5FA' }}>
                {saving.discounts ? 'Saving…' : saved.discounts ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Templates */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        {sectionHeader('emails', 'Email Templates')}
        {expanded.emails && (
          <div className="p-5 space-y-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {(['customer_proposal', 'coach_checkin', 'welcome_rep'] as const).map(key => {
              const tmpl = templates.find(t => t.template_key === key) ?? { template_key: key, subject: '', body_html: '' }
              const label = key === 'customer_proposal' ? 'Customer Proposal Email' : key === 'coach_checkin' ? 'Coach Check-In Email' : 'New Rep Welcome Email'
              return (
                <div key={key}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>{label}</h3>
                  <div className="mb-2">
                    <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>Subject</label>
                    <input
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', color: '#F9FAFB', padding: '6px 10px', fontSize: '13px', outline: 'none', width: '100%' }}
                      value={tmpl.subject}
                      onChange={e => setTemplates(ts => ts.some(t => t.template_key === key) ? ts.map(t => t.template_key === key ? { ...t, subject: e.target.value } : t) : [...ts, { ...tmpl, subject: e.target.value }])}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>Body HTML</label>
                    <textarea
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', color: '#F9FAFB', padding: '8px 10px', fontSize: '12px', fontFamily: 'monospace', outline: 'none', width: '100%', minHeight: '200px', resize: 'vertical' }}
                      value={tmpl.body_html}
                      onChange={e => setTemplates(ts => ts.some(t => t.template_key === key) ? ts.map(t => t.template_key === key ? { ...t, body_html: e.target.value } : t) : [...ts, { ...tmpl, body_html: e.target.value }])}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { const win = window.open('about:blank', '_blank'); if (win) { win.document.write(tmpl.body_html); win.document.close() } }} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(15,118,110,0.1)', color: '#06B6D4' }}>Preview</button>
                    <button onClick={() => saveSection(`email_${key}`, tmpl)} disabled={saving[`email_${key}`]}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: saved[`email_${key}`] ? 'rgba(16,185,129,0.15)' : 'rgba(29,78,216,0.15)', color: saved[`email_${key}`] ? '#34D399' : '#60A5FA' }}>
                      {saving[`email_${key}`] ? 'Saving…' : saved[`email_${key}`] ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
