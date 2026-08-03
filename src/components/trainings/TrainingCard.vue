<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import StatusBadge from '@/components/trainings/StatusBadge.vue'
import { formatDate } from '@/composables/useFormat'
import type { TrainingStatusRow, TrainingStatus } from '@/types/domain'

defineProps<{ row: TrainingStatusRow }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'training-detail', params: { id: row.training_id } }"
    class="card-link"
  >
    <UiCard hoverable class="training-card">
      <div class="card-top">
        <StatusBadge :status="(row.status ?? 'pending') as TrainingStatus" />
        <UiBadge v-if="row.attended_in_person" tone="success">
          Asististe ✓
        </UiBadge>
        <UiBadge v-if="row.exam_passed" tone="success">Examen ✓</UiBadge>
        <UiBadge v-else-if="row.has_exam" tone="warning">
          Examen pendiente
        </UiBadge>
      </div>
      <h3 class="card-title">{{ row.title }}</h3>
      <p class="card-date">{{ formatDate(row.session_date) }}</p>
      <div
        v-if="row.status !== 'pending'"
        class="progress-bar"
        :class="{ 'is-complete': row.status === 'completed' }"
      >
        <span :style="{ width: `${Math.min(100, row.watch_percent ?? 0)}%` }" />
      </div>
      <p v-if="row.status === 'in_progress'" class="card-progress">
        {{ Math.round(row.watch_percent ?? 0) }}% visto
      </p>
      <p v-else-if="row.status === 'completed'" class="card-progress">
        Completada
      </p>
    </UiCard>
  </RouterLink>
</template>

<style scoped>
.card-link {
  display: block;
  color: inherit;
}

.training-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-top {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

/* El único efecto del hover es el color: borde de la tarjeta y título. */
.card-title {
  font-size: 1rem;
  margin: 0.2rem 0 0;
  transition: color var(--transition-fast);
}

.card-link:hover .card-title {
  color: var(--clarvi-blue-ink);
}

.card-date {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  flex: 1;
}

.card-progress {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--clarvi-blue-ink);
}
</style>
