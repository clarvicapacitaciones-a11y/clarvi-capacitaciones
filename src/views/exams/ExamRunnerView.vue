<script setup lang="ts">
// Aplicación del examen: una pregunta por pantalla.
//
// Tres momentos: portada (qué vas a contestar) → preguntas → resultado.
// Las respuestas viven en memoria hasta entregar; la calificación la hace el
// servidor, que es el único que conoce las respuestas correctas.

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExamReview from '@/components/exams/ExamReview.vue'
import QuestionRunner from '@/components/exams/QuestionRunner.vue'
import GlassBadge from '@/components/glass/GlassBadge.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassCard from '@/components/glass/GlassCard.vue'
import GlassModal from '@/components/glass/GlassModal.vue'
import {
  getExamStatus,
  startAttempt,
  submitAttempt,
} from '@/services/exams.service'
import { getTraining } from '@/services/trainings.service'
import type {
  AttemptAnswers,
  ExamResult,
  ExamStatus,
  QuestionResponse,
  StartedAttempt,
} from '@/types/exams'

const route = useRoute()
const router = useRouter()

const trainingId = computed(() => String(route.params.id))

const trainingTitle = ref('')
const status = ref<ExamStatus | null>(null)
const attempt = ref<StartedAttempt | null>(null)
const result = ref<ExamResult | null>(null)

const answers = ref<AttemptAnswers>({})
const currentIndex = ref(0)

const loading = ref(true)
const starting = ref(false)
const submitting = ref(false)
const error = ref('')
const showSubmitModal = ref(false)

const questions = computed(() => attempt.value?.questions ?? [])
const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)
const isLastQuestion = computed(
  () => currentIndex.value === questions.value.length - 1,
)

const progressPercent = computed(() =>
  questions.value.length === 0
    ? 0
    : ((currentIndex.value + 1) / questions.value.length) * 100,
)

/** Una pregunta cuenta como contestada si su respuesta trae algo. */
function isAnswered(questionId: string): boolean {
  const response = answers.value[questionId]
  if (!response) return false
  const value = response as Record<string, unknown>
  if (typeof value.option_id === 'string') return value.option_id !== ''
  if (typeof value.value === 'boolean') return true
  if (Array.isArray(value.option_ids)) return value.option_ids.length > 0
  if (Array.isArray(value.order)) return value.order.length > 0
  if (value.pairs && typeof value.pairs === 'object') {
    return Object.keys(value.pairs).length > 0
  }
  if (value.blanks && typeof value.blanks === 'object') {
    return Object.values(value.blanks as Record<string, string>).some(
      (text) => text.trim() !== '',
    )
  }
  return false
}

const unansweredCount = computed(
  () => questions.value.filter((question) => !isAnswered(question.id)).length,
)

/** v-model de la pregunta en pantalla, guardado por id. */
const currentResponse = computed<QuestionResponse>({
  get: () => {
    const id = currentQuestion.value?.id
    return id ? (answers.value[id] ?? {}) : {}
  },
  set: (value: QuestionResponse) => {
    const id = currentQuestion.value?.id
    if (id) answers.value = { ...answers.value, [id]: value }
  },
})

onMounted(async () => {
  try {
    const [training, examStatus] = await Promise.all([
      getTraining(trainingId.value),
      getExamStatus(trainingId.value),
    ])
    trainingTitle.value = training?.title ?? ''
    status.value = examStatus
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el examen'
  } finally {
    loading.value = false
  }
})

async function begin(): Promise<void> {
  error.value = ''
  starting.value = true
  try {
    attempt.value = await startAttempt(trainingId.value)
    answers.value = {}
    currentIndex.value = 0
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo abrir el examen'
  } finally {
    starting.value = false
  }
}

function goTo(index: number): void {
  currentIndex.value = Math.min(Math.max(index, 0), questions.value.length - 1)
  window.scrollTo({ top: 0 })
}

async function finish(): Promise<void> {
  if (!attempt.value) return
  error.value = ''
  submitting.value = true
  try {
    result.value = await submitAttempt(attempt.value.attempt_id, answers.value)
    attempt.value = null
    showSubmitModal.value = false
    window.scrollTo({ top: 0 })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo entregar el examen'
    showSubmitModal.value = false
  } finally {
    submitting.value = false
  }
}

function backToTraining(): void {
  void router.push({ name: 'training-detail', params: { id: trainingId.value } })
}
</script>

<template>
  <div class="page exam-page">
    <p v-if="loading" class="muted">Cargando…</p>

    <!-- ── Resultado ────────────────────────────────────────────────── -->
    <template v-else-if="result">
      <GlassCard class="result-card">
        <div class="result-head">
          <GlassBadge :tone="result.passed ? 'success' : 'danger'">
            {{ result.passed ? 'Aprobado' : 'No aprobado' }}
          </GlassBadge>
          <strong class="result-score">{{ Math.round(result.percent) }}%</strong>
          <p class="muted">
            {{ result.score }} de {{ result.max_score }} puntos · mínimo para
            aprobar {{ result.passing_percent }}%
          </p>
        </div>
        <div class="progress-bar" :class="{ 'is-complete': result.passed }">
          <span :style="{ width: `${Math.min(100, result.percent)}%` }" />
        </div>
      </GlassCard>

      <h2 class="section-title">Repaso de tus respuestas</h2>
      <ExamReview :review="result.review" />

      <div class="result-actions">
        <GlassButton variant="ghost" @click="backToTraining">
          Volver a la capacitación
        </GlassButton>
      </div>
    </template>

    <!-- ── Preguntas ────────────────────────────────────────────────── -->
    <template v-else-if="attempt && currentQuestion">
      <header class="runner-head">
        <div>
          <p class="muted runner-training">{{ trainingTitle }}</p>
          <h1>{{ attempt.title || 'Examen' }}</h1>
        </div>
        <span class="counter">
          Pregunta {{ currentIndex + 1 }} de {{ questions.length }}
        </span>
      </header>

      <div class="progress-bar runner-progress">
        <span :style="{ width: `${progressPercent}%` }" />
      </div>

      <GlassCard class="question-card">
        <QuestionRunner v-model="currentResponse" :question="currentQuestion" />
      </GlassCard>

      <p v-if="error" class="form-error">{{ error }}</p>

      <nav class="runner-nav">
        <GlassButton
          variant="ghost"
          :disabled="currentIndex === 0"
          @click="goTo(currentIndex - 1)"
        >
          Anterior
        </GlassButton>

        <div class="dots">
          <button
            v-for="(question, index) in questions"
            :key="question.id"
            class="dot"
            :class="{
              'is-current': index === currentIndex,
              'is-answered': isAnswered(question.id),
            }"
            type="button"
            :aria-label="`Ir a la pregunta ${index + 1}`"
            :aria-current="index === currentIndex"
            @click="goTo(index)"
          />
        </div>

        <GlassButton v-if="!isLastQuestion" @click="goTo(currentIndex + 1)">
          Siguiente
        </GlassButton>
        <GlassButton v-else @click="showSubmitModal = true">
          Entregar examen
        </GlassButton>
      </nav>

      <GlassModal
        :open="showSubmitModal"
        title="Entregar examen"
        @close="showSubmitModal = false"
      >
        <p v-if="unansweredCount > 0">
          Te
          {{ unansweredCount === 1 ? 'falta' : 'faltan' }}
          <strong>
            {{ unansweredCount }}
            {{ unansweredCount === 1 ? 'pregunta' : 'preguntas' }}
          </strong>
          por contestar. Si entregas así,
          {{ unansweredCount === 1 ? 'contará' : 'contarán' }} como incorrecta{{
            unansweredCount === 1 ? '' : 's'
          }}.
        </p>
        <p v-else>
          Contestaste todas las preguntas. Una vez entregado ya no podrás
          cambiar tus respuestas.
        </p>
        <template #footer>
          <GlassButton variant="ghost" @click="showSubmitModal = false">
            Seguir contestando
          </GlassButton>
          <GlassButton :loading="submitting" @click="finish">Entregar</GlassButton>
        </template>
      </GlassModal>
    </template>

    <!-- ── Portada ──────────────────────────────────────────────────── -->
    <template v-else>
      <header class="page-header">
        <div>
          <p class="muted">{{ trainingTitle }}</p>
          <h1>{{ status?.title || 'Examen' }}</h1>
        </div>
      </header>

      <GlassCard v-if="status?.has_exam" class="intro-card">
        <p v-if="status.instructions" class="instructions">
          {{ status.instructions }}
        </p>

        <ul class="intro-list">
          <li>
            <strong>{{ status.question_count }}</strong>
            {{ status.question_count === 1 ? 'pregunta' : 'preguntas' }}
          </li>
          <li>
            Mínimo para aprobar: <strong>{{ status.passing_percent }}%</strong>
          </li>
          <li v-if="status.max_attempts">
            Intentos: <strong>{{ status.attempts_used }}</strong> de
            <strong>{{ status.max_attempts }}</strong>
          </li>
          <li v-else>Puedes repetirlo las veces que necesites</li>
        </ul>

        <p v-if="status.block_reason === 'video_incomplete'" class="form-error">
          Necesitas terminar de ver el video de la capacitación antes de aplicar
          el examen.
        </p>
        <p v-else-if="status.block_reason === 'no_attempts_left'" class="form-error">
          Ya usaste todos tus intentos de este examen.
        </p>
        <p v-else-if="status.block_reason === 'not_published'" class="form-error">
          Este examen todavía no está publicado.
        </p>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="intro-actions">
          <GlassButton variant="ghost" @click="backToTraining">Cancelar</GlassButton>
          <GlassButton
            :disabled="!status.can_attempt"
            :loading="starting"
            @click="begin"
          >
            {{ status.open_attempt_id ? 'Continuar examen' : 'Comenzar examen' }}
          </GlassButton>
        </div>
      </GlassCard>

      <div v-else class="empty-state">
        <strong>Esta capacitación no tiene examen</strong>
        <span>Si crees que debería tenerlo, avísale a un administrador.</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.exam-page {
  max-width: 720px;
}

.runner-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.6rem;
}

.runner-head h1 {
  margin: 0;
  font-size: 1.3rem;
}

.runner-training {
  margin: 0 0 0.1rem;
  font-size: 0.85rem;
}

.counter {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--clarvi-navy);
  white-space: nowrap;
}

.runner-progress {
  margin-bottom: 1rem;
}

.question-card {
  padding: 1.25rem;
}

.runner-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.dots {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  justify-content: center;
  flex: 1;
}

.dot {
  width: 0.7rem;
  height: 0.7rem;
  padding: 0;
  border-radius: var(--radius-full);
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.25);
  background: transparent;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.dot.is-answered {
  background: rgba(var(--clarvi-blue-rgb), 0.55);
  border-color: transparent;
}

.dot.is-current {
  background: var(--clarvi-navy);
  border-color: transparent;
  transform: scale(1.25);
}

.intro-card,
.result-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.instructions {
  margin: 0;
  white-space: pre-line;
}

.intro-list {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text-body);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.intro-actions,
.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.result-actions {
  margin-top: 1rem;
}

.result-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  text-align: center;
}

.result-score {
  font-size: 2.6rem;
  line-height: 1.1;
  color: var(--clarvi-navy);
}

.result-head p {
  margin: 0;
}

.section-title {
  font-size: 1.05rem;
  margin: 1.25rem 0 0.6rem;
}
</style>
