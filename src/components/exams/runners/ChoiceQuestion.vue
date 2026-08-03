<script setup lang="ts">
// Opción múltiple, selección múltiple y verdadero/falso al contestar.

import { computed } from 'vue'
import {
  isOptionsContent,
  type ExamItem,
  type QuestionResponse,
  type RunnerQuestion,
} from '@/types/exams'

const props = defineProps<{ question: RunnerQuestion }>()
const response = defineModel<QuestionResponse>({ required: true })

const TRUE_FALSE_OPTIONS: ExamItem[] = [
  { id: 'true', text: 'Verdadero' },
  { id: 'false', text: 'Falso' },
]

const options = computed<ExamItem[]>(() => {
  if (props.question.type === 'true_false') return TRUE_FALSE_OPTIONS
  return isOptionsContent(props.question.content)
    ? props.question.content.options
    : []
})

const isMulti = computed(() => props.question.type === 'multiple_select')

function isSelected(optionId: string): boolean {
  const current = response.value as Record<string, unknown>
  if (props.question.type === 'true_false') {
    return current.value === (optionId === 'true')
  }
  if (isMulti.value) {
    return ((current.option_ids as string[]) ?? []).includes(optionId)
  }
  return current.option_id === optionId
}

function select(optionId: string): void {
  if (props.question.type === 'true_false') {
    response.value = { value: optionId === 'true' }
    return
  }
  if (!isMulti.value) {
    response.value = { option_id: optionId }
    return
  }
  const current =
    ((response.value as { option_ids?: string[] }).option_ids as string[]) ?? []
  response.value = {
    option_ids: current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId],
  }
}
</script>

<template>
  <div class="choice-question">
    <p v-if="isMulti" class="muted multi-hint">
      Puedes marcar más de una respuesta.
    </p>
    <button
      v-for="option in options"
      :key="option.id"
      class="option"
      :class="{ 'is-selected': isSelected(option.id) }"
      type="button"
      :aria-pressed="isSelected(option.id)"
      @click="select(option.id)"
    >
      <span class="option-mark" :class="{ 'is-multi': isMulti }" aria-hidden="true" />
      <span class="option-text">{{ option.text }}</span>
    </button>
  </div>
</template>

<style scoped>
.choice-question {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.multi-hint {
  margin: 0;
  font-size: 0.82rem;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 1rem;
  color: var(--text-body);
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.14);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.option:hover {
  border-color: rgba(var(--clarvi-blue-rgb), 0.5);
}

.option.is-selected {
  border-color: var(--clarvi-blue);
  background: var(--color-info-bg);
  color: var(--clarvi-navy);
  font-weight: 600;
}

.option-mark {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: var(--radius-full);
  border: 2px solid rgba(var(--clarvi-navy-rgb), 0.25);
  flex-shrink: 0;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.option-mark.is-multi {
  border-radius: var(--radius-sm);
}

.option.is-selected .option-mark {
  border-color: var(--clarvi-blue);
  background: var(--clarvi-blue);
  box-shadow: inset 0 0 0 3px #fff;
}

.option-text {
  flex: 1;
}
</style>
