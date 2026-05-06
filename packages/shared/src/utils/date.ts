import { MONTHS_FR } from '../constants'

export function formatDate(date: string | Date, locale = 'fr-FR'): string {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date, locale = 'fr-FR'): string {
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPeriodLabel(
  start: string | Date,
  end: string | Date,
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY'
): string {
  const s = new Date(start)
  const e = new Date(end)

  if (type === 'DAILY') {
    return formatDate(s)
  }
  if (type === 'WEEKLY') {
    return `${formatDate(s)} – ${formatDate(e)}`
  }
  // MONTHLY
  return `${MONTHS_FR[s.getMonth()]} ${s.getFullYear()}`
}

export function getMonthLabel(month: number, year: number): string {
  return `${MONTHS_FR[month - 1]} ${year}`
}

export function getCurrentPeriod(type: 'DAILY' | 'WEEKLY' | 'MONTHLY'): {
  start: Date
  end: Date
} {
  const now = new Date()

  if (type === 'DAILY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  if (type === 'WEEKLY') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now.setDate(diff))
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  // MONTHLY
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function isOverdue(deadline: Date | string): boolean {
  return new Date(deadline) < new Date()
}

export function daysUntil(date: Date | string): number {
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
