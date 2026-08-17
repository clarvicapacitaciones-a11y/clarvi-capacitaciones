<script setup lang="ts">
// Dashboard personal: una sola página con secciones. Arriba, el resumen de en
// qué va la persona; luego lo que está pasando ahora (transmisiones), lo que
// quedó a medias, lo que falta por ver y al final lo terminado.

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TrainingCard from '@/components/trainings/TrainingCard.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import UiSectionHeader from '@/components/ui/UiSectionHeader.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiStat from '@/components/ui/UiStat.vue'
import type { IconName } from '@/components/ui/UiIcon.vue'
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
const SECTIONS: {
  status: TrainingStatus
  title: string
  hint: string
  icon: IconName
}[] = [
  {
    status: 'in_progress',
    title: 'Continuar viendo',
    hint: 'Retoma donde te quedaste',
    icon: 'play',
  },
  {
    status: 'pending',
    title: 'Capacítate',
    hint: 'Todavía no las empiezas',
    icon: 'book',
  },
  {
    status: 'completed',
    title: 'Completadas',
    hint: 'Ya las terminaste',
    icon: 'check-circle',
  },
]

const firstName = computed(
  () => auth.profile?.full_name?.trim().split(/\s+/)[0] ?? '',
)

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

/**
 * Resumen de arriba. Cuenta sobre TODAS las capacitaciones asignadas (las que
 * están al aire incluidas): es el avance de la persona en su plan, no el de
 * las secciones que se ven abajo.
 */
const summary = computed(() => {
  const total = rows.value.length
  const completed = rows.value.filter((row) => row.status === 'completed').length
  const inProgress = rows.value.filter((row) => row.status === 'in_progress').length
  const pendingExams = rows.value.filter(
    (row) => row.has_exam && !row.exam_passed,
  ).length
  return {
    total,
    completed,
    inProgress,
    pendingExams,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
})

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
    <header class="dash-head">
      <div>
        <h1>Hola{{ firstName ? `, ${firstName}` : '' }}</h1>
        <p class="muted">Estas son tus capacitaciones</p>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>

    <!-- Mientras carga se reserva el espacio con la forma real de la página:
         primero el resumen, luego una rejilla de tarjetas. -->
    <template v-else-if="loading">
      <div class="summary" aria-hidden="true">
        <UiSkeleton v-for="n in 4" :key="n" height="5.2rem" radius="md" />
      </div>
      <div class="cards-grid" aria-hidden="true">
        <UiCard v-for="n in 6" :key="n" padding="none" class="skeleton-card">
          <UiSkeleton height="0" width="100%" class="skeleton-cover" />
          <div class="skeleton-body">
            <UiSkeleton height="0.95rem" width="85%" />
            <UiSkeleton height="0.8rem" width="55%" />
            <UiSkeleton height="0.55rem" width="100%" radius="full" />
          </div>
        </UiCard>
      </div>
      <p class="visually-hidden" role="status">Cargando tus capacitaciones…</p>
    </template>

    <template v-else-if="hasTrainings">
      <div class="summary">
        <UiStat
          label="Asignadas"
          :value="summary.total"
          icon="book"
        />
        <UiStat
          label="Completadas"
          :value="summary.completed"
          icon="check-circle"
          tone="success"
        />
        <UiStat label="En curso" :value="summary.inProgress" icon="play" />
        <UiStat
          label="Avance general"
          :value="summary.percent"
          suffix="%"
          icon="award"
          tone="accent"
        />
      </div>

      <section v-if="liveRows.length" class="training-section">
        <UiSectionHeader
          title="En vivo ahora"
          hint="Se está transmitiendo en este momento"
          :count="liveRows.length"
          live
        />
        <div class="cards-grid">
          <TrainingCard
            v-for="row in liveRows"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>

      <section v-if="scheduledRows.length" class="training-section">
        <UiSectionHeader
          title="Próximas transmisiones"
          hint="Anunciadas, todavía sin empezar"
          :count="scheduledRows.length"
          icon="clock"
        />
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
        <UiSectionHeader
          :title="section.title"
          :hint="section.hint"
          :count="section.rows.length"
          :icon="section.icon"
        />
        <div class="cards-grid">
          <TrainingCard
            v-for="row in section.rows"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>
    </template>

    <UiEmptyState
      v-else
      title="Aún no tienes capacitaciones"
      description="Cuando el equipo publique una nueva, aparecerá aquí."
    />
  </div>
</template>

<style scoped>
.dash-head {
  margin-bottom: 1.5rem;
}

.dash-head h1 {
  margin: 0;
  font-size: 1.7rem;
}

.dash-head p {
  margin: 0.25rem 0 0;
}

/* Resumen: cuatro datos en una fila que se reacomoda sola en pantallas
   angostas. */
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 2.5rem;
}

/* Secciones apiladas, separadas por aire y una línea suave. */
.training-section + .training-section {
  margin-top: 2.5rem;
  padding-top: 2.5rem;
  border-top: var(--rule);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(258px, 1fr));
  gap: 1.1rem;
}

/* ── Esqueleto de carga ── */

.skeleton-card {
  overflow: hidden;
}

.skeleton-cover {
  aspect-ratio: 16 / 9;
  height: auto;
  border-radius: 0;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 1.05rem 1.15rem;
}
</style>
