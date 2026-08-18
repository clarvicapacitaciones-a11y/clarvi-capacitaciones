<script setup lang="ts">
// Ficha completa de una capacitación: QR de asistencia, video,
// lista de asistentes presenciales y avance de visualización por usuario.

import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import UiBackLink from '@/components/ui/UiBackLink.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiModal from '@/components/ui/UiModal.vue'
import QrCodeDisplay from '@/components/trainings/QrCodeDisplay.vue'
import LiveViewersTable from '@/components/trainings/LiveViewersTable.vue'
import UiInput from '@/components/ui/UiInput.vue'
import {
  formatDate,
  formatDateTime,
  formatMinutes,
  formatPercent,
} from '@/composables/useFormat'
import {
  cancelLiveBroadcast,
  finishLiveBroadcast,
  probeLiveUrl,
  startLiveBroadcast,
  syncLiveState,
} from '@/services/live.service'
import {
  getExamForEdit,
  listExamAttempts,
  questionStats,
  summarizeByExaminee,
} from '@/services/exams.service'
import {
  getTraining,
  listAttendance,
  listViewers,
  regenerateQrToken,
} from '@/services/trainings.service'
import { asLiveStatus, LIVE_STATUS_LABELS } from '@/types/domain'
import type {
  AttendanceWithProfile,
  Training,
  ViewerProgress,
} from '@/types/domain'
import {
  QUESTION_TYPE_LABELS,
  type ExamDraft,
  type ExamineeSummary,
  type QuestionStat,
} from '@/types/exams'

const route = useRoute()

const training = ref<Training | null>(null)
const attendance = ref<AttendanceWithProfile[]>([])
// shallowRef: el tipo Json recursivo de watched_ranges desborda la
// inferencia profunda de UnwrapRef en un ref normal.
const viewers = shallowRef<ViewerProgress[]>([])
const exam = ref<ExamDraft | null>(null)
const examinees = ref<ExamineeSummary[]>([])
const stats = ref<QuestionStat[]>([])
const loading = ref(true)
const error = ref('')

const showRegenerateModal = ref(false)
const regenerating = ref(false)

// Quién está viendo la grabación en este momento: `upsert_watch_progress`
// escribe cada ~15 s mientras se reproduce, así que un latido de hace menos de
// 90 segundos significa que esa persona está viendo el video ahora mismo.
const viewersRefreshedAt = ref(Date.now())
let viewersTimer: number | null = null

function isWatchingRecording(viewer: ViewerProgress): boolean {
  return viewersRefreshedAt.value - Date.parse(viewer.last_heartbeat_at) < 90_000
}

const watchingRecordingCount = computed(
  () => viewers.value.filter(isWatchingRecording).length,
)

const completedCount = computed(
  () => viewers.value.filter((viewer) => viewer.completed_at !== null).length,
)

const averagePercent = computed(() => {
  if (viewers.value.length === 0) return 0
  const total = viewers.value.reduce(
    (sum, viewer) => sum + (viewer.watch_percent ?? 0),
    0,
  )
  return total / viewers.value.length
})

const examPassedCount = computed(
  () => examinees.value.filter((row) => row.passed).length,
)

const examAveragePercent = computed(() => {
  if (examinees.value.length === 0) return 0
  const total = examinees.value.reduce((sum, row) => sum + row.bestPercent, 0)
  return total / examinees.value.length
})

const examPassRate = computed(() =>
  examinees.value.length === 0
    ? 0
    : (examPassedCount.value / examinees.value.length) * 100,
)

onMounted(async () => {
  const id = String(route.params.id)
  try {
    const [trainingRow, attendanceRows, viewerRows, examDraft] = await Promise.all([
      getTraining(id),
      listAttendance(id),
      listViewers(id),
      getExamForEdit(id),
    ])
    training.value = trainingRow
    attendance.value = attendanceRows
    viewers.value = viewerRows
    exam.value = examDraft
    liveSourceUrl.value = trainingRow?.live_source_url ?? ''
    if (trainingRow?.live_enabled) {
      void refreshLive(false)
      startLivePolling()
    }

    if (examDraft?.id) {
      const attempts = await listExamAttempts(examDraft.id)
      examinees.value = summarizeByExaminee(attempts)
      stats.value = await questionStats(attempts.map((row) => row.id))
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar'
  } finally {
    loading.value = false
  }
})

// La lista de quién ve la grabación se mantiene fresca mientras la ficha esté
// abierta: sin esto, "viendo ahora" sería una foto del momento de cargar.
onMounted(() => {
  viewersTimer = window.setInterval(async () => {
    if (document.hidden || !training.value) return
    try {
      viewers.value = await listViewers(training.value.id)
      viewersRefreshedAt.value = Date.now()
    } catch {
      /* un refresco perdido no rompe la pantalla */
    }
  }, 30_000)
})

onBeforeUnmount(() => {
  stopLivePolling()
  if (viewersTimer !== null) window.clearInterval(viewersTimer)
})

// ── Transmisión en vivo ────────────────────────────────────────────────────

const liveSourceUrl = ref('')
const liveBusy = ref('')
const liveError = ref('')
const liveMessage = ref('')

const liveStatus = computed(() => asLiveStatus(training.value?.live_status))
const isLive = computed(() => liveStatus.value === 'en_vivo')
const liveEnabled = computed(() => training.value?.live_enabled === true)

const liveTone = computed(() => {
  if (isLive.value) return 'danger' as const
  if (liveStatus.value === 'programada') return 'warning' as const
  if (liveStatus.value === 'finalizada') return 'success' as const
  return 'neutral' as const
})

let liveTimer: number | null = null

/** Mientras la transmisión esté encendida, la ficha se mantiene al día sola. */
function startLivePolling(): void {
  if (liveTimer !== null) return
  liveTimer = window.setInterval(() => {
    if (!document.hidden && liveEnabled.value) void refreshLive(false)
  }, 20_000)
}

function stopLivePolling(): void {
  if (liveTimer !== null) {
    window.clearInterval(liveTimer)
    liveTimer = null
  }
}

async function reloadTraining(): Promise<void> {
  if (!training.value) return
  const fresh = await getTraining(training.value.id)
  if (fresh) training.value = fresh
  if (!fresh?.live_enabled) stopLivePolling()
}

async function refreshLive(force: boolean): Promise<void> {
  if (!training.value) return
  liveError.value = ''
  if (force) liveBusy.value = 'sync'
  try {
    await syncLiveState(training.value.id, force)
    await reloadTraining()
  } catch (err) {
    liveError.value =
      err instanceof Error ? err.message : 'No se pudo consultar la transmisión'
  } finally {
    liveBusy.value = ''
  }
}

async function activateLive(): Promise<void> {
  if (!training.value) return
  liveError.value = ''
  liveMessage.value = ''
  if (!liveSourceUrl.value.trim()) {
    liveError.value = 'Pega el link del canal o de la transmisión.'
    return
  }
  liveBusy.value = 'start'
  try {
    await startLiveBroadcast(training.value.id, liveSourceUrl.value)
    await refreshLive(true)
    startLivePolling()
  } catch (err) {
    liveError.value = err instanceof Error ? err.message : 'No se pudo activar'
  } finally {
    liveBusy.value = ''
  }
}

async function stopLive(): Promise<void> {
  if (!training.value) return
  liveBusy.value = 'cancel'
  try {
    await cancelLiveBroadcast(training.value.id)
    await reloadTraining()
  } catch (err) {
    liveError.value = err instanceof Error ? err.message : 'No se pudo apagar'
  } finally {
    liveBusy.value = ''
  }
}

async function publishRecording(): Promise<void> {
  if (!training.value) return
  liveError.value = ''
  liveBusy.value = 'finish'
  try {
    const result = await finishLiveBroadcast(training.value.id)
    if (result.status === 'finalizada') {
      liveMessage.value = result.credited
        ? `Grabación publicada. Se acreditó el tiempo de ${result.credited} ${
            result.credited === 1 ? 'persona' : 'personas'
          }.`
        : 'Grabación publicada.'
      await reloadTraining()
      viewers.value = await listViewers(training.value.id)
    } else {
      liveError.value = 'La transmisión ya no estaba al aire.'
      await reloadTraining()
    }
  } catch (err) {
    liveError.value = err instanceof Error ? err.message : 'No se pudo finalizar'
  } finally {
    liveBusy.value = ''
  }
}

/** Lee el link y reporta qué hay, sin guardar nada. */
async function testLiveUrl(): Promise<void> {
  liveError.value = ''
  liveMessage.value = ''
  liveBusy.value = 'probe'
  try {
    const probe = await probeLiveUrl(liveSourceUrl.value)
    const parts = [`Estado: ${LIVE_STATUS_LABELS[probe.info.status]}`]
    if (probe.info.videoId) parts.push(`video ${probe.info.videoId}`)
    if (probe.info.title) parts.push(`“${probe.info.title}”`)
    if (probe.info.error) parts.push(probe.info.error)
    liveMessage.value = parts.join(' · ')
  } catch (err) {
    liveError.value = err instanceof Error ? err.message : 'No se pudo leer'
  } finally {
    liveBusy.value = ''
  }
}

async function confirmRegenerate(): Promise<void> {
  if (!training.value) return
  regenerating.value = true
  try {
    const newToken = await regenerateQrToken(training.value.id)
    training.value = { ...training.value, qr_token: newToken }
    showRegenerateModal.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo regenerar'
  } finally {
    regenerating.value = false
  }
}
</script>

<template>
  <div>
    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="form-error">{{ error }}</p>

    <template v-else-if="training">
      <UiBackLink label="Capacitaciones" :to="{ name: 'admin-trainings' }" />

      <header class="page-header">
        <div>
          <h1>{{ training.title }}</h1>
          <p class="muted">{{ formatDate(training.session_date) }}</p>
        </div>
        <RouterLink
          :to="{ name: 'admin-training-edit', params: { id: training.id } }"
        >
          <UiButton variant="ghost">Editar</UiButton>
        </RouterLink>
      </header>

      <div class="stats-row">
        <UiCard class="stat">
          <strong>{{ attendance.length }}</strong>
          <span>Asistieron presencial</span>
        </UiCard>
        <UiCard class="stat">
          <strong>{{ viewers.length }}</strong>
          <span>Han visto el video</span>
        </UiCard>
        <UiCard class="stat">
          <strong>{{ completedCount }}</strong>
          <span>Completaron</span>
        </UiCard>
        <UiCard class="stat">
          <strong>{{ formatPercent(averagePercent) }}</strong>
          <span>Avance promedio</span>
        </UiCard>
      </div>

      <div class="two-col">
        <UiCard>
          <h3>Código QR de asistencia</h3>
          <p class="muted">
            Proyéctalo o imprímelo en la sesión presencial; cada persona lo
            escanea con su teléfono para registrar su asistencia.
          </p>
          <QrCodeDisplay
            :token="training.qr_token"
            :training-title="training.title"
          />
          <div class="regenerate-row">
            <UiButton variant="danger" @click="showRegenerateModal = true">
              Regenerar código
            </UiButton>
          </div>
        </UiCard>

        <UiCard>
          <h3>Video</h3>
          <template v-if="training.youtube_video_id">
            <div class="video-frame">
              <iframe
                :src="`https://www.youtube.com/embed/${training.youtube_video_id}`"
                title="Video de la capacitación"
                allowfullscreen
              />
            </div>
            <p class="muted video-id">ID: {{ training.youtube_video_id }}</p>
          </template>
          <div v-else class="empty-state">
            <strong>Sin video todavía</strong>
            <span>
              Cuando el video esté editado y subido a YouTube, agrégalo desde
              “Editar”. Los usuarios lo verán como pendiente en su dashboard.
            </span>
          </div>
        </UiCard>
      </div>

      <UiCard class="table-card">
        <header class="live-header">
          <div>
            <h3>
              Transmisión en vivo
              <UiBadge :tone="liveTone">
                {{ LIVE_STATUS_LABELS[liveStatus] }}
              </UiBadge>
            </h3>
            <p class="muted">
              Abre la transmisión en YouTube (como <strong>no listada</strong>)
              y actívala aquí. La plataforma la embebe, registra quién la ve y,
              al terminar, publica la grabación sola.
            </p>
          </div>
          <UiButton
            v-if="liveEnabled"
            variant="ghost"
            :loading="liveBusy === 'sync'"
            @click="refreshLive(true)"
          >
            Sincronizar ahora
          </UiButton>
        </header>

        <UiInput
          v-model="liveSourceUrl"
          label="Canal o link de la transmisión"
          placeholder="https://www.youtube.com/@tucanal  ·  https://youtu.be/…"
          hint="Del canal se lee lo que esté transmitiendo; del link del directo, ese video."
        />

        <div class="live-actions">
          <UiButton
            v-if="!liveEnabled"
            :loading="liveBusy === 'start'"
            @click="activateLive"
          >
            Activar transmisión
          </UiButton>
          <template v-else>
            <UiButton
              :disabled="!isLive"
              :loading="liveBusy === 'finish'"
              @click="publishRecording"
            >
              Finalizar y publicar grabación
            </UiButton>
            <UiButton
              variant="ghost"
              :loading="liveBusy === 'cancel'"
              @click="stopLive"
            >
              Apagar transmisión
            </UiButton>
          </template>
          <UiButton
            variant="ghost"
            :disabled="!liveSourceUrl"
            :loading="liveBusy === 'probe'"
            @click="testLiveUrl"
          >
            Probar link
          </UiButton>
        </div>

        <p v-if="liveError" class="form-error">{{ liveError }}</p>
        <p v-if="liveMessage" class="live-message">{{ liveMessage }}</p>

        <dl v-if="liveEnabled || training.live_video_id" class="live-facts">
          <div v-if="training.live_video_id">
            <dt>Video del directo</dt>
            <dd>{{ training.live_video_id }}</dd>
          </div>
          <div v-if="training.live_title">
            <dt>Título en YouTube</dt>
            <dd>{{ training.live_title }}</dd>
          </div>
          <div v-if="training.live_scheduled_at">
            <dt>Anunciada para</dt>
            <dd>{{ formatDateTime(training.live_scheduled_at) }}</dd>
          </div>
          <div v-if="training.live_started_at">
            <dt>Empezó</dt>
            <dd>{{ formatDateTime(training.live_started_at) }}</dd>
          </div>
          <div v-if="training.live_ended_at">
            <dt>Terminó</dt>
            <dd>{{ formatDateTime(training.live_ended_at) }}</dd>
          </div>
          <div v-if="training.live_checked_at">
            <dt>Última consulta</dt>
            <dd>{{ formatDateTime(training.live_checked_at) }}</dd>
          </div>
        </dl>

        <p v-if="training.live_error" class="muted live-warning">
          {{ training.live_error }}
        </p>

        <div v-if="liveEnabled || training.live_started_at" class="live-viewers">
          <LiveViewersTable :training-id="training.id" :is-live="isLive" />
        </div>
      </UiCard>

      <UiCard class="table-card">
        <h3>Asistencia presencial ({{ attendance.length }})</h3>
        <div v-if="attendance.length" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Área</th>
                <th>Sucursal</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in attendance" :key="row.id">
                <td>{{ row.profiles?.full_name ?? '—' }}</td>
                <td>{{ row.areas?.nombre ?? '—' }}</td>
                <td>{{ row.sucursales?.nombre ?? '—' }}</td>
                <td>{{ formatDateTime(row.scanned_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted">Nadie ha escaneado el QR todavía.</p>
      </UiCard>

      <UiCard class="table-card">
        <h3>
          Visualización del video ({{ viewers.length }})
          <UiBadge v-if="watchingRecordingCount" tone="info">
            {{ watchingRecordingCount }} viendo ahora
          </UiBadge>
        </h3>
        <div v-if="viewers.length" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Área</th>
                <th>Sucursal</th>
                <th>Avance</th>
                <th>Tiempo visto</th>
                <th>Completada</th>
                <th>Última actividad</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="viewer in viewers" :key="viewer.id">
                <td>{{ viewer.profiles?.full_name ?? '—' }}</td>
                <td>{{ viewer.profiles?.areas?.nombre ?? '—' }}</td>
                <td>{{ viewer.profiles?.sucursales?.nombre ?? '—' }}</td>
                <td>
                  <div class="percent-cell">
                    <div
                      class="progress-bar"
                      :class="{ 'is-complete': viewer.completed_at !== null }"
                    >
                      <span
                        :style="{
                          width: `${Math.min(100, viewer.watch_percent ?? 0)}%`,
                        }"
                      />
                    </div>
                    <span class="percent-label">
                      {{ formatPercent(viewer.watch_percent) }}
                    </span>
                  </div>
                </td>
                <td>{{ formatMinutes(viewer.watched_seconds) }}</td>
                <td>
                  <UiBadge v-if="viewer.completed_at" tone="success">
                    {{ formatDateTime(viewer.completed_at) }}
                  </UiBadge>
                  <span v-else class="muted">—</span>
                </td>
                <td>
                  <UiBadge v-if="isWatchingRecording(viewer)" tone="info">
                    Viendo ahora
                  </UiBadge>
                  <template v-else>
                    {{ formatDateTime(viewer.last_heartbeat_at) }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted">
          Nadie ha reproducido el video todavía
          {{ training.youtube_video_id ? '' : '(aún no hay video publicado)' }}.
        </p>
      </UiCard>

      <UiCard class="table-card">
        <header class="exam-header">
          <div>
            <h3>
              Examen
              <UiBadge v-if="exam && !exam.is_published" tone="warning">
                Sin publicar
              </UiBadge>
              <UiBadge v-else-if="exam" tone="success">Publicado</UiBadge>
            </h3>
            <p v-if="exam" class="muted">
              {{ exam.questions.length }}
              {{ exam.questions.length === 1 ? 'pregunta' : 'preguntas' }} · se
              aprueba con {{ exam.passing_percent }}%
              <template v-if="exam.max_attempts">
                · máximo {{ exam.max_attempts }}
                {{ exam.max_attempts === '1' ? 'intento' : 'intentos' }}
              </template>
              <template v-else> · intentos ilimitados</template>
            </p>
          </div>
          <RouterLink
            :to="{ name: 'admin-training-edit', params: { id: training.id } }"
          >
            <UiButton variant="ghost">
              {{ exam ? 'Editar examen' : 'Crear examen' }}
            </UiButton>
          </RouterLink>
        </header>

        <template v-if="exam">
          <div class="stats-row exam-stats">
            <UiCard class="stat">
              <strong>{{ examinees.length }}</strong>
              <span>Lo presentaron</span>
            </UiCard>
            <UiCard class="stat">
              <strong>{{ examPassedCount }}</strong>
              <span>Aprobaron</span>
            </UiCard>
            <UiCard class="stat">
              <strong>{{ formatPercent(examAveragePercent) }}</strong>
              <span>Calificación promedio</span>
            </UiCard>
            <UiCard class="stat">
              <strong>{{ formatPercent(examPassRate) }}</strong>
              <span>Tasa de aprobación</span>
            </UiCard>
          </div>

          <div v-if="examinees.length" class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Sucursal</th>
                  <th>Intentos</th>
                  <th>Mejor calificación</th>
                  <th>Resultado</th>
                  <th>Último intento</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in examinees" :key="row.userId">
                  <td>{{ row.fullName }}</td>
                  <td>{{ row.area }}</td>
                  <td>{{ row.sucursal }}</td>
                  <td>{{ row.attempts }}</td>
                  <td>
                    <div class="percent-cell">
                      <div
                        class="progress-bar"
                        :class="{ 'is-complete': row.passed }"
                      >
                        <span
                          :style="{ width: `${Math.min(100, row.bestPercent)}%` }"
                        />
                      </div>
                      <span class="percent-label">
                        {{ formatPercent(row.bestPercent) }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <UiBadge :tone="row.passed ? 'success' : 'danger'">
                      {{ row.passed ? 'Aprobado' : 'No aprobado' }}
                    </UiBadge>
                  </td>
                  <td>{{ formatDateTime(row.lastSubmittedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="muted">
            Nadie ha presentado el examen todavía
            {{ exam.is_published ? '' : '(aún no está publicado)' }}.
          </p>

          <template v-if="stats.length">
            <h4 class="subsection">Dificultad por pregunta</h4>
            <p class="muted subsection-note">
              De menor a mayor acierto: las primeras son los temas que menos se
              entendieron.
            </p>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Pregunta</th>
                    <th>Tipo</th>
                    <th>Aciertos</th>
                    <th>% de acierto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in stats" :key="stat.questionId">
                    <td>{{ stat.prompt }}</td>
                    <td>{{ QUESTION_TYPE_LABELS[stat.type] }}</td>
                    <td>{{ stat.correct }} de {{ stat.answered }}</td>
                    <td>
                      <div class="percent-cell">
                        <div
                          class="progress-bar"
                          :class="{ 'is-complete': stat.accuracy >= 80 }"
                        >
                          <span :style="{ width: `${stat.accuracy}%` }" />
                        </div>
                        <span class="percent-label">
                          {{ formatPercent(stat.accuracy) }}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </template>

        <div v-else class="empty-state">
          <strong>Esta capacitación no tiene examen</strong>
          <span>
            Agrégalo desde “Editar”: ahí se capturan las preguntas y sus
            respuestas.
          </span>
        </div>
      </UiCard>

      <UiModal
        :open="showRegenerateModal"
        title="Regenerar código QR"
        @close="showRegenerateModal = false"
      >
        <p>
          Se generará un código nuevo y
          <strong>el QR impreso anterior dejará de funcionar</strong>. La
          asistencia ya registrada no se pierde. ¿Continuar?
        </p>
        <template #footer>
          <UiButton variant="ghost" @click="showRegenerateModal = false">
            Cancelar
          </UiButton>
          <UiButton
            variant="danger"
            :loading="regenerating"
            @click="confirmRegenerate"
          >
            Regenerar
          </UiButton>
        </template>
      </UiModal>
    </template>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
}

/* Indicador: la cifra pesa, la etiqueta se queda discreta. */
.stat {
  padding: 1.1rem 1.2rem;
}

.stat strong {
  display: block;
  font-size: 1.7rem;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--text-strong);
}

.stat span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.regenerate-row {
  margin-top: 0.9rem;
  display: flex;
  justify-content: center;
}

.video-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000;
}

.video-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.video-id {
  margin-top: 0.5rem;
  font-size: 0.78rem;
}

.table-card {
  margin-bottom: 1rem;
}

/* ── Transmisión en vivo ── */

.live-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.9rem;
}

.live-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.2rem;
}

.live-header p {
  margin: 0;
  max-width: 62ch;
}

.live-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.9rem;
}

.live-message {
  margin: 0.8rem 0 0;
  font-size: 0.85rem;
  color: var(--clarvi-blue-ink);
}

.live-warning {
  margin: 0.8rem 0 0;
  font-size: 0.82rem;
}

.live-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.7rem 1.2rem;
  margin: 1.1rem 0 0;
  padding-top: 1rem;
  border-top: var(--rule);
}

.live-facts dt {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.live-facts dd {
  margin: 0.1rem 0 0;
  font-size: 0.9rem;
  color: var(--text-strong);
  word-break: break-word;
}

.live-viewers {
  margin-top: 1.4rem;
  padding-top: 1.2rem;
  border-top: var(--rule);
}

.percent-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.percent-label {
  font-size: 0.82rem;
  color: var(--text-muted);
  min-width: 38px;
  font-variant-numeric: tabular-nums;
}

.exam-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.exam-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.2rem;
}

.exam-header p {
  margin: 0;
}

.exam-stats {
  margin-top: 0.8rem;
}

.subsection {
  margin: 1.75rem 0 0.4rem;
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--text-strong);
}

.subsection-note {
  margin: 0 0 0.6rem;
  font-size: 0.82rem;
}
</style>
