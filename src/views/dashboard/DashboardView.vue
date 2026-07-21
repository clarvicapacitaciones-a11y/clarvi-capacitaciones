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

    <div class="status-tabs">
      <button
        v-for="tabName in tabs"
        :key="tabName"
        class="status-tab"
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
.status-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.14);
  background: rgba(255, 255, 255, 0.55);
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-muted);
  padding: 0.5rem 0.95rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.status-tab:hover {
  border-color: rgba(var(--clarvi-blue-rgb), 0.4);
}

.status-tab.is-active {
  background: linear-gradient(135deg, var(--clarvi-blue), var(--clarvi-navy));
  border-color: transparent;
  color: #fff;
}

.count {
  background: rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-full);
  padding: 0.05rem 0.5rem;
  font-size: 0.78rem;
}

.status-tab:not(.is-active) .count {
  background: rgba(var(--clarvi-navy-rgb), 0.08);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}
</style>
