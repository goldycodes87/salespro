'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface CalEvent {
  id: string
  title: string
  start_at: string
  end_at: string
  all_day: boolean
  location?: string | null
}

interface CalConnection {
  id: string
  provider: string
  ical_url?: string | null
  last_synced_at?: string | null
  connected_at?: string | null
}

interface CalendarPageProps {
  events: CalEvent[]
  connections: CalConnection[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatTime(iso: string, allDay: boolean) {
  if (allDay) return 'All day'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function CalendarPage({ events, connections }: CalendarPageProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [syncing, setSyncing] = useState(false)

  const eventsByDay = useCallback(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const ev of events) {
      const d = new Date(ev.start_at)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = String(d.getDate())
        if (!map[key]) map[key] = []
        map[key].push(ev)
      }
    }
    return map
  }, [events, year, month])

  const evMap = eventsByDay()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const syncCalendars = async () => {
    setSyncing(true)
    try {
      await fetch('/api/calendar/sync', { method: 'POST' })
      window.location.reload()
    } catch {
      setSyncing(false)
    }
  }

  const selectedEvents = selectedDay ? (evMap[String(selectedDay)] ?? []) : []

  const upcomingEvents = events
    .filter(ev => new Date(ev.start_at) >= new Date())
    .slice(0, 10)

  const hasConnections = connections.length > 0

  return (
    <div className="px-4 pt-6 pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB' }}>Calendar</h1>
        <div className="flex items-center gap-2">
          {hasConnections && (
            <button
              onClick={syncCalendars}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: 'rgba(29,78,216,0.15)',
                border: '1px solid rgba(29,78,216,0.3)',
                color: '#60A5FA',
              }}
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={syncing ? 'animate-spin' : ''}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <Link
            href="/settings?tab=calendar"
            className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9CA3AF',
            }}
          >
            Manage
          </Link>
        </div>
      </div>

      {!hasConnections ? (
        /* No calendars connected */
        <div
          className="rounded-2xl p-8 text-center mb-6"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(29,78,216,0.1)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2 className="text-base font-bold mb-2" style={{ color: '#F9FAFB' }}>No Calendar Connected</h2>
          <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
            Connect Google Calendar or add an iCal URL to see your schedule here.
          </p>
          <Link
            href="/settings?tab=calendar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #06B6D4)', color: '#fff' }}
          >
            Connect Calendar
          </Link>
        </div>
      ) : (
        <>
          {/* Monthly grid */}
          <div
            className="rounded-2xl overflow-hidden mb-4"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#9CA3AF' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#9CA3AF' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 px-3 pt-3 pb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase" style={{ color: '#4B5563' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday =
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear()
                const isSelected = day === selectedDay
                const dayEvents = evMap[String(day)] ?? []
                const hasEvents = dayEvents.length > 0

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className="flex flex-col items-center py-1.5 rounded-xl transition-all"
                    style={{
                      background: isSelected
                        ? 'rgba(29,78,216,0.25)'
                        : isToday
                        ? 'rgba(59,130,246,0.1)'
                        : 'transparent',
                    }}
                  >
                    <span
                      className="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full"
                      style={{
                        color: isToday ? '#3B82F6' : isSelected ? '#60A5FA' : '#D1D5DB',
                        fontWeight: isToday ? 700 : 500,
                        background: isToday && !isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                      }}
                    >
                      {day}
                    </span>
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((_, di) => (
                          <div
                            key={di}
                            className="w-1 h-1 rounded-full"
                            style={{ background: '#3B82F6' }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected day events */}
          <AnimatePresence>
            {selectedDay !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>
                      {MONTHS[month]} {selectedDay}
                    </h3>
                  </div>
                  <div className="p-4">
                    {selectedEvents.length === 0 ? (
                      <p className="text-sm text-center py-2" style={{ color: '#4B5563' }}>No events</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEvents.map((ev) => (
                          <div key={ev.id} className="flex items-start gap-3">
                            <div className="w-1 h-full min-h-[32px] rounded-full flex-shrink-0 mt-1" style={{ background: '#3B82F6' }} />
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{ev.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                                {formatTime(ev.start_at, ev.all_day)}
                                {ev.location && ` · ${ev.location}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upcoming events */}
          {upcomingEvents.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#9CA3AF' }}>Upcoming</h2>
              <div className="space-y-2">
                {upcomingEvents.map((ev) => {
                  const d = new Date(ev.start_at)
                  const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '3px solid #3B82F6' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>{ev.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                          {dayStr} · {formatTime(ev.start_at, ev.all_day)}
                          {ev.location && ` · ${ev.location}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
