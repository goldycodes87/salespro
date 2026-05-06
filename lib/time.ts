// Mountain Time (America/Denver) timezone utilities

interface MTDateParts {
  year: number
  month: number
  day: number
  dow: number // 0=Sun, 1=Mon ... 6=Sat
}

function getMTDateParts(date: Date): MTDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? ''

  const dowMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }

  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    dow: dowMap[get('weekday')] ?? 0,
  }
}

// Returns the UTC Date object for midnight of a given calendar day in MT.
// Probes noon UTC on that day to detect whether MDT (-6h) or MST (-7h) is in effect.
function mtMidnightAsUTC(year: number, month: number, day: number): Date {
  const probe = new Date(Date.UTC(year, month - 1, day, 12))
  const mtHourAtNoon = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: '2-digit',
      hour12: false,
    }).format(probe),
    10,
  ) % 24
  const utcOffsetHours = 12 - mtHourAtNoon // 6 = MDT, 7 = MST
  return new Date(Date.UTC(year, month - 1, day, utcOffsetHours))
}

export function getMTStartOfDay(date: Date): Date {
  const { year, month, day } = getMTDateParts(date)
  return mtMidnightAsUTC(year, month, day)
}

export function getMTStartOfWeek(date: Date): Date {
  const { year, month, day, dow } = getMTDateParts(date)
  const daysBack = dow === 0 ? 6 : dow - 1 // days back to Monday
  const monday = new Date(Date.UTC(year, month - 1, day - daysBack, 12))
  const mp = getMTDateParts(monday)
  return mtMidnightAsUTC(mp.year, mp.month, mp.day)
}

export function getMTHour(date: Date): number {
  return (
    parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver',
        hour: '2-digit',
        hour12: false,
      }).format(date),
      10,
    ) % 24
  )
}

export function getMTDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(date)
}
