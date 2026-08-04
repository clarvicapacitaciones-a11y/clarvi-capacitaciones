<script setup lang="ts">
// Una pregunta del constructor: los campos comunes y, debajo, el editor que
// corresponde a su tipo.

import { computed } from 'vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import ChoiceEditor from '@/components/exams/editors/ChoiceEditor.vue'
import FillBlankEditor from '@/components/exams/editors/FillBlankEditor.vue'
import MatchingEditor from '@/components/exams/editors/MatchingEditor.vue'
import OrderingEditor from '@/components/exams/editors/OrderingEditor.vue'
import {
  emptyQuestion,
  QUESTION_TYPE_HINTS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type ExamQuestionDraft,
  type QuestionType,
} from '@/types/exams'

const question = defineModel<ExamQuestionDraft>({ required: true })

defineProps<{ index: number; total: number }>()

const emit = defineEmits<{ remove: []; move: [delta: number] }>()

const typeOptions = QUESTION_TYPES.map((type) => ({
  value: type,
  label: QUESTION_TYPE_LABELS[type],
}))

const editors = {
  multiple_choice: ChoiceEditor,
  multiple_select: ChoiceEditor,
  true_false: ChoiceEditor,
  matching: MatchingEditor,
  ordering: OrderingEditor,
  fill_blank: FillBlankEditor,
} as const

const editorComponent = computed(() => editors[question.value.type])

const selectedType = computed({
  get: () => question.value.type as string,
  set: (value: string) => {
    if (value === question.value.type) return
    // Cambiar de tipo estrena contenido y respuesta correcta: la estructura
    // anterior no significa nada en el tipo nuevo. Lo escrito se conserva.
    const fresh = emptyQuestion(value as QuestionType)
    question.value = {
      ...fresh,
      id: question.value.id,
      key: question.value.key,
      prompt: question.value.prompt,
      points: question.value.points,
      explanation: question.value.explanation,
    }
  },
})

const points = computed({
  get: () => String(question.value.points),
  set: (value: string) => {
    const parsed = Number(value)
    question.value.points = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  },
})
</script>

<template>
  <div class="question-editor">
    <header class="question-header">
      <span class="question-number">Pregunta {{ index + 1 }}</span>
      <div class="header-actions">
        <button
          class="row-action"
          type="button"
          aria-label="Subir pregunta"
          :disabled="index === 0"
          @click="emit('move', -1)"
        >
          ↑
        </button>
        <button
          class="row-action"
          type="button"
          aria-label="Bajar pregunta"
          :disabled="index === total - 1"
          @click="emit('move', 1)"
        >
          ↓
        </button>
        <button
          class="row-action is-danger"
          type="button"
          aria-label="Eliminar pregunta"
          @click="emit('remove')"
        >
          ×
        </button>
      </div>
    </header>

    <div class="form-row">
      <UiSelect v-model="selectedType" label="Tipo" :options="typeOptions" />
      <label class="field-block">
        <span class="field-label">Puntos</span>
        <input v-model="points" class="field-input" type="number" min="0.5" step="0.5" />
      </label>
    </div>

    <p class="muted type-hint">{{ QUESTION_TYPE_HINTS[question.type] }}</p>

    <label class="field-block">
      <span class="field-label">Enunciado</span>
      <textarea
        v-model="question.prompt"
        class="field-textarea"
        rows="2"
        placeholder="¿Qué debe hacer el operador al detectar una fuga?"
      />
    </label>

    <component :is="editorComponent" v-model="question" />

    <label class="field-block">
      <span class="field-label">Explicación (opcional)</span>
      <input
        v-model="question.explanation"
        class="field-input"
        type="text"
        placeholder="Se muestra al terminar el examen, junto con la respuesta correcta"
      />
    </label>
  </div>
</template>

<style scoped>
/* Bloque de pregunta: caja de esquinas suaves sobre el fondo tenue. */
.question-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.1rem;
  border-radius: var(--radius-md);
  border: var(--rule);
  background: var(--bg-subtle);
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.question-number {
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 0.3rem;
}

.row-action.is-danger:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: var(--text-inverse);
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.type-hint {
  margin: -0.35rem 0 0;
  font-size: 0.8rem;
}
</style>
