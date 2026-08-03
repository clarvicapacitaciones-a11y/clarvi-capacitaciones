<script setup lang="ts">
// Dashboard personal: capacitaciones pendientes, en curso y completadas.

import { computed, onMounted, ref } from 'vue'
import TrainingCard from '@/components/trainings/TrainingCard.vue'
import { listMyTrainingStatuses } from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import type { TrainingStatus, TrainingStatusRow } from '@/types/domain'
import { STATUS_LABELS } from '@/types/domain'

const auth = useAuthStore()
const rows = ref<TrainingStatusRow[]>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref<TrainingStatus>('pending')

const buckets = computed(() => {
  const grouped: Record<TrainingStatus, TrainingStatusRow[]> = {
    pending: [],
    in_progress: [],
    completed: [],
  }
  for (const row of rows.value) {
    const status = (row.status ?? 'pending') as TrainingStatus
    grouped[status].push(row)
  }
  return grouped
})

const tabs: TrainingStatus[] = ['pending', 'in_progress', 'completed']

onMounted(async () => {
  try {
    if (auth.userId) {
      rows.value = await listMyTrainingStatuses(auth.userId)
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudieron cargar tus capacitaciones'
  } finally {
    loading.value = false
  }
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

    <div class="tabs">
      <button
        v-for="tabName in tabs"
        :key="tabName"
        class="tab"
        :class="{ 'is-active': activeTab === tabName }"
        @click="activeTab = tabName"
      >
        {{ STATUS_LABELS[tabName] }}
        <span class="count">{{ buckets[tabName].length }}</span>
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Cargando…</p>

    <div v-else-if="buckets[activeTab].length" class="cards-grid">
      <TrainingCard
        v-for="row in buckets[activeTab]"
        :key="row.training_id ?? ''"
        :row="row"
      />
    </div>

    <div v-else class="empty-state">
      <strong v-if="activeTab === 'pending'">Sin capacitaciones pendientes</strong>
      <strong v-else-if="activeTab === 'in_progress'">Nada en curso</strong>
      <strong v-else>Aún no completas ninguna capacitación</strong>
      <span v-if="activeTab === 'pending'">
        Cuando un administrador publique un video nuevo, aparecerá aquí.
      </span>
    </div>
  </div>
</template>

<style scoped>
/* El control segmentado vive en base.css (.tabs/.tab); aquí solo el
   contador de cada pestaña. */
.count {
  font-size: 0.72rem;
  font-weight: 700;
  transition: color var(--transition-fast);
}

.tab:not(.is-active) .count {
  color: var(--text-muted);
}

.tab.is-active .count {
  color: var(--blue-100);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}
</style>
