<script setup lang="ts">
// Ficha completa de una capacitación: QR de asistencia, video,
// lista de asistentes presenciales y avance de visualización por usuario.

import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import GlassBadge from '@/components/glass/GlassBadge.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassCard from '@/components/glass/GlassCard.vue'
import GlassModal from '@/components/glass/GlassModal.vue'
import QrCodeDisplay from '@/components/trainings/QrCodeDisplay.vue'
import {
  formatDate,
  formatDateTime,
  formatMinutes,
  formatPercent,
} from '@/composables/useFormat'
import {
  getExamForEdit,
  listExamAttempts,
  questionStats,
  summarizeByExaminee,
} from '@/services/exams.service'
import {
  getTraining,
  getTrainingAreas,
  listAttendance,
  listTrainingAudience,
  listViewers,
  regenerateQrToken,
} from '@/services/trainings.service'
import { useCatalogsStore } from '@/stores/catalogs.store'
import type {
  AttendanceWithProfile,
  Training,
  TrainingStatus,
  TrainingStatusRow,
  ViewerProgress,
} from '@/types/domain'
import { STATUS_LABELS } from '@/types/domain'
import {
  QUESTION_TYPE_LABELS,
  type ExamDraft,
  type ExamineeSummary,
  type QuestionStat,
} from '@/types/exams'

const route = useRoute()
const catalogs = useCatalogsStore()

const training = ref<Training | null>(null)
const areaNames = ref<string[]>([])
const audience = ref<TrainingStatusRow[]>([])
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

const completedCount = computed(
  () => viewers.value.filter((viewer) => viewer.completed_at !== null).length,
)


// ── Cobertura ─────────────────────────────────────────────────────────────
// El denominador honesto: cuánta gente activa debería tomarla según su área,
// no cuánta la abrió. Quien no la ha empezado cuenta como 0% de avance.

const completedByAudience = computed(
  () => audience.value.filter((row) => row.status === 'completed').length,
)

const coveragePercent = computed(() =>
  audience.value.length === 0
    ? 0
    : (completedByAudience.value / audience.value.length) * 100,
)

const audienceAveragePercent = computed(() => {
  if (audience.value.length === 0) return 0
  const total = audience.value.reduce(
    (sum, row) => sum + (row.watch_percent ?? 0),
    0,
  )
  return total / audience.value.length
})

/** A quién le falta: primero los que ni han empezado. */
const pendingAudience = computed(() =>
  audience.value
    .filter((row) => row.status !== 'completed')
    .sort((a, b) => (a.watch_percent ?? 0) - (b.watch_percent ?? 0)),
)

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
    const [trainingRow, attendanceRows, viewerRows, examDraft, areaIds, audienceRows] =
      await Promise.all([
        getTraining(id),
        listAttendance(id),
        listViewers(id),
        getExamForEdit(id),
        getTrainingAreas(id),
        listTrainingAudience(id),
        catalogs.fetchCatalogs(),
      ])
    training.value = trainingRow
    attendance.value = attendanceRows
    viewers.value = viewerRows
    exam.value = examDraft
    audience.value = audienceRows
    areaNames.value = areaIds.map((areaId) => catalogs.areaName(areaId))

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
      <header class="page-header">
        <div>
          <h1>{{ training.title }}</h1>
          <p class="muted">{{ formatDate(training.session_date) }}</p>
          <div class="area-tags">
            <GlassBadge v-if="!areaNames.length" tone="neutral">
              Todo el personal
            </GlassBadge>
            <GlassBadge v-for="nombre in areaNames" :key="nombre" tone="info">
              {{ nombre }}
            </GlassBadge>
          </div>
        </div>
        <RouterLink
          :to="{ name: 'admin-training-edit', params: { id: training.id } }"
        >
          <GlassButton variant="ghost">Editar</GlassButton>
        </RouterLink>
      </header>

      <div class="stats-row">
        <GlassCard class="stat">
          <strong>{{ audience.length }}</strong>
          <span>Deben tomarla</span>
        </GlassCard>
        <GlassCard class="stat" :class="{ 'is-good': coveragePercent >= 90 }">
          <strong>{{ formatPercent(coveragePercent) }}</strong>
          <span>Cumplimiento</span>
        </GlassCard>
        <GlassCard class="stat">
          <strong>{{ attendance.length }}</strong>
          <span>Asistieron presencial</span>
        </GlassCard>
        <GlassCard class="stat">
          <strong>{{ viewers.length }}</strong>
          <span>Han visto el video</span>
        </GlassCard>
        <GlassCard class="stat">
          <strong>{{ completedCount }}</strong>
          <span>Completaron</span>
        </GlassCard>
        <GlassCard class="stat">
          <strong>{{ formatPercent(audienceAveragePercent) }}</strong>
          <span>Avance promedio</span>
        </GlassCard>
      </div>

      <GlassCard class="table-card">
        <header class="coverage-header">
          <div>
            <h3>Cobertura ({{ completedByAudience }} de {{ audience.length }})</h3>
            <p class="muted">
              Personal activo al que le toca esta capacitación según su área.
              Quien no la ha empezado cuenta como 0% en el avance promedio.
            </p>
          </div>
          <div class="progress-bar coverage-bar" :class="{ 'is-complete': coveragePercent >= 90 }">
            <span :style="{ width: `${Math.min(100, coveragePercent)}%` }" />
          </div>
        </header>

        <template v-if="audience.length">
          <template v-if="pendingAudience.length">
            <h4 class="subsection">Les falta ({{ pendingAudience.length }})</h4>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Área</th>
                    <th>Sucursal</th>
                    <th>Estado</th>
                    <th>Avance</th>
                    <th>Asistió</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in pendingAudience" :key="row.user_id ?? ''">
                    <td>{{ row.full_name ?? '—' }}</td>
                    <td>{{ row.area_nombre ?? '—' }}</td>
                    <td>{{ row.sucursal_nombre ?? '—' }}</td>
                    <td>
                      <GlassBadge
                        :tone="row.status === 'in_progress' ? 'info' : 'warning'"
                      >
                        {{ STATUS_LABELS[(row.status ?? 'pending') as TrainingStatus] }}
                      </GlassBadge>
                    </td>
                    <td>
                      <div class="percent-cell">
                        <div class="progress-bar">
                          <span
                            :style="{ width: `${Math.min(100, row.watch_percent ?? 0)}%` }"
                          />
                        </div>
                        <span class="percent-label">
                          {{ formatPercent(row.watch_percent) }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <GlassBadge v-if="row.attended_in_person" tone="success">
                        Presencial ✓
                      </GlassBadge>
                      <span v-else class="muted">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <p v-else class="coverage-done">
            Todo el personal que debía tomarla ya la completó.
          </p>
        </template>

        <div v-else class="empty-state">
          <strong>Todavía no le toca a nadie</strong>
          <span>
            Una capacitación entra en la lista de su área cuando ya tiene video
            o examen publicado.
          </span>
        </div>
      </GlassCard>

      <div class="two-col">
        <GlassCard>
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
            <GlassButton variant="danger" @click="showRegenerateModal = true">
              Regenerar código
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard>
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
        </GlassCard>
      </div>

      <GlassCard class="table-card">
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
      </GlassCard>

      <GlassCard class="table-card">
        <h3>Visualización del video ({{ viewers.length }})</h3>
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
                  <GlassBadge v-if="viewer.completed_at" tone="success">
                    {{ formatDateTime(viewer.completed_at) }}
                  </GlassBadge>
                  <span v-else class="muted">—</span>
                </td>
                <td>{{ formatDateTime(viewer.last_heartbeat_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted">
          Nadie ha reproducido el video todavía
          {{ training.youtube_video_id ? '' : '(aún no hay video publicado)' }}.
        </p>
      </GlassCard>

      <GlassCard class="table-card">
        <header class="exam-header">
          <div>
            <h3>
              Examen
              <GlassBadge v-if="exam && !exam.is_published" tone="warning">
                Sin publicar
              </GlassBadge>
              <GlassBadge v-else-if="exam" tone="success">Publicado</GlassBadge>
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
            <GlassButton variant="ghost">
              {{ exam ? 'Editar examen' : 'Crear examen' }}
            </GlassButton>
          </RouterLink>
        </header>

        <template v-if="exam">
          <div class="stats-row exam-stats">
            <GlassCard class="stat">
              <strong>{{ examinees.length }}</strong>
              <span>Lo presentaron</span>
            </GlassCard>
            <GlassCard class="stat">
              <strong>{{ examPassedCount }}</strong>
              <span>Aprobaron</span>
            </GlassCard>
            <GlassCard class="stat">
              <strong>{{ formatPercent(examAveragePercent) }}</strong>
              <span>Calificación promedio</span>
            </GlassCard>
            <GlassCard class="stat">
              <strong>{{ formatPercent(examPassRate) }}</strong>
              <span>Tasa de aprobación</span>
            </GlassCard>
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
                    <GlassBadge :tone="row.passed ? 'success' : 'danger'">
                      {{ row.passed ? 'Aprobado' : 'No aprobado' }}
                    </GlassBadge>
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
      </GlassCard>

      <GlassModal
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
          <GlassButton variant="ghost" @click="showRegenerateModal = false">
            Cancelar
          </GlassButton>
          <GlassButton
            variant="danger"
            :loading="regenerating"
            @click="confirmRegenerate"
          >
            Regenerar
          </GlassButton>
        </template>
      </GlassModal>
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

.stat {
  text-align: center;
  padding: 0.9rem;
}

.stat strong {
  display: block;
  font-size: 1.5rem;
  color: var(--clarvi-navy);
}

.stat span {
  font-size: 0.8rem;
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

.percent-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.percent-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--clarvi-navy);
  min-width: 38px;
}

.area-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.45rem;
}

.stat.is-good strong {
  color: var(--color-success);
}

.coverage-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.coverage-header h3 {
  margin: 0 0 0.2rem;
}

.coverage-header p {
  margin: 0;
  max-width: 46ch;
}

.coverage-bar {
  flex: 1;
  min-width: 160px;
  margin-top: 0.6rem;
}

.coverage-done {
  margin: 0.5rem 0 0;
  color: var(--color-success);
  font-weight: 600;
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
  margin: 1.4rem 0 0.15rem;
  font-size: 0.95rem;
}

.subsection-note {
  margin: 0 0 0.6rem;
  font-size: 0.82rem;
}
</style>
