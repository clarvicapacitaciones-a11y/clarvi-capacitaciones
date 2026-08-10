<script setup lang="ts">
// Página de la capacitación. Dos modos según el momento:
//   · transmisión en vivo → reproductor del directo y presencia (quién la ve);
//   · grabación → reproductor con medición de avance, como siempre.
// El cambio de uno a otro es automático: al terminar la transmisión, la
// grabación queda publicada con el mismo video y la página se recarga sola.

import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import YoutubePlayer from '@/components/trainings/YoutubePlayer.vue'
import LiveYoutubePlayer from '@/components/trainings/LiveYoutubePlayer.vue'
import LiveViewersTable from '@/components/trainings/LiveViewersTable.vue'
import { FEATURES } from '@/config/features'
import { formatDate, formatDateTime } from '@/composables/useFormat'
import { coverImageUrl } from '@/composables/useTrainingCover'
import { getCertificateForTraining } from '@/services/certificates.service'
import { getExamStatus } from '@/services/exams.service'
import { finishLiveBroadcast, syncLiveState } from '@/services/live.service'
import {
  getMyAttendance,
  getMyProgress,
  getTraining,
} from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import { asLiveStatus } from '@/types/domain'
import type {
  Attendance,
  CertificateWithSnapshot,
  Training,
  WatchedRange,
  WatchProgress,
} from '@/types/domain'
import type { ExamStatus } from '@/types/exams'

/** Cada cuánto se le pregunta a YouTube si la transmisión empezó o terminó. */
const LIVE_SYNC_MS = 60_000

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const training = ref<Training | null>(null)
// shallowRef: el tipo Json recursivo de watched_ranges desborda la
// inferencia profunda de UnwrapRef en un ref normal.
const progress = shallowRef<WatchProgress | null>(null)
const attendance = ref<Attendance | null>(null)
const exam = ref<ExamStatus | null>(null)
// Emitido por la base de datos al acreditar; oculto hasta encender la bandera.
const certificate = ref<CertificateWithSnapshot | null>(null)
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

// ── Transmisión en vivo ────────────────────────────────────────────────────

const liveStatus = computed(() => asLiveStatus(training.value?.live_status))
const isLive = computed(
  () => liveStatus.value === 'en_vivo' && training.value?.live_video_id != null,
)
const isScheduled = computed(
  () => liveStatus.value === 'programada' && training.value?.live_enabled === true,
)

let liveTimer: number | null = null

/** Relee la capacitación para reflejar un cambio de estado de la transmisión. */
async function reloadTraining(): Promise<void> {
  training.value = await getTraining(String(route.params.id))
}

/**
 * Le pregunta al servidor en qué va la transmisión.
 *
 * Es lo que hace que esta página se entere sola: cuando el directo termina, la
 * grabación queda publicada con el mismo video y aquí aparece el reproductor
 * normal, sin que nadie recargue nada.
 */
async function syncLive(): Promise<void> {
  if (!training.value?.live_enabled) return
  try {
    const state = await syncLiveState(training.value.id)
    if (
      state.live_status !== training.value.live_status ||
      state.live_video_id !== training.value.live_video_id ||
      state.youtube_video_id !== training.value.youtube_video_id
    ) {
      await reloadTraining()
      if (!training.value?.live_enabled) stopLiveSync()
    }
  } catch {
    // Si la consulta falla se reintenta en el siguiente ciclo.
  }
}

function stopLiveSync(): void {
  if (liveTimer !== null) {
    window.clearInterval(liveTimer)
    liveTimer = null
  }
}

function startLiveSync(): void {
  if (liveTimer !== null || !training.value?.live_enabled) return
  liveTimer = window.setInterval(() => {
    if (!document.hidden) void syncLive()
  }, LIVE_SYNC_MS)
}

/**
 * El reproductor avisó que la transmisión terminó.
 *
 * Es el aviso más confiable que existe: el navegador de quien está viendo sí
 * ve YouTube sin restricciones. El servidor decide si lo acepta.
 */
async function onLiveEnded(): Promise<void> {
  if (!training.value) return
  try {
    const result = await finishLiveBroadcast(training.value.id)
    if (result.status === 'finalizada') {
      await reloadTraining()
      stopLiveSync()
      return
    }
  } catch {
    /* si no se acepta, la sincronización periódica lo resolverá */
  }
  void syncLive()
}

onMounted(async () => {
  const trainingId = String(route.params.id)
  try {
    training.value = await getTraining(trainingId)
    if (training.value?.live_enabled) {
      await syncLive()
      startLiveSync()
    }
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
      if (FEATURES.diplomas) {
        certificate.value = await getCertificateForTraining(
          trainingId,
          auth.userId,
        )
      }
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudo cargar la capacitación'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(stopLiveSync)

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

/** Vuelve al dashboard (o a la pantalla anterior si se llegó desde la app). */
function goBack(): void {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'dashboard' })
}

/** Portada para la ficha cuando todavía no hay video que mostrar. */
const cover = computed(() =>
  coverImageUrl(
    training.value?.cover_image_url,
    training.value?.youtube_video_id ?? training.value?.live_video_id,
  ),
)

function goToExam(): void {
  void router.push({ name: 'exam-runner', params: { id: String(route.params.id) } })
}
</script>

<template>
  <div class="page">
    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="form-error">{{ error }}</p>

    <template v-else-if="training">
      <button class="back-link" @click="goBack">← Mis capacitaciones</button>

      <header class="page-header">
        <div>
          <h1>{{ training.title }}</h1>
          <p class="muted">{{ formatDate(training.session_date) }}</p>
        </div>
        <div class="header-badges">
          <UiBadge v-if="isLive" tone="danger">En vivo ahora</UiBadge>
          <UiBadge v-else-if="isScheduled" tone="warning">
            Transmisión programada
          </UiBadge>
          <UiBadge v-if="attendance" tone="success">
            Asististe presencialmente
          </UiBadge>
          <UiBadge v-if="isCompleted" tone="success">Completada</UiBadge>
          <UiBadge v-if="exam?.passed" tone="success">Examen aprobado</UiBadge>
        </div>
      </header>

      <!-- Transmisión al aire: manda sobre la grabación. -->
      <template v-if="isLive && training.live_video_id">
        <LiveYoutubePlayer
          :video-id="training.live_video_id"
          :training-id="training.id"
          @ended="onLiveEnded"
        />
        <p class="muted live-note">
          Estás viendo la capacitación en vivo. Al terminar, la grabación queda
          disponible aquí mismo y el tiempo que estuviste conectado cuenta como
          avance.
        </p>

        <UiCard v-if="auth.isAdmin" class="live-admin-card">
          <LiveViewersTable :training-id="training.id" :is-live="true" />
        </UiCard>
      </template>

      <!-- Anunciada pero todavía sin empezar. -->
      <template v-else-if="isScheduled">
        <div v-if="cover" class="detail-cover">
          <img :src="cover" alt="" />
        </div>
        <div class="empty-state">
          <strong>La transmisión todavía no empieza</strong>
          <span v-if="training.live_scheduled_at">
            Está anunciada para el
            {{ formatDateTime(training.live_scheduled_at) }}. Deja esta página
            abierta: cuando empiece aparece aquí.
          </span>
          <span v-else>
            Deja esta página abierta: en cuanto el instructor abra la
            transmisión, aparece aquí.
          </span>
        </div>
      </template>

      <template v-else-if="training.youtube_video_id">
        <YoutubePlayer
          :video-id="training.youtube_video_id"
          :training-id="training.id"
          :initial-ranges="initialRanges"
          :initial-position="progress?.last_position_seconds ?? 0"
          :initial-duration="progress?.video_duration_seconds ?? 0"
          :is-completed="progress?.completed_at != null"
          @progress="onProgress"
        />

        <div class="watch-progress">
          <div class="progress-bar" :class="{ 'is-complete': isCompleted }">
            <span :style="{ width: `${Math.min(100, livePercent)}%` }" />
          </div>
          <span class="watch-percent">{{ Math.round(livePercent) }}%</span>
        </div>
      </template>

      <template v-else>
        <div v-if="cover" class="detail-cover">
          <img :src="cover" alt="" />
        </div>
        <div class="empty-state">
          <strong>El video aún no está disponible</strong>
          <span>
            Cuando el equipo suba la grabación de esta sesión podrás verla aquí.
          </span>
        </div>
      </template>

      <UiCard v-if="exam?.has_exam" class="exam-card">
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
        <UiButton :disabled="!exam.can_attempt" @click="goToExam">
          {{ examButtonLabel }}
        </UiButton>
      </UiCard>

      <UiCard v-if="FEATURES.diplomas && certificate" class="exam-card">
        <div class="exam-info">
          <h3>Diploma</h3>
          <p class="muted">
            Acreditaste esta capacitación · Folio {{ certificate.folio }}
          </p>
        </div>
        <RouterLink :to="{ name: 'diploma', params: { id: certificate.id } }">
          <UiButton>Ver diploma</UiButton>
        </RouterLink>
      </UiCard>

      <UiCard v-if="training.description" class="description-card">
        <h3>Acerca de esta capacitación</h3>
        <p class="description-text">{{ training.description }}</p>
      </UiCard>
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

.live-note {
  margin: 0.6rem 0 0;
}

.live-admin-card {
  margin-top: 1rem;
}

.detail-cover {
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 1rem;
  background: var(--navy-050);
}

.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Avance del video: barra fina y el porcentaje, nada más. */
.watch-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.watch-progress .progress-bar {
  flex: 1;
}

.watch-percent {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
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
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--clarvi-blue-ink);
  margin-top: 0.3rem;
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
