<script setup lang="ts">
// Dashboard personal: una sola página con secciones. Primero lo que quedó a
// medias, luego lo que falta por ver y al final lo terminado.

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TrainingCard from '@/components/trainings/TrainingCard.vue'
import { syncLiveState } from '@/services/live.service'
import { listMyTrainingStatuses } from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import type { TrainingStatus, TrainingStatusRow } from '@/types/domain'

/** Cada cuánto se revisa si una transmisión anunciada ya empezó. */
const BROADCAST_SYNC_MS = 60_000

const auth = useAuthStore()
const rows = ref<TrainingStatusRow[]>([])
const loading = ref(true)
const error = ref('')

/** Orden y textos de las secciones de la página. */
const SECTIONS: { status: TrainingStatus; title: string; hint: string }[] = [
  {
    status: 'in_progress',
    title: 'Continuar viendo',
    hint: 'Retoma donde te quedaste',
  },
  {
    status: 'pending',
    title: 'Capacítate',
    hint: 'Todavía no las empiezas',
  },
  {
    status: 'completed',
    title: 'Completadas',
    hint: 'Ya las terminaste',
  },
]

/**
 * Lo que está al aire (o anunciado) sale de las secciones normales: una
 * capacitación en vivo no es "pendiente", es algo que está pasando ahora.
 */
const liveRows = computed(() =>
  rows.value.filter((row) => row.live_status === 'en_vivo'),
)
const scheduledRows = computed(() =>
  rows.value.filter((row) => row.live_status === 'programada'),
)

const buckets = computed(() => {
  const grouped: Record<TrainingStatus, TrainingStatusRow[]> = {
    pending: [],
    in_progress: [],
    completed: [],
  }
  for (const row of rows.value) {
    if (row.live_status === 'en_vivo' || row.live_status === 'programada') {
      continue
    }
    const status = (row.status ?? 'pending') as TrainingStatus
    grouped[status].push(row)
  }
  return grouped
})

/** Solo se pintan las secciones que tienen algo que mostrar. */
const sections = computed(() =>
  SECTIONS.map((section) => ({
    ...section,
    rows: buckets.value[section.status],
  })).filter((section) => section.rows.length > 0),
)

const hasTrainings = computed(() => rows.value.length > 0)

async function loadRows(): Promise<void> {
  if (!auth.userId) return
  rows.value = await listMyTrainingStatuses(auth.userId)
}

/**
 * Mantiene al día lo que está por empezar o al aire.
 *
 * El dashboard es la pantalla que más se abre, así que es el mejor lugar para
 * que la plataforma se entere de que una transmisión arrancó: se le pregunta a
 * YouTube por las que están anunciadas (el servidor no consulta más de una vez
 * cada 15 segundos, sin importar cuánta gente tenga el dashboard abierto).
 */
async function syncBroadcasts(): Promise<void> {
  const pending = [...scheduledRows.value, ...liveRows.value]
  if (pending.length === 0) return
  const before = pending.map((row) => row.live_status).join()
  const states = await Promise.all(
    pending.map((row) =>
      syncLiveState(String(row.training_id)).catch(() => null),
    ),
  )
  const after = states.map((state, index) =>
    state ? state.live_status : pending[index]?.live_status,
  ).join()
  if (before !== after) await loadRows()
}

let syncTimer: number | null = null

onMounted(async () => {
  try {
    await loadRows()
    void syncBroadcasts()
    syncTimer = window.setInterval(() => {
      if (!document.hidden) void syncBroadcasts()
    }, BROADCAST_SYNC_MS)
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudieron cargar tus capacitaciones'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (syncTimer !== null) window.clearInterval(syncTimer)
})
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Hola, {{ auth.profile?.full_name?.split(' ')[0] }}</h1>
        <p class="muted">Estas son tus capacitaciones</p>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Cargando…</p>

    <template v-else>
      <section v-if="liveRows.length" class="training-section is-live">
        <div class="section-head">
          <span class="live-dot" aria-hidden="true" />
          <h2>En vivo ahora</h2>
          <span class="section-count">{{ liveRows.length }}</span>
        </div>
        <p class="muted section-hint">Se está transmitiendo en este momento</p>

        <div class="cards-grid">
          <TrainingCard
            v-for="row in liveRows"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>

      <section v-if="scheduledRows.length" class="training-section">
        <div class="section-head">
          <h2>Próximas transmisiones</h2>
          <span class="section-count">{{ scheduledRows.length }}</span>
        </div>
        <p class="muted section-hint">Anunciadas, todavía sin empezar</p>

        <div class="cards-grid">
          <TrainingCard
            v-for="row in scheduledRows"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>

      <section
        v-for="section in sections"
        :key="section.status"
        class="training-section"
      >
        <div class="section-head">
          <h2>{{ section.title }}</h2>
          <span class="section-count">{{ section.rows.length }}</span>
        </div>
        <p class="muted section-hint">{{ section.hint }}</p>

        <div class="cards-grid">
          <TrainingCard
            v-for="row in section.rows"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>

      <div v-if="!hasTrainings" class="empty-state">
        <strong>Aún no tienes capacitaciones</strong>
        <span>Cuando el equipo publique una nueva, aparecerá aquí.</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Secciones apiladas, separadas por aire y una línea suave. */
.training-section + .training-section {
  margin-top: 2.5rem;
  padding-top: 2.5rem;
  border-top: var(--rule);
}

.section-head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

/* Punto sólido de "al aire": color, sin parpadeo ni movimiento. */
.live-dot {
  align-self: center;
  width: 9px;
  height: 9px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
}

.section-head h2 {
  margin: 0;
  font-size: 1.2rem;
}

.section-count {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.section-hint {
  margin: 0.15rem 0 1.1rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.1rem;
}
</style>
