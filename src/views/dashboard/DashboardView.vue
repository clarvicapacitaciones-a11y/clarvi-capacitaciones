<script setup lang="ts">
// Mis cursos: la pantalla principal del colaborador.
//
// Orden de la página: lo que está pasando ahora (transmisión al aire), el
// calendario de lo que viene, lo que quedó a medias y lo que falta por
// empezar.
//
// Dos reglas de la plataforma que esta vista sostiene:
//   · Solo se ven los cursos asignados. La vista `user_training_status` ya
//     filtra por área, así que aquí no hay catálogo abierto ni forma de
//     asomarse a otra área.
//   · Un curso completado sale de esta pantalla. Al llegar al 100 % pasa a
//     vivir en el perfil (y a Certificados cuando esa sección se abra), para
//     que el home hable siempre de lo que falta por hacer.

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TrainingCard from '@/components/trainings/TrainingCard.vue'
import UpcomingCalendar from '@/components/trainings/UpcomingCalendar.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import UiSectionHeader from '@/components/ui/UiSectionHeader.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { useCourseSearch } from '@/composables/useCourseSearch'
import { syncLiveState } from '@/services/live.service'
import { listMyTrainingStatuses } from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import type { TrainingStatusRow } from '@/types/domain'

/** Cada cuánto se revisa si una transmisión anunciada ya empezó. */
const BROADCAST_SYNC_MS = 60_000

/** Cuántas tarjetas caben en una fila antes de tener que pulsar "Ver todos". */
const ROW_SIZE = 4

const auth = useAuthStore()
const { matches, isSearching, term } = useCourseSearch()

const rows = ref<TrainingStatusRow[]>([])
const loading = ref(true)
const error = ref('')

/** Secciones que la persona abrió con "Ver todos". */
const expanded = ref<Record<string, boolean>>({})

function toggle(key: string): void {
  expanded.value[key] = !expanded.value[key]
}

/** Lo que se muestra de una sección: una fila, o todo si se desplegó. */
function visible(key: string, list: TrainingStatusRow[]): TrainingStatusRow[] {
  // Buscando no se recorta: si el resultado cabe en dos filas, se ven las dos.
  if (isSearching.value || expanded.value[key]) return list
  return list.slice(0, ROW_SIZE)
}

function countLabel(total: number, one: string, many: string): string {
  return `${total} ${total === 1 ? one : many}`
}

const firstName = computed(
  () => auth.profile?.full_name?.trim().split(/\s+/)[0] ?? '',
)

/** El buscador de la barra superior filtra por título y descripción. */
const found = computed(() =>
  rows.value.filter((row) => matches(row.title, row.description)),
)

const liveRows = computed(() =>
  found.value.filter((row) => row.live_status === 'en_vivo'),
)

/**
 * Continuar: lo empezado y sin terminar. Una transmisión al aire no entra
 * aquí — ya tiene su propia franja arriba.
 */
const inProgressRows = computed(() =>
  found.value.filter(
    (row) => row.status === 'in_progress' && row.live_status !== 'en_vivo',
  ),
)

/**
 * Obligatorios: todo lo asignado que aún no se empieza. Como el alcance por
 * área lo aplica la vista de la base, lo que llega aquí ya es de la persona.
 */
const pendingRows = computed(() =>
  found.value.filter(
    (row) => (row.status ?? 'pending') === 'pending' && row.live_status !== 'en_vivo',
  ),
)

/** El calendario mira todo lo asignado, no solo lo que pasa el filtro. */
const scheduledRows = computed(() =>
  rows.value.filter((row) => row.live_status === 'programada'),
)

const hasTrainings = computed(() => rows.value.length > 0)
const hasVisible = computed(
  () => liveRows.value.length + inProgressRows.value.length + pendingRows.value.length > 0,
)

async function loadRows(): Promise<void> {
  if (!auth.userId) return
  rows.value = await listMyTrainingStatuses(auth.userId)
}

/**
 * Mantiene al día lo que está por empezar o al aire.
 *
 * Esta es la pantalla que más se abre, así que es el mejor lugar para que la
 * plataforma se entere de que una transmisión arrancó: se le pregunta a
 * YouTube por las anunciadas (el servidor no consulta más de una vez cada 15
 * segundos, sin importar cuánta gente tenga la pantalla abierta).
 */
async function syncBroadcasts(): Promise<void> {
  const pending = rows.value.filter(
    (row) => row.live_status === 'programada' || row.live_status === 'en_vivo',
  )
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
      err instanceof Error ? err.message : 'No se pudieron cargar tus cursos'
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
        <h1>Mis cursos</h1>
        <p class="muted">
          {{ firstName ? `Hola, ${firstName}. ` : '' }}Esto es lo que tienes
          asignado
        </p>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>

    <!-- Mientras carga se reserva el espacio con la forma real de la página. -->
    <template v-else-if="loading">
      <div class="courses-grid" aria-hidden="true">
        <UiSkeleton v-for="n in 8" :key="n" class="card-skeleton" radius="lg" />
      </div>
      <p class="visually-hidden" role="status">Cargando tus cursos…</p>
    </template>

    <template v-else-if="hasTrainings">
      <section v-if="liveRows.length" class="course-section">
        <UiSectionHeader
          title="En vivo ahora"
          :subtitle="countLabel(liveRows.length, 'transmisión al aire', 'transmisiones al aire')"
          live
        />
        <div class="courses-grid">
          <TrainingCard
            v-for="row in liveRows"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>

      <UpcomingCalendar
        v-if="!isSearching"
        :rows="[...liveRows, ...scheduledRows, ...pendingRows, ...inProgressRows]"
        class="course-section"
      />

      <section v-if="inProgressRows.length" class="course-section">
        <UiSectionHeader
          title="Continúa donde te quedaste"
          :subtitle="countLabel(inProgressRows.length, 'curso en progreso', 'cursos en progreso')"
        >
          <template #action>
            <button
              v-if="inProgressRows.length > ROW_SIZE && !isSearching"
              class="section-action"
              type="button"
              @click="toggle('progress')"
            >
              {{ expanded.progress ? 'Ver menos' : 'Ver todos' }}
            </button>
          </template>
        </UiSectionHeader>
        <div class="courses-grid">
          <TrainingCard
            v-for="row in visible('progress', inProgressRows)"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>

      <section v-if="pendingRows.length" class="course-section">
        <UiSectionHeader
          title="Obligatorios de tu área"
          :subtitle="countLabel(pendingRows.length, 'curso sin iniciar', 'cursos sin iniciar')"
        >
          <template #action>
            <button
              v-if="pendingRows.length > ROW_SIZE && !isSearching"
              class="section-action"
              type="button"
              @click="toggle('pending')"
            >
              {{ expanded.pending ? 'Ver menos' : 'Ver todos' }}
            </button>
          </template>
        </UiSectionHeader>
        <div class="courses-grid">
          <TrainingCard
            v-for="row in visible('pending', pendingRows)"
            :key="row.training_id ?? ''"
            :row="row"
          />
        </div>
      </section>

      <!-- Nada que hacer: o la búsqueda no encontró, o ya terminó todo. -->
      <UiEmptyState
        v-if="!hasVisible && isSearching"
        icon="search"
        title="Sin resultados"
        :description="`Ningún curso asignado coincide con “${term}”.`"
      />
      <UiEmptyState
        v-else-if="!hasVisible"
        icon="award"
        title="Estás al día"
        description="Terminaste todos tus cursos asignados. Los encuentras en tu perfil."
      />
    </template>

    <UiEmptyState
      v-else
      title="Aún no tienes cursos"
      description="Cuando se publique uno para tu área, aparecerá aquí."
    />
  </div>
</template>

<style scoped>
/* Las secciones se separan por aire, no por líneas: el corte lo hace el
   título de la siguiente. */
.course-section + .course-section {
  margin-top: var(--s-40);
}

.card-skeleton {
  aspect-ratio: 16 / 10.6;
  height: auto;
}
</style>
