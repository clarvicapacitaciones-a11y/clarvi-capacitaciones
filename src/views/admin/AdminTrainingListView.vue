<script setup lang="ts">
// Lista de capacitaciones para administración, con métricas rápidas.

import { onMounted, ref } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { formatDate } from '@/composables/useFormat'
import {
  completedCountsByTraining,
  deleteTraining,
  listAllTrainings,
} from '@/services/trainings.service'
import type { TrainingWithCounts } from '@/types/domain'

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
        <UiButton>+ Nueva capacitación</UiButton>
      </RouterLink>
    </header>

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
                <UiBadge v-if="training.youtube_video_id" tone="success">
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
