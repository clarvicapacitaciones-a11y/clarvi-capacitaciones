<script setup lang="ts">
// Editor de "relacionar conceptos": se capturan parejas y, opcionalmente,
// distractores (conceptos de la derecha que no emparejan con nada). Al usuario
// el servidor le baraja siempre la columna derecha.

import { computed } from 'vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import {
  newItemId,
  type ExamItem,
  type ExamQuestionDraft,
  type MatchingContent,
  type MatchingKey,
} from '@/types/exams'

const question = defineModel<ExamQuestionDraft>({ required: true })

const content = computed(() => question.value.content as MatchingContent)
const pairs = computed(() => (question.value.answer_key as MatchingKey).pairs ?? {})

/** Parejas capturadas: cada concepto de la izquierda con el que le toca. */
const rows = computed(() =>
  content.value.left.map((left) => ({
    left,
    right: content.value.right.find((item) => item.id === pairs.value[left.id]) ?? null,
  })),
)

/** Conceptos de la derecha que no son la respuesta de nadie. */
const distractors = computed(() =>
  content.value.right.filter(
    (item) => !Object.values(pairs.value).includes(item.id),
  ),
)

function addPair(): void {
  const left: ExamItem = { id: newItemId(), text: '' }
  const right: ExamItem = { id: newItemId(), text: '' }
  content.value.left.push(left)
  content.value.right.push(right)
  question.value.answer_key = { pairs: { ...pairs.value, [left.id]: right.id } }
}

function removePair(index: number): void {
  const row = rows.value[index]
  if (!row) return
  content.value.left = content.value.left.filter((item) => item.id !== row.left.id)
  content.value.right = content.value.right.filter(
    (item) => item.id !== row.right?.id,
  )
  const next = { ...pairs.value }
  delete next[row.left.id]
  question.value.answer_key = { pairs: next }
}

function addDistractor(): void {
  content.value.right.push({ id: newItemId(), text: '' })
}

function removeDistractor(id: string): void {
  content.value.right = content.value.right.filter((item) => item.id !== id)
}
</script>

<template>
  <div class="matching-editor">
    <span class="field-label">Parejas correctas</span>
    <p class="muted hint">
      Captura cada concepto con su pareja. Al aplicar el examen la columna
      derecha se muestra revuelta.
    </p>

    <div v-for="(row, index) in rows" :key="row.left.id" class="pair-row">
      <input
        v-model="row.left.text"
        class="field-input"
        type="text"
        :placeholder="`Concepto ${index + 1}`"
      />
      <span class="pair-arrow" aria-hidden="true">→</span>
      <input
        v-if="row.right"
        v-model="row.right.text"
        class="field-input"
        type="text"
        :placeholder="`Corresponde a ${index + 1}`"
      />
      <button
        class="row-action"
        type="button"
        aria-label="Quitar pareja"
        :disabled="rows.length <= 2"
        @click="removePair(index)"
      >
        ×
      </button>
    </div>

    <GlassButton variant="ghost" @click="addPair">Agregar pareja</GlassButton>

    <span class="field-label distractor-label">Distractores (opcional)</span>
    <p class="muted hint">
      Conceptos que aparecen en la columna derecha pero no son la respuesta de
      ninguno.
    </p>

    <div v-for="item in distractors" :key="item.id" class="pair-row">
      <input
        v-model="item.text"
        class="field-input distractor-input"
        type="text"
        placeholder="Concepto que no empareja"
      />
      <button
        class="row-action"
        type="button"
        aria-label="Quitar distractor"
        @click="removeDistractor(item.id)"
      >
        ×
      </button>
    </div>

    <GlassButton variant="ghost" @click="addDistractor">
      Agregar distractor
    </GlassButton>
  </div>
</template>

<style scoped>
.matching-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.hint {
  margin: -0.25rem 0 0.15rem;
  font-size: 0.8rem;
}

.pair-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.pair-row .field-input {
  flex: 1;
  min-width: 0;
}

.pair-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

.distractor-label {
  margin-top: 0.6rem;
}

.distractor-input {
  max-width: 50%;
}
</style>
