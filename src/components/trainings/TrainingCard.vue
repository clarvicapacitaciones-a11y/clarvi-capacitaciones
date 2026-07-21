<script setup lang="ts">
import GlassCard from '@/components/glass/GlassCard.vue'
import GlassBadge from '@/components/glass/GlassBadge.vue'
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
    <GlassCard hoverable class="training-card">
      <div class="card-top">
        <StatusBadge :status="(row.status ?? 'pending') as TrainingStatus" />
        <GlassBadge v-if="row.attended_in_person" tone="success">
          Asististe ✓
        </GlassBadge>
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
    </GlassCard>
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
  gap: 0.4rem;
}

.card-top {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.card-title {
  font-size: 1.02rem;
  margin: 0.15rem 0 0;
}

.card-date {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  flex: 1;
}

.card-progress {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--clarvi-blue);
}
</style>
