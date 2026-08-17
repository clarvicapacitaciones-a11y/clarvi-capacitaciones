<script setup lang="ts">
// Calendario de lo que viene: una franja con las próximas fechas, de la más
// cercana a la más lejana.
//
// Es una agenda y no una cuadrícula de mes a propósito: con el volumen de
// sesiones que maneja la plataforma, una cuadrícula sería casi toda casillas
// vacías, mientras que así cada fecha trae su curso y su hora.
//
// De dónde sale cada fecha: si hay transmisión anunciada manda
// `live_scheduled_at` (trae hora); si no, la fecha de sesión de la
// capacitación, que es solo día.

import { computed } from 'vue'
import type { TrainingStatusRow } from '@/types/domain'

const props = withDefaults(
  defineProps<{
    rows: TrainingStatusRow[]
    /** Cuántas fechas se muestran como mucho. */
    limit?: number
  }>(),
  { limit: 6 },
)

const dayFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit' })
const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short' })
const timeFormatter = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat('es-MX', { weekday: 'long' })

interface CalendarEntry {
  id: string
  title: string
  date: Date
  /** Las fechas de sesión son solo día: no hay hora que mostrar. */
  hasTime: boolean
  isLive: boolean
}

/**
 * Fechas futuras, ordenadas. Lo que está al aire ahora entra primero aunque su
 * hora ya pasó: sigue siendo lo más próximo que hay.
 */
const entries = computed<CalendarEntry[]>(() => {
  const now = Date.now()
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const list: CalendarEntry[] = []

  for (const row of props.rows) {
    const isLive = row.live_status === 'en_vivo'
    const scheduled = row.live_scheduled_at
    const started = row.live_started_at

    if (isLive) {
      const at = started ?? scheduled
      if (at) {
        list.push({
          id: String(row.training_id),
          title: row.title ?? 'Transmisión',
          date: new Date(at),
          hasTime: true,
          isLive: true,
        })
      }
      continue
    }

    if (scheduled) {
      const date = new Date(scheduled)
      if (date.getTime() >= now) {
        list.push({
          id: String(row.training_id),
          title: row.title ?? 'Transmisión',
          date,
          hasTime: true,
          isLive: false,
        })
      }
      continue
    }

    if (row.session_date) {
      // Columna `date`, sin zona horaria: se ancla a mediodía local para que
      // no se corra un día al formatear.
      const date = new Date(`${row.session_date}T12:00:00`)
      if (date.getTime() >= startOfToday) {
        list.push({
          id: String(row.training_id),
          title: row.title ?? 'Capacitación',
          date,
          hasTime: false,
          isLive: false,
        })
      }
    }
  }

  return list
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1
      return a.date.getTime() - b.date.getTime()
    })
    .slice(0, props.limit)
})

/** Mes en tres letras y sin el punto que mete es-MX ("sept." → "sep"). */
function month(date: Date): string {
  return monthFormatter.format(date).replace('.', '').slice(0, 3)
}

function when(entry: CalendarEntry): string {
  if (entry.isLive) return 'Al aire ahora'
  const weekday = weekdayFormatter.format(entry.date)
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return entry.hasTime
    ? `${capitalized}, ${timeFormatter.format(entry.date)}`
    : capitalized
}
</script>

<template>
  <section v-if="entries.length" class="calendar" aria-label="Calendario de próximas fechas">
    <header class="calendar-head">
      <h2>Calendario</h2>
      <p class="calendar-hint">Lo que viene</p>
    </header>

    <ol class="calendar-list">
      <li v-for="entry in entries" :key="`${entry.id}-${entry.date.getTime()}`">
        <RouterLink
          :to="{ name: 'training-detail', params: { id: entry.id } }"
          class="entry"
          :class="{ 'is-live': entry.isLive }"
        >
          <span class="date-box">
            <span class="date-day">{{ dayFormatter.format(entry.date) }}</span>
            <span class="date-month">{{ month(entry.date) }}</span>
          </span>
          <span class="entry-text">
            <span class="entry-title">{{ entry.title }}</span>
            <span class="entry-when">{{ when(entry) }}</span>
          </span>
        </RouterLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.calendar {
  padding: var(--s-20);
  border: var(--rule);
  border-radius: var(--radius-xl);
  background: var(--surface-1);
}

.calendar-head {
  display: flex;
  align-items: baseline;
  gap: var(--s-10);
  margin-bottom: var(--s-18);
}

.calendar-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.calendar-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

/* Una fila de fechas que se reacomoda sola; en angosto, una debajo de otra. */
.calendar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--s-10);
}

.entry {
  display: flex;
  align-items: center;
  gap: var(--s-12);
  height: 100%;
  padding: var(--s-10) var(--s-12);
  border: var(--rule);
  border-radius: var(--radius-md);
  color: inherit;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.entry:hover {
  border-color: var(--line-mid);
  background: var(--surface-2);
}

/* Bloque de día/mes: el dato duro, en la tipografía de datos. */
.date-box {
  display: grid;
  place-items: center;
  width: 42px;
  padding: var(--s-5) 0;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-family: var(--font-display);
  flex-shrink: 0;
}

.is-live .date-box {
  background: var(--accent);
  color: var(--accent-contrast);
}

.date-day {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--text-strong);
}

.is-live .date-day {
  color: var(--accent-contrast);
}

.date-month {
  font-size: 9.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.is-live .date-month {
  color: var(--accent-contrast);
}

.entry-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.entry-title {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-when {
  color: var(--text-muted);
  font-size: 11.5px;
}

.is-live .entry-when {
  color: var(--accent-hover);
  font-weight: 500;
}
</style>
