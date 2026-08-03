<script setup lang="ts">
// Lista de capacitaciones para administración, con métricas rápidas.

import { onMounted, ref } from 'vue'
import GlassBadge from '@/components/glass/GlassBadge.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassCard from '@/components/glass/GlassCard.vue'
import GlassModal from '@/components/glass/GlassModal.vue'
import { formatDate } from '@/composables/useFormat'
import {
  completedCountsByTraining,
  deleteTraining,
  listAllTrainings,
} from '@/services/trainings.service'
import { useCatalogsStore } from '@/stores/catalogs.store'
import type { TrainingWithCounts } from '@/types/domain'

const catalogs = useCatalogsStore()
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
      catalogs.fetchCatalogs(),
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

/** Nombres de las áreas de la capacitación; vacío = para todo el personal. */
function areaNames(training: TrainingWithCounts): string[] {
  return training.training_areas.map((row) => catalogs.areaName(row.area_id))
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
        <GlassButton>+ Nueva capacitación</GlassButton>
      </RouterLink>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Cargando…</p>

    <GlassCard v-else-if="trainings.length">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Áreas</th>
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
              <td>
                <div v-if="areaNames(training).length" class="area-tags">
                  <GlassBadge
                    v-for="nombre in areaNames(training)"
                    :key="nombre"
                    tone="info"
                  >
                    {{ nombre }}
                  </GlassBadge>
                </div>
                <span v-else class="muted">Todo el personal</span>
              </td>
              <td>{{ formatDate(training.session_date) }}</td>
              <td>
                <GlassBadge v-if="training.youtube_video_id" tone="success">
                  Publicado
                </GlassBadge>
                <GlassBadge v-else tone="warning">Sin video</GlassBadge>
              </td>
              <td>{{ countOf(training.attendance) }}</td>
              <td>{{ countOf(training.watch_progress) }}</td>
              <td>{{ completedCounts[training.id] ?? 0 }}</td>
              <td class="row-actions">
                <RouterLink
                  :to="{ name: 'admin-training-edit', params: { id: training.id } }"
                >
                  <GlassButton variant="ghost">Editar</GlassButton>
                </RouterLink>
                <GlassButton variant="danger" @click="toDelete = training">
                  Eliminar
                </GlassButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <div v-else class="empty-state">
      <strong>Aún no hay capacitaciones</strong>
      <span>Crea la primera con el botón “Nueva capacitación”.</span>
    </div>

    <GlassModal
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
        <GlassButton variant="ghost" @click="toDelete = null">
          Cancelar
        </GlassButton>
        <GlassButton variant="danger" :loading="deleting" @click="confirmDelete">
          Eliminar definitivamente
        </GlassButton>
      </template>
    </GlassModal>
  </div>
</template>

<style scoped>
.row-title {
  font-weight: 600;
  color: var(--clarvi-navy);
}

.row-title:hover {
  color: var(--clarvi-blue);
}

.row-actions {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
  white-space: nowrap;
}

.area-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 220px;
}
</style>
