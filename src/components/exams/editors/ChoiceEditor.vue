<script setup lang="ts">
// Editor de opción múltiple, selección múltiple y verdadero/falso.
// Los tres comparten la misma mecánica: una lista de opciones donde se marca
// cuál (o cuáles) son correctas; verdadero/falso solo fija el valor.

import { computed } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  newItemId,
  type ExamItem,
  type ExamQuestionDraft,
  type MultiChoiceKey,
  type OptionsContent,
  type SingleChoiceKey,
  type TrueFalseKey,
} from '@/types/exams'

const question = defineModel<ExamQuestionDraft>({ required: true })

const options = computed<ExamItem[]>(
  () => (question.value.content as OptionsContent).options ?? [],
)

const singleAnswer = computed({
  get: () => (question.value.answer_key as SingleChoiceKey).option_id ?? '',
  set: (value: string) => {
    question.value.answer_key = { option_id: value }
  },
})

const trueFalseAnswer = computed({
  get: () => (question.value.answer_key as TrueFalseKey).value === true,
  set: (value: boolean) => {
    question.value.answer_key = { value }
  },
})

function isChecked(optionId: string): boolean {
  return ((question.value.answer_key as MultiChoiceKey).option_ids ?? []).includes(
    optionId,
  )
}

function toggleChecked(optionId: string): void {
  const current = (question.value.answer_key as MultiChoiceKey).option_ids ?? []
  question.value.answer_key = {
    option_ids: current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId],
  }
}

function addOption(): void {
  options.value.push({ id: newItemId(), text: '' })
}

function removeOption(index: number): void {
  const [removed] = options.value.splice(index, 1)
  if (!removed) return
  // La opción borrada no puede seguir siendo la respuesta correcta.
  if (question.value.type === 'multiple_choice' && singleAnswer.value === removed.id) {
    singleAnswer.value = ''
  }
  if (question.value.type === 'multiple_select' && isChecked(removed.id)) {
    toggleChecked(removed.id)
  }
}
</script>

<template>
  <div class="choice-editor">
    <template v-if="question.type === 'true_false'">
      <span class="field-label">Respuesta correcta</span>
      <div class="tf-row">
        <label class="tf-option" :class="{ 'is-active': trueFalseAnswer }">
          <input v-model="trueFalseAnswer" type="radio" :value="true" />
          Verdadero
        </label>
        <label class="tf-option" :class="{ 'is-active': !trueFalseAnswer }">
          <input v-model="trueFalseAnswer" type="radio" :value="false" />
          Falso
        </label>
      </div>
    </template>

    <template v-else>
      <span class="field-label">
        {{
          question.type === 'multiple_choice'
            ? 'Opciones (marca la correcta)'
            : 'Opciones (marca todas las correctas)'
        }}
      </span>

      <div v-for="(option, index) in options" :key="option.id" class="option-row">
        <input
          v-if="question.type === 'multiple_choice'"
          v-model="singleAnswer"
          class="option-mark"
          type="radio"
          :value="option.id"
          :aria-label="`Marcar la opción ${index + 1} como correcta`"
        />
        <input
          v-else
          class="option-mark"
          type="checkbox"
          :checked="isChecked(option.id)"
          :aria-label="`Marcar la opción ${index + 1} como correcta`"
          @change="toggleChecked(option.id)"
        />
        <input
          v-model="option.text"
          class="field-input option-text"
          type="text"
          :placeholder="`Opción ${index + 1}`"
        />
        <button
          class="row-action"
          type="button"
          aria-label="Quitar opción"
          :disabled="options.length <= 2"
          @click="removeOption(index)"
        >
          ×
        </button>
      </div>

      <UiButton variant="ghost" @click="addOption">Agregar opción</UiButton>
    </template>
  </div>
</template>

<style scoped>
.choice-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}

.option-mark {
  width: 1.05rem;
  height: 1.05rem;
  accent-color: var(--clarvi-blue);
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  min-width: 0;
}

.tf-row {
  display: flex;
  gap: 0.5rem;
}

.tf-option {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.95rem;
  border-radius: var(--radius-full);
  border: var(--rule);
  background: var(--bg-surface);
  font-size: 0.88rem;
  font-weight: 400;
  color: var(--text-body);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}

.tf-option:hover {
  color: var(--clarvi-navy);
}

.tf-option.is-active {
  border-color: var(--clarvi-navy);
  color: var(--clarvi-navy);
  font-weight: 500;
}

.tf-option input {
  accent-color: var(--clarvi-blue);
}
</style>
