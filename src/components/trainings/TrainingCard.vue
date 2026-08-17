<script setup lang="ts">
// Tarjeta de una capacitación. Es la pieza que más se repite en la
// plataforma, así que se arma con el kit (UiCard, UiBadge, UiProgress,
// UiIcon) y no con estilos propios: al cambiar el kit, cambian todas.
//
// Qué muestra y en qué orden: la portada, el título, cuándo fue y lo que la
// sección no alcanza a decir (asistencia, examen). El estado de avance va
// abajo, como remate.

import { computed, ref, watchEffect } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiProgress from '@/components/ui/UiProgress.vue'
import { formatDate, formatMinutes } from '@/composables/useFormat'
import { coverFallbackUrl, coverImageUrl } from '@/composables/useTrainingCover'
import type { TrainingStatusRow } from '@/types/domain'

const props = defineProps<{ row: TrainingStatusRow }>()

const cover = ref<string | null>(null)
watchEffect(() => {
  // En una transmisión todavía no hay grabación, así que la portada sale de
  // la miniatura del directo.
  cover.value = coverImageUrl(
    props.row.cover_image_url,
    props.row.youtube_video_id ?? props.row.live_video_id,
  )
})

const isLive = computed(() => props.row.live_status === 'en_vivo')
const isScheduled = computed(() => props.row.live_status === 'programada')
const isPending = computed(() => props.row.status === 'pending')

const percent = computed(() => Math.round(props.row.watch_percent ?? 0))

/**
 * Pie de la tarjeta. Una capacitación sin empezar no necesita una barra en
 * cero: lo útil ahí es decir cuánto dura y que se puede entrar.
 */
const duration = computed(() =>
  props.row.video_duration_seconds
    ? formatMinutes(props.row.video_duration_seconds)
    : null,
)

/** Si la miniatura grande de YouTube no existe, se intenta con la chica. */
function onCoverError(): void {
  cover.value = cover.value
    ? coverFallbackUrl(
        cover.value,
        props.row.youtube_video_id ?? props.row.live_video_id,
      )
    : null
}
</script>

<template>
  <UiCard
    :to="{ name: 'training-detail', params: { id: row.training_id } }"
    padding="none"
    interactive
    class="training-card"
    :class="{ 'is-live': isLive }"
  >
    <div class="cover">
      <img v-if="cover" :src="cover" alt="" loading="lazy" @error="onCoverError" />
      <!-- Sin portada ni video: la marca del hueco es un icono del sistema,
           no el logo. -->
      <span v-else class="cover-placeholder" aria-hidden="true">
        <UiIcon name="play" :size="30" :stroke="1.3" />
      </span>

      <span v-if="isLive || isScheduled" class="cover-badge">
        <UiBadge v-if="isLive" tone="danger" variant="solid" dot>En vivo</UiBadge>
        <UiBadge v-else tone="warning" variant="solid" icon="clock">
          Programada
        </UiBadge>
      </span>
    </div>

    <div class="card-body">
      <h3 class="card-title">{{ row.title }}</h3>

      <p class="card-meta">
        <UiIcon name="calendar" :size="14" />
        <span>{{ formatDate(row.session_date) }}</span>
        <template v-if="duration">
          <span class="meta-sep" aria-hidden="true" />
          <span>{{ duration }}</span>
        </template>
      </p>

      <div class="card-tags">
        <UiBadge v-if="row.attended_in_person" tone="success" icon="check">
          Asististe
        </UiBadge>
        <UiBadge v-if="row.exam_passed" tone="success" icon="award">
          Examen aprobado
        </UiBadge>
        <UiBadge v-else-if="row.has_exam" tone="warning" icon="alert">
          Examen pendiente
        </UiBadge>
      </div>

      <div class="card-foot">
        <UiProgress
          v-if="!isPending"
          :value="percent"
          show-value
          :label="`Avance de ${row.title ?? 'la capacitación'}`"
        />
        <span v-else class="card-cta">
          Comenzar
          <UiIcon name="arrow-right" :size="14" />
        </span>
      </div>
    </div>
  </UiCard>
</template>

<style scoped>
/* La tarjeta es una columna: portada arriba, texto abajo y el avance pegado
   al pie aunque los títulos midan distinto. Lo único que cambia al pasar el
   cursor es el color. */
.training-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Al aire: la tarjeta se marca con el borde, no con un fondo distinto. */
.training-card.is-live {
  border-color: var(--state-danger);
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--surface-2);
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

.cover-placeholder {
  display: grid;
  place-items: center;
  color: var(--text-muted);
}

.cover-badge {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.95rem 1.05rem 1.05rem;
  flex: 1;
}

.card-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-strong);
  /* Dos líneas como máximo: los títulos largos no descuadran la rejilla. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color var(--transition-fast);
}

.training-card:hover .card-title {
  color: var(--accent-ink);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.83rem;
}

.meta-sep {
  width: 3px;
  height: 3px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.card-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.card-tags:empty {
  display: none;
}

/* El pie se empuja al fondo: todas las tarjetas de una fila rematan igual. */
.card-foot {
  margin-top: auto;
  padding-top: 0.9rem;
}

.card-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-ink);
  font-size: 0.85rem;
  font-weight: 500;
}
</style>
