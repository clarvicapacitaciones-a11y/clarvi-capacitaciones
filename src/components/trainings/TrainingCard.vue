<script setup lang="ts">
// Tarjeta de curso: la pieza que más se repite en la plataforma.
//
// La miniatura va a sangre y el texto se apoya encima, sobre un degradado que
// lo asienta; no hay bloque de texto debajo de la imagen. Arriba a la derecha,
// la duración en píldora; abajo, el título y el estado (sin iniciar / barra de
// avance / chip de completado), que vive en UiCourseStatus para que la ficha
// del curso muestre exactamente lo mismo.
//
// Toda la tarjeta es un enlace: al pulsarla se retoma donde se quedó.

import { computed, ref, watchEffect } from 'vue'
import UiCourseStatus from '@/components/ui/UiCourseStatus.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { coverFallbackUrl, coverImageUrl } from '@/composables/useTrainingCover'
import type { TrainingStatus, TrainingStatusRow } from '@/types/domain'

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

const status = computed(
  () => (props.row.status ?? 'pending') as TrainingStatus,
)

/**
 * Duración en la píldora.
 *
 * Sale de `watch_progress`, que solo existe una vez que la persona abrió el
 * video: en un curso sin empezar todavía no se sabe cuánto dura, y entonces la
 * píldora no se pinta en lugar de mentir con un cero.
 */
const duration = computed(() => {
  const seconds = props.row.video_duration_seconds
  if (!seconds || seconds <= 0) return null
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  // Los minutos van a dos dígitos: "1 h 5" se lee como hora y media.
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
})

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
  <RouterLink
    :to="{ name: 'training-detail', params: { id: row.training_id } }"
    class="course-card"
  >
    <img
      v-if="cover"
      :src="cover"
      alt=""
      loading="lazy"
      class="cover"
      @error="onCoverError"
    />
    <!-- Sin portada ni video: la miniatura queda en oscuro con el icono de
         reproducción, para que el título de encima siga siendo legible. -->
    <span v-else class="cover cover-empty" aria-hidden="true">
      <UiIcon name="play" :size="34" :stroke="1.2" />
    </span>

    <span v-if="isLive || isScheduled" class="flag" :class="{ 'is-live': isLive }">
      <span v-if="isLive" class="flag-dot" aria-hidden="true" />
      <UiIcon v-else name="clock" :size="10" :stroke="2" />
      {{ isLive ? 'En vivo' : 'Programada' }}
    </span>

    <span v-if="duration" class="duration">{{ duration }}</span>

    <div class="overlay">
      <h3 class="card-title">{{ row.title }}</h3>
      <UiCourseStatus
        :status="status"
        :percent="row.watch_percent ?? 0"
        :title="row.title"
        on-cover
      />
    </div>
  </RouterLink>
</template>

<style scoped>
/* La tarjeta ES la miniatura: todo lo demás se apoya encima. */
.course-card {
  position: relative;
  display: block;
  aspect-ratio: 16 / 10.6;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface-1);
  border: 1px solid var(--line);
  color: inherit;
  transition:
    transform var(--transition-med),
    border-color var(--transition-med);
}

/* Único movimiento del sistema: 3px hacia arriba y el borde un paso más
   claro. Sin sombra, sin escala. */
.course-card:hover {
  transform: translateY(var(--hover-lift));
  border-color: var(--line-mid);
}

@media (prefers-reduced-motion: reduce) {
  .course-card:hover {
    transform: none;
  }
}

.cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* La zona de miniatura es superficie de medio: se queda oscura en los dos
   temas, porque el título que va encima siempre es blanco. */
.cover-empty {
  display: grid;
  place-items: center;
  background: var(--cover-empty);
  color: rgba(255, 255, 255, 0.3);
}

/* Píldora de duración, arriba a la derecha. */
.duration {
  position: absolute;
  top: var(--s-10);
  right: var(--s-10);
  padding: 3px var(--s-9);
  border-radius: var(--radius-xs);
  background: var(--cover-pill);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 10.5px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

/* Estado de transmisión, arriba a la izquierda. */
.flag {
  position: absolute;
  top: var(--s-10);
  left: var(--s-10);
  display: inline-flex;
  align-items: center;
  gap: var(--s-5);
  padding: 3px var(--s-9);
  border-radius: var(--radius-xs);
  background: var(--cover-pill);
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.6;
}

.flag.is-live {
  background: #c62828;
}

.flag-dot {
  width: 5px;
  height: 5px;
  border-radius: var(--radius-full);
  background: currentColor;
}

/* El texto se apoya sobre la imagen: el degradado le da suelo sin tapar la
   miniatura completa. */
.overlay {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-10);
  padding: 46px var(--s-14) var(--s-14);
  background: var(--cover-scrim);
}

.card-title {
  margin: 0;
  color: #ffffff;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.35;
  text-wrap: pretty;
  /* Dos líneas como máximo: los títulos largos no descuadran la rejilla. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
