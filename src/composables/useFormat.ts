// Formateo de fechas y duraciones para la UI (es-MX).

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** Fecha tipo `2026-07-21` (columna date, sin zona horaria). */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormatter.format(parsed)
}

/** Timestamp completo (timestamptz). */
export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : dateTimeFormatter.format(parsed)
}

export function formatMinutes(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0 min'
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

export function formatPercent(value: number | null): string {
  return `${Math.round(value ?? 0)}%`
}
