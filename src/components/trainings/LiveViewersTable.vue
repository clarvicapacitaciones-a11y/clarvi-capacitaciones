<script setup lang="ts">
// Quién está viendo la transmisión (y quién la vio), con sus datos.
//
// Se refresca sola cada 15 segundos mientras la transmisión está al aire: es
// una pantalla que se mira durante la sesión, no un reporte que se abre una
// vez. Al terminar deja de refrescarse y queda como la lista de asistencia
// remota de esa capacitación.
//
// Solo la ven administradores y owner: la RLS de `live_attendance` no deja leer
// las filas de nadie más.

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import { formatDateTime, formatMinutes } from '@/composables/useFormat'
import { isWatchingNow, listLiveAttendance } from '@/services/live.service'
import type { LiveViewer } from '@/types/domain'

const props = defineProps<{ trainingId: string; isLive: boolean }>()

const viewers = ref<LiveViewer[]>([])
const loading = ref(true)
const error = ref('')
/** Cambia con cada refresco para recalcular quién sigue conectado. */
const now = ref(Date.now())

let timer: number | null = null

async function load(): Promise<void> {
  try {
    viewers.value = await listLiveAttendance(props.trainingId)
    now.value = Date.now()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar'
  } finally {
    loading.value = false
  }
}

function stopPolling(): void {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

function startPolling(): void {
  stopPolling()
  if (!props.isLive) return
  timer = window.setInterval(() => {
    if (!document.hidden) void load()
  }, 15_000)
}

onMounted(async () => {
  await load()
  startPolling()
})

watch(() => props.isLive, startPolling)
onBeforeUnmount(stopPolling)

/** Conectado según el último refresco (por eso `now` y no Date.now()). */
function watchingNow(viewer: LiveViewer): boolean {
  return isWatchingNow(viewer, now.value)
}

const connected = computed(() => viewers.value.filter(watchingNow))

/** Conectados primero; después, quien más tiempo estuvo. */
const ordered = computed(() =>
  [...viewers.value].sort((a, b) => {
    const diff = Number(watchingNow(b)) - Number(watchingNow(a))
    return diff !== 0 ? diff : b.watched_seconds - a.watched_seconds
  }),
)
</script>

<template>
  <div>
    <header class="head">
      <h3>
        {{ isLive ? 'Viendo la transmisión' : 'Asistencia a la transmisión' }}
        <UiBadge v-if="isLive" tone="danger">
          {{ connected.length }} conectados
        </UiBadge>
        <UiBadge v-else tone="neutral">{{ viewers.length }}</UiBadge>
      </h3>
      <p class="muted">
        <template v-if="isLive">
          Se actualiza sola cada 15 segundos.
        </template>
        <template v-else>
          Quienes vieron la transmisión en vivo desde la plataforma.
        </template>
      </p>
    </header>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="form-error">{{ error }}</p>

    <div v-else-if="ordered.length" class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Área</th>
            <th>Sucursal</th>
            <th>Estado</th>
            <th>Se conectó</th>
            <th>Tiempo en la transmisión</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="viewer in ordered" :key="viewer.id">
            <td>{{ viewer.profiles?.full_name ?? '—' }}</td>
            <td>{{ viewer.profiles?.areas?.nombre ?? '—' }}</td>
            <td>{{ viewer.profiles?.sucursales?.nombre ?? '—' }}</td>
            <td>
              <UiBadge v-if="watchingNow(viewer)" tone="danger">
                Viendo ahora
              </UiBadge>
              <span v-else class="muted">
                Salió {{ formatDateTime(viewer.last_seen_at) }}
              </span>
            </td>
            <td>{{ formatDateTime(viewer.joined_at) }}</td>
            <td>{{ formatMinutes(viewer.watched_seconds) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="muted">
      Todavía nadie se ha conectado a la transmisión desde la plataforma.
    </p>
  </div>
</template>

<style scoped>
.head {
  margin-bottom: 0.8rem;
}

.head h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.2rem;
}

.head p {
  margin: 0;
}
</style>
