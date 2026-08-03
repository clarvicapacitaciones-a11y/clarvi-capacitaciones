<script setup lang="ts">
// Ordenar pasos: se suben y bajan con botones. Sin arrastrar, para que
// funcione con el dedo y sin dependencias nuevas.

import { computed, watch } from 'vue'
import {
  isOrderingContent,
  type ExamItem,
  type QuestionResponse,
  type RunnerQuestion,
} from '@/types/exams'

const props = defineProps<{ question: RunnerQuestion }>()
const response = defineModel<QuestionResponse>({ required: true })

const items = computed<ExamItem[]>(() =>
  isOrderingContent(props.question.content) ? props.question.content.items : [],
)

/** Orden actual; arranca en el que trae el servidor (ya revuelto). */
const order = computed<string[]>(
  () => (response.value as { order?: string[] }).order ?? [],
)

const orderedItems = computed(() =>
  order.value
    .map((id) => items.value.find((item) => item.id === id))
    .filter((item): item is ExamItem => item !== undefined),
)

function move(index: number, delta: number): void {
  const target = index + delta
  if (target < 0 || target >= order.value.length) return
  const next = [...order.value]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  response.value = { order: next }
}

// Al entrar a la pregunta el orden inicial es el que se muestra: así, si el
// usuario no mueve nada, se califica lo que tiene enfrente.
watch(
  items,
  (list) => {
    if (order.value.length !== list.length) {
      response.value = { order: list.map((item) => item.id) }
    }
  },
  { immediate: true },
)
</script>

<template>
  <ol class="ordering-question">
    <li v-for="(item, index) in orderedItems" :key="item.id" class="step">
      <span class="step-number">{{ index + 1 }}</span>
      <span class="step-text">{{ item.text }}</span>
      <div class="step-actions">
        <button
          class="row-action"
          type="button"
          aria-label="Subir este paso"
          :disabled="index === 0"
          @click="move(index, -1)"
        >
          ↑
        </button>
        <button
          class="row-action"
          type="button"
          aria-label="Bajar este paso"
          :disabled="index === orderedItems.length - 1"
          @click="move(index, 1)"
        >
          ↓
        </button>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.ordering-question {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.14);
  background: rgba(255, 255, 255, 0.6);
}

.step-number {
  width: 1.7rem;
  height: 1.7rem;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--color-info-bg);
  color: var(--clarvi-navy);
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.step-text {
  flex: 1;
}

.step-actions {
  display: flex;
  gap: 0.3rem;
}
</style>
