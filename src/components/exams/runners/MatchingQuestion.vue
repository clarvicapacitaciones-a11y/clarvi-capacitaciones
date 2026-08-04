<script setup lang="ts">
// Relacionar conceptos: por cada concepto de la izquierda se elige su pareja
// de una lista. Un desplegable en vez de arrastrar, para que funcione igual
// en teléfono que en computadora.

import { computed } from 'vue'
import {
  isMatchingContent,
  type ExamItem,
  type QuestionResponse,
  type RunnerQuestion,
} from '@/types/exams'

const props = defineProps<{ question: RunnerQuestion }>()
const response = defineModel<QuestionResponse>({ required: true })

const left = computed<ExamItem[]>(() =>
  isMatchingContent(props.question.content) ? props.question.content.left : [],
)

const right = computed<ExamItem[]>(() =>
  isMatchingContent(props.question.content) ? props.question.content.right : [],
)

const pairs = computed<Record<string, string>>(
  () => (response.value as { pairs?: Record<string, string> }).pairs ?? {},
)

function choose(leftId: string, rightId: string): void {
  const next = { ...pairs.value }
  if (rightId === '') delete next[leftId]
  else next[leftId] = rightId
  response.value = { pairs: next }
}

/** Letra que identifica cada opción de la derecha en la lista de referencia. */
function letterFor(index: number): string {
  return String.fromCharCode(65 + index)
}
</script>

<template>
  <div class="matching-question">
    <ol class="right-list">
      <li v-for="(item, index) in right" :key="item.id">
        <span class="letter">{{ letterFor(index) }}</span>
        <span>{{ item.text }}</span>
      </li>
    </ol>

    <div class="pairs">
      <div v-for="item in left" :key="item.id" class="pair-row">
        <span class="left-text">{{ item.text }}</span>
        <select
          class="field-input pair-select"
          :value="pairs[item.id] ?? ''"
          :aria-label="`Pareja de ${item.text}`"
          @change="choose(item.id, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">Elige…</option>
          <option
            v-for="(option, index) in right"
            :key="option.id"
            :value="option.id"
          >
            {{ letterFor(index) }} — {{ option.text }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matching-question {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Panel de referencia: bloque tenue de esquinas suaves. */
.right-list {
  list-style: none;
  margin: 0;
  padding: 0.9rem 1.1rem;
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.92rem;
}

.right-list li {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.letter {
  font-weight: 500;
  color: var(--clarvi-blue-ink);
  flex-shrink: 0;
}

.pairs {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.pair-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.left-text {
  flex: 1;
  min-width: 140px;
  font-weight: 600;
  color: var(--text-strong);
}

.pair-select {
  min-width: 190px;
  max-width: 100%;
}
</style>
