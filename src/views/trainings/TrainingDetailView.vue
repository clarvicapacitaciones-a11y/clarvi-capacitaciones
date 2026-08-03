<script setup lang="ts">
// Página del video: reproductor con tracking + progreso propio.

import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassCard from '@/components/glass/GlassCard.vue'
import GlassBadge from '@/components/glass/GlassBadge.vue'
import YoutubePlayer from '@/components/trainings/YoutubePlayer.vue'
import { formatDate, formatMinutes } from '@/composables/useFormat'
import { getExamStatus } from '@/services/exams.service'
import {
  getMyAttendance,
  getMyProgress,
  getTraining,
} from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  Attendance,
  Training,
  WatchedRange,
  WatchProgress,
} from '@/types/domain'
import type { ExamStatus } from '@/types/exams'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const training = ref<Training | null>(null)
// shallowRef: el tipo Json recursivo de watched_ranges desborda la
// inferencia profunda de UnwrapRef en un ref normal.
const progress = shallowRef<WatchProgress | null>(null)
const attendance = ref<Attendance | null>(null)
const exam = ref<ExamStatus | null>(null)
const loading = ref(true)
const error = ref('')

const livePercent = ref(0)
const liveSeconds = ref(0)

const initialRanges = computed<WatchedRange[]>(() => {
  const raw = progress.value?.watched_ranges
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is [number, number] =>
      Array.isArray(item) &&
      item.length === 2 &&
      typeof item[0] === 'number' &&
      typeof item[1] === 'number',
  )
})

const isCompleted = computed(
  () => progress.value?.completed_at != null || livePercent.value >= 90,
)

onMounted(async () => {
  const trainingId = String(route.params.id)
  try {
    training.value = await getTraining(trainingId)
    if (training.value && auth.userId) {
      const [progressRow, attendanceRow, examStatus] = await Promise.all([
        getMyProgress(trainingId, auth.userId),
        getMyAttendance(trainingId, auth.userId),
        getExamStatus(trainingId),
      ])
      progress.value = progressRow
      attendance.value = attendanceRow
      exam.value = examStatus
      livePercent.value = progressRow?.watch_percent ?? 0
      liveSeconds.value = progressRow?.watched_seconds ?? 0
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudo cargar la capacitación'
  } finally {
    loading.value = false
  }
})

function onProgress(percent: number, seconds: number): void {
  livePercent.value = Math.max(livePercent.value, percent)
  liveSeconds.value = Math.max(liveSeconds.value, seconds)
}

/** Por qué no se puede aplicar el examen ahora mismo. */
const examBlockMessage = computed(() => {
  switch (exam.value?.block_reason) {
    case 'video_incomplete':
      return 'Disponible cuando termines de ver el video.'
    case 'no_attempts_left':
      return 'Ya usaste todos tus intentos.'
    case 'not_published':
      return 'Todavía no está publicado (solo tú lo ves, como administrador).'
    default:
      return ''
  }
})

const examButtonLabel = computed(() => {
  if (exam.value?.open_attempt_id) return 'Continuar examen'
  return (exam.value?.attempts_used ?? 0) > 0 ? 'Repetir examen' : 'Aplicar examen'
})

function goToExam(): void {
  void router.push({ name: 'exam-runner', params: { id: String(route.params.id) } })
}
</script>

<template>
  <div class="page">
    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="form-error">{{ error }}</p>

    <template v-else-if="training">
      <header class="page-header">
        <div>
          <h1>{{ training.title }}</h1>
          <p class="muted">{{ formatDate(training.session_date) }}</p>
        </div>
        <div class="header-badges">
          <GlassBadge v-if="attendance" tone="success">
            Asististe presencialmente ✓
          </GlassBadge>
          <GlassBadge v-if="isCompleted" tone="success">Completada ✓</GlassBadge>
          <GlassBadge v-if="exam?.passed" tone="success">
            Examen aprobado ✓
          </GlassBadge>
        </div>
      </header>

      <template v-if="training.youtube_video_id">
        <YoutubePlayer
          :video-id="training.youtube_video_id"
          :training-id="training.id"
          :initial-ranges="initialRanges"
          :initial-position="progress?.last_position_seconds ?? 0"
          :initial-duration="progress?.video_duration_seconds ?? 0"
          :is-completed="progress?.completed_at != null"
          @progress="onProgress"
        />

        <GlassCard class="progress-card">
          <div class="progress-info">
            <div>
              <strong>{{ Math.round(livePercent) }}%</strong>
              <span class="muted"> visto</span>
            </div>
            <span class="muted">{{ formatMinutes(liveSeconds) }} de video</span>
          </div>
          <div class="progress-bar" :class="{ 'is-complete': isCompleted }">
            <span :style="{ width: `${Math.min(100, livePercent)}%` }" />
          </div>
          <p class="muted progress-note">
            Tu avance se guarda automáticamente. Al llegar al 90% la
            capacitación se marca como completada.
          </p>
        </GlassCard>
      </template>

      <GlassCard v-else class="progress-card">
        <div class="empty-state">
          <strong>El video aún no está disponible</strong>
          <span>
            Cuando el equipo suba la grabación de esta sesión podrás verla aquí.
          </span>
        </div>
      </GlassCard>

      <GlassCard v-if="exam?.has_exam" class="exam-card">
        <div class="exam-info">
          <h3>{{ exam.title || 'Examen de la capacitación' }}</h3>
          <p class="muted">
            {{ exam.question_count }}
            {{ exam.question_count === 1 ? 'pregunta' : 'preguntas' }} · se
            aprueba con {{ exam.passing_percent }}%
            <template v-if="exam.max_attempts">
              · {{ exam.attempts_used }} de {{ exam.max_attempts }} intentos
            </template>
          </p>
          <p v-if="(exam.attempts_used ?? 0) > 0" class="exam-best">
            Tu mejor calificación: {{ Math.round(exam.best_percent ?? 0) }}%
          </p>
          <p v-if="examBlockMessage" class="muted exam-block">
            {{ examBlockMessage }}
          </p>
        </div>
        <GlassButton :disabled="!exam.can_attempt" @click="goToExam">
          {{ examButtonLabel }}
        </GlassButton>
      </GlassCard>

      <GlassCard v-if="training.description" class="description-card">
        <h3>Acerca de esta capacitación</h3>
        <p class="description-text">{{ training.description }}</p>
      </GlassCard>
    </template>

    <div v-else class="empty-state">
      <strong>Capacitación no encontrada</strong>
    </div>
  </div>
</template>

<style scoped>
.header-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.progress-card {
  margin-top: 1rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.progress-info strong {
  font-size: 1.4rem;
  color: var(--clarvi-navy);
}

.progress-note {
  margin: 0.6rem 0 0;
  font-size: 0.8rem;
}

.exam-card {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.exam-info h3 {
  margin: 0 0 0.2rem;
}

.exam-info p {
  margin: 0;
}

.exam-best {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--clarvi-blue);
  margin-top: 0.2rem;
}

.exam-block {
  font-size: 0.82rem;
  margin-top: 0.2rem;
}

.description-card {
  margin-top: 1rem;
}

.description-text {
  white-space: pre-line;
  margin: 0;
}
</style>
