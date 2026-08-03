<script setup lang="ts">
// Editor de "ordenar pasos": se capturan en el orden correcto. El servidor
// siempre los baraja antes de mostrárselos al usuario.

import { computed } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  newItemId,
  type ExamItem,
  type ExamQuestionDraft,
  type OrderingContent,
} from '@/types/exams'

const question = defineModel<ExamQuestionDraft>({ required: true })

const items = computed<ExamItem[]>(
  () => (question.value.content as OrderingContent).items ?? [],
)

/** El orden correcto es siempre el orden en que están capturados. */
function syncAnswerKey(): void {
  question.value.answer_key = { order: items.value.map((item) => item.id) }
}

function addStep(): void {
  items.value.push({ id: newItemId(), text: '' })
  syncAnswerKey()
}

function removeStep(index: number): void {
  items.value.splice(index, 1)
  syncAnswerKey()
}

function move(index: number, delta: number): void {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const [step] = items.value.splice(index, 1)
  items.value.splice(target, 0, step)
  syncAnswerKey()
}
</script>

<template>
  <div class="ordering-editor">
    <span class="field-label">Pasos en el orden correcto</span>
    <p class="muted hint">
      Al aplicar el examen se muestran revueltos y el usuario los acomoda.
    </p>

    <div v-for="(item, index) in items" :key="item.id" class="step-row">
      <span class="step-number">{{ index + 1 }}</span>
      <input
        v-model="item.text"
        class="field-input step-text"
        type="text"
        :placeholder="`Paso ${index + 1}`"
      />
      <button
        class="row-action"
        type="button"
        aria-label="Subir paso"
        :disabled="index === 0"
        @click="move(index, -1)"
      >
        ↑
      </button>
      <button
        class="row-action"
        type="button"
        aria-label="Bajar paso"
        :disabled="index === items.length - 1"
        @click="move(index, 1)"
      >
        ↓
      </button>
      <button
        class="row-action"
        type="button"
        aria-label="Quitar paso"
        :disabled="items.length <= 2"
        @click="removeStep(index)"
      >
        ×
      </button>
    </div>

    <UiButton variant="ghost" @click="addStep">Agregar paso</UiButton>
  </div>
</template>

<style scoped>
.ordering-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.hint {
  margin: -0.25rem 0 0.15rem;
  font-size: 0.8rem;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
}

.step-number {
  width: 1.5rem;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.step-text {
  flex: 1;
  min-width: 0;
}
</style>
