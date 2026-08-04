<script setup lang="ts">
// Dashboard personal: una sola página con secciones. Primero lo que quedó a
// medias, luego lo que falta por ver y al final lo terminado.

import { computed, onMounted, ref } from 'vue'
import TrainingCard from '@/components/trainings/TrainingCard.vue'
import { listMyTrainingStatuses } from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import type { TrainingStatus, TrainingStatusRow } from '@/types/domain'

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

/** Solo se pintan las secciones que tienen algo que mostrar. */
const sections = computed(() =>
  SECTIONS.map((section) => ({
    ...section,
    rows: buckets.value[section.status],
  })).filter((section) => section.rows.length > 0),
)

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

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Cargando…</p>

    <template v-else-if="sections.length">
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
    </template>

    <div v-else class="empty-state">
      <strong>Aún no tienes capacitaciones</strong>
      <span>Cuando el equipo publique una nueva, aparecerá aquí.</span>
    </div>
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
