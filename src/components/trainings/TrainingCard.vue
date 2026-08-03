<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import { formatDate } from '@/composables/useFormat'
import { coverFallbackUrl, coverImageUrl } from '@/composables/useTrainingCover'
import type { TrainingStatusRow } from '@/types/domain'

const props = defineProps<{ row: TrainingStatusRow }>()

// El estado (pendiente / en curso / completada) ya lo dicen las pestañas del
// dashboard, así que la tarjeta no lo repite: muestra la portada, lo que la
// pestaña no cubre (asistencia y examen) y el avance real del video.
const cover = ref<string | null>(null)
watchEffect(() => {
  cover.value = coverImageUrl(props.row.cover_image_url, props.row.youtube_video_id)
})

/** Si la miniatura grande de YouTube no existe, se intenta con la chica. */
function onCoverError(): void {
  cover.value = cover.value
    ? coverFallbackUrl(cover.value, props.row.youtube_video_id)
    : null
}
</script>

<template>
  <RouterLink
    :to="{ name: 'training-detail', params: { id: row.training_id } }"
    class="training-card"
  >
    <div class="cover">
      <img v-if="cover" :src="cover" alt="" loading="lazy" @error="onCoverError" />
      <img v-else src="/favicon.svg" alt="" class="cover-placeholder" />
    </div>

    <div class="card-body">
      <h3 class="card-title">{{ row.title }}</h3>
      <p class="card-date">{{ formatDate(row.session_date) }}</p>

      <div class="card-tags">
        <UiBadge v-if="row.attended_in_person" tone="success">Asististe</UiBadge>
        <UiBadge v-if="row.exam_passed" tone="success">Examen aprobado</UiBadge>
        <UiBadge v-else-if="row.has_exam" tone="warning">Examen pendiente</UiBadge>
      </div>

      <div v-if="row.status !== 'pending'" class="card-progress">
        <div
          class="progress-bar"
          :class="{ 'is-complete': row.status === 'completed' }"
        >
          <span
            :style="{ width: `${Math.min(100, row.watch_percent ?? 0)}%` }"
          />
        </div>
        <span class="card-percent">
          {{ Math.round(row.watch_percent ?? 0) }}%
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
/* Tarjeta con portada: imagen arriba, texto abajo. Lo único que cambia al
   pasar el cursor es el color (borde y título). */
.training-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  background: var(--bg-surface);
  border: var(--rule);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.training-card:hover {
  border-color: var(--line-mid);
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--navy-050);
  border-bottom: var(--rule);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Sin portada ni video: se marca el hueco con la gota de la marca. */
.cover-placeholder {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  object-fit: contain;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 1rem 1.1rem 1.15rem;
  flex: 1;
}

.card-title {
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
  transition: color var(--transition-fast);
}

.training-card:hover .card-title {
  color: var(--clarvi-blue-ink);
}

.card-date {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.card-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.45rem;
}

.card-tags:empty {
  display: none;
}

/* El avance va al pie: barra fina y porcentaje, sin texto de más. */
.card-progress {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: auto;
  padding-top: 1rem;
}

.card-progress .progress-bar {
  flex: 1;
  min-width: 0;
}

.card-percent {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
