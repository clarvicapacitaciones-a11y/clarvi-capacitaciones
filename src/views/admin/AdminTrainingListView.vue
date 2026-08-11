<script setup lang="ts">
// Lista de capacitaciones para administración, con métricas rápidas, y el
// alta desde la transmisión: revisar el canal y, si está al aire, dejar que la
// plataforma cree la tarjeta con los datos del propio directo.

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { formatDate } from '@/composables/useFormat'
import { scanChannelForLive } from '@/services/live.service'
import { getChannelUrl, setChannelUrl } from '@/services/settings.service'
import {
  completedCountsByTraining,
  deleteTraining,
  listAllTrainings,
} from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import type { TrainingWithCounts } from '@/types/domain'

const router = useRouter()
const auth = useAuthStore()

const trainings = ref<TrainingWithCounts[]>([])
const completedCounts = ref<Record<string, number>>({})
const loading = ref(true)
const error = ref('')

const toDelete = ref<TrainingWithCounts | null>(null)
const deleting = ref(false)

async function load(): Promise<void> {
  loading.value = true
  try {
    const [list, counts] = await Promise.all([
      listAllTrainings(),
      completedCountsByTraining(),
    ])
    trainings.value = list
    completedCounts.value = counts
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudieron cargar las capacitaciones'
  } finally {
    loading.value = false
  }
}

// ── Alta desde la transmisión ──────────────────────────────────────────────

const channelUrl = ref('')
const scanning = ref(false)
const savingChannel = ref(false)
const scanMessage = ref('')
const scanError = ref('')

onMounted(async () => {
  try {
    channelUrl.value = (await getChannelUrl()) ?? ''
  } catch {
    /* sin canal configurado la tarjeta se muestra igual, vacía */
  }
})

async function saveChannel(): Promise<void> {
  scanError.value = ''
  savingChannel.value = true
  try {
    await setChannelUrl(channelUrl.value, auth.userId)
    scanMessage.value = 'Canal guardado.'
  } catch (err) {
    scanError.value = err instanceof Error ? err.message : 'No se pudo guardar'
  } finally {
    savingChannel.value = false
  }
}

/**
 * Revisa el canal. Si está transmitiendo, la capacitación se crea sola con el
 * título, el video y la miniatura del directo, y se abre su ficha para
 * ajustarla o ponerle examen.
 */
async function scanChannel(): Promise<void> {
  scanError.value = ''
  scanMessage.value = ''
  scanning.value = true
  try {
    const result = await scanChannelForLive(channelUrl.value || undefined)
    if (!result.found) {
      scanMessage.value = result.info?.error ??
        'El canal no está transmitiendo en este momento.'
      return
    }
    if (result.training_id) {
      await router.push({
        name: 'admin-training-detail',
        params: { id: result.training_id },
      })
    }
  } catch (err) {
    scanError.value = err instanceof Error ? err.message : 'No se pudo revisar'
  } finally {
    scanning.value = false
  }
}

onMounted(load)

function countOf(row: { count: number }[] | undefined): number {
  return row?.[0]?.count ?? 0
}

async function confirmDelete(): Promise<void> {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await deleteTraining(toDelete.value.id)
    toDelete.value = null
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo eliminar'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>Capacitaciones</h1>
        <p class="muted">Sesiones, videos y su seguimiento</p>
      </div>
      <RouterLink :to="{ name: 'admin-training-new' }">
        <UiButton variant="ghost">+ Nueva capacitación</UiButton>
      </RouterLink>
    </header>

    <UiCard class="scan-card">
      <div class="scan-head">
        <div>
          <h3>Iniciar una capacitación en vivo</h3>
          <p class="muted">
            Abre la transmisión en YouTube (como <strong>no listada</strong>) y
            pulsa <strong>Revisar canal</strong>. Si está al aire, la
            capacitación se crea sola con el título, el video y la miniatura del
            directo — no hace falta capturarla.
          </p>
        </div>
        <UiButton :loading="scanning" @click="scanChannel">
          Revisar canal
        </UiButton>
      </div>

      <div class="scan-channel">
        <UiInput
          v-model="channelUrl"
          label="Canal de las capacitaciones"
          placeholder="https://www.youtube.com/@tucanal"
          hint="Se guarda una sola vez y sirve para todas las transmisiones."
        />
        <UiButton
          variant="ghost"
          :loading="savingChannel"
          :disabled="!channelUrl"
          @click="saveChannel"
        >
          Guardar canal
        </UiButton>
      </div>

      <p v-if="scanError" class="form-error">{{ scanError }}</p>
      <p v-else-if="scanMessage" class="muted scan-message">{{ scanMessage }}</p>
    </UiCard>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Cargando…</p>

    <UiCard v-else-if="trainings.length">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Fecha sesión</th>
              <th>Video</th>
              <th>Asistentes</th>
              <th>Han visto</th>
              <th>Completadas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="training in trainings" :key="training.id">
              <td>
                <RouterLink
                  :to="{ name: 'admin-training-detail', params: { id: training.id } }"
                  class="row-title"
                >
                  {{ training.title }}
                </RouterLink>
              </td>
              <td>{{ formatDate(training.session_date) }}</td>
              <td>
                <UiBadge v-if="training.live_status === 'en_vivo'" tone="danger">
                  En vivo
                </UiBadge>
                <UiBadge
                  v-else-if="training.live_status === 'programada'"
                  tone="warning"
                >
                  Transmisión programada
                </UiBadge>
                <UiBadge v-else-if="training.youtube_video_id" tone="success">
                  Publicado
                </UiBadge>
                <UiBadge v-else tone="warning">Sin video</UiBadge>
              </td>
              <td>{{ countOf(training.attendance) }}</td>
              <td>{{ countOf(training.watch_progress) }}</td>
              <td>{{ completedCounts[training.id] ?? 0 }}</td>
              <td class="row-actions">
                <RouterLink
                  :to="{ name: 'admin-training-edit', params: { id: training.id } }"
                >
                  <UiButton variant="ghost">Editar</UiButton>
                </RouterLink>
                <UiButton variant="danger" @click="toDelete = training">
                  Eliminar
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <div v-else class="empty-state">
      <strong>Aún no hay capacitaciones</strong>
      <span>Crea la primera con el botón “Nueva capacitación”.</span>
    </div>

    <UiModal
      :open="toDelete !== null"
      title="Eliminar capacitación"
      @close="toDelete = null"
    >
      <p>
        ¿Eliminar <strong>{{ toDelete?.title }}</strong
        >? Se borrará también su asistencia y el progreso de visualización de
        todos los usuarios. Esta acción no se puede deshacer.
      </p>
      <template #footer>
        <UiButton variant="ghost" @click="toDelete = null">
          Cancelar
        </UiButton>
        <UiButton variant="danger" :loading="deleting" @click="confirmDelete">
          Eliminar definitivamente
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.scan-card {
  margin-bottom: 1.25rem;
}

.scan-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.scan-head h3 {
  margin: 0 0 0.25rem;
}

.scan-head p {
  margin: 0;
  max-width: 62ch;
}

/* El campo del canal manda; el botón de guardar se alinea a su base. */
.scan-channel {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: var(--rule);
}

.scan-channel > :first-child {
  flex: 1;
  min-width: 260px;
}

.scan-message {
  margin: 0.8rem 0 0;
}

.row-title {
  font-weight: 500;
  color: var(--text-strong);
}

.row-title:hover {
  color: var(--clarvi-blue-ink);
}

.row-actions {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
  white-space: nowrap;
}
</style>
