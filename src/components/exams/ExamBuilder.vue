<script setup lang="ts">
// Constructor del examen de una capacitación: ajustes + lista de preguntas.
// Vive dentro del formulario de la capacitación; quien guarda es el
// formulario, este componente solo edita el borrador.

import { computed, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import QuestionEditor from '@/components/exams/QuestionEditor.vue'
import {
  emptyQuestion,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type ExamDraft,
  type QuestionType,
} from '@/types/exams'

const draft = defineModel<ExamDraft>({ required: true })

const newQuestionType = ref<string>('multiple_choice')

const typeOptions = QUESTION_TYPES.map((type) => ({
  value: type,
  label: QUESTION_TYPE_LABELS[type],
}))

const totalPoints = computed(() =>
  draft.value.questions.reduce((sum, question) => sum + question.points, 0),
)

const passingPercent = computed({
  get: () => String(draft.value.passing_percent),
  set: (value: string) => {
    const parsed = Number(value)
    draft.value.passing_percent = Number.isFinite(parsed)
      ? Math.min(100, Math.max(0, parsed))
      : 80
  },
})

function addQuestion(): void {
  draft.value.questions.push(emptyQuestion(newQuestionType.value as QuestionType))
}

function removeQuestion(index: number): void {
  draft.value.questions.splice(index, 1)
}

function moveQuestion(index: number, delta: number): void {
  const target = index + delta
  if (target < 0 || target >= draft.value.questions.length) return
  const [question] = draft.value.questions.splice(index, 1)
  draft.value.questions.splice(target, 0, question)
}
</script>

<template>
  <section class="exam-builder">
    <header class="builder-header">
      <div>
        <h3>Examen</h3>
        <p class="muted">
          {{ draft.questions.length }}
          {{ draft.questions.length === 1 ? 'pregunta' : 'preguntas' }} ·
          {{ totalPoints }} {{ totalPoints === 1 ? 'punto' : 'puntos' }}
        </p>
      </div>
      <label class="publish-toggle">
        <input v-model="draft.is_published" type="checkbox" />
        <span>Publicado</span>
      </label>
    </header>

    <p v-if="!draft.is_published" class="muted publish-note">
      Mientras no esté publicado, los usuarios no ven el examen. Publícalo
      cuando las preguntas estén listas.
    </p>

    <div class="form-row">
      <UiInput
        v-model="draft.title"
        label="Título del examen (opcional)"
        placeholder="Evaluación de la capacitación"
      />
      <UiInput
        v-model="passingPercent"
        label="Calificación mínima para aprobar (%)"
        type="number"
      />
    </div>

    <div class="form-row">
      <UiInput
        v-model="draft.max_attempts"
        label="Intentos permitidos"
        type="number"
        hint="Vacío = intentos ilimitados"
      />
      <div class="switches">
        <label class="switch">
          <input v-model="draft.requires_video_completed" type="checkbox" />
          <span>Requiere haber completado el video</span>
        </label>
        <label class="switch">
          <input v-model="draft.shuffle_questions" type="checkbox" />
          <span>Revolver preguntas y opciones</span>
        </label>
      </div>
    </div>

    <label class="field-block">
      <span class="field-label">Instrucciones (opcional)</span>
      <textarea
        v-model="draft.instructions"
        class="field-textarea"
        rows="2"
        placeholder="Lee cada pregunta con calma. Puedes regresar a las anteriores antes de entregar."
      />
    </label>

    <div v-if="draft.questions.length" class="questions">
      <QuestionEditor
        v-for="(question, index) in draft.questions"
        :key="question.key"
        v-model="draft.questions[index]"
        :index="index"
        :total="draft.questions.length"
        @remove="removeQuestion(index)"
        @move="moveQuestion(index, $event)"
      />
    </div>

    <div v-else class="empty-state">
      <strong>Este examen todavía no tiene preguntas</strong>
      <span>Elige un tipo y agrégalas una por una.</span>
    </div>

    <div class="add-row">
      <UiSelect
        v-model="newQuestionType"
        label="Tipo de pregunta nueva"
        :options="typeOptions"
      />
      <UiButton variant="ghost" @click="addQuestion">Agregar pregunta</UiButton>
    </div>
  </section>
</template>

<style scoped>
.exam-builder {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.builder-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.builder-header h3 {
  margin: 0;
}

.builder-header p {
  margin: 0.15rem 0 0;
}

.publish-toggle,
.switch {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-body);
  cursor: pointer;
}

.publish-toggle input,
.switch input {
  width: 1.05rem;
  height: 1.05rem;
  accent-color: var(--clarvi-blue);
}

.publish-note {
  margin: -0.6rem 0 0;
  font-size: 0.82rem;
}

.switches {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  justify-content: center;
}

.switch {
  font-weight: 400;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.add-row {
  display: flex;
  align-items: flex-end;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.add-row :deep(.field) {
  min-width: 220px;
}
</style>
