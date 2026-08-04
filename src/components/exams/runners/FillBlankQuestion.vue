<script setup lang="ts">
// Completar la frase: la frase se parte por los marcadores {{n}} y en cada
// hueco se intercala un campo de texto.

import { computed } from 'vue'
import {
  isFillBlankContent,
  splitBlanks,
  type QuestionResponse,
  type RunnerQuestion,
} from '@/types/exams'

const props = defineProps<{ question: RunnerQuestion }>()
const response = defineModel<QuestionResponse>({ required: true })

const content = computed(() =>
  isFillBlankContent(props.question.content) ? props.question.content : null,
)

const segments = computed(() => splitBlanks(content.value?.text ?? ''))

const wordBank = computed(() => content.value?.word_bank ?? [])

const blanks = computed<Record<string, string>>(
  () => (response.value as { blanks?: Record<string, string> }).blanks ?? {},
)

function setBlank(blankId: string, value: string): void {
  response.value = { blanks: { ...blanks.value, [blankId]: value } }
}
</script>

<template>
  <div class="blank-question">
    <p class="phrase">
      <template v-for="(segment, index) in segments" :key="index">
        <span v-if="segment.kind === 'text'">{{ segment.text }}</span>
        <input
          v-else
          class="field-input blank-input"
          type="text"
          autocomplete="off"
          :aria-label="`Hueco ${segment.id}`"
          :value="blanks[segment.id] ?? ''"
          @input="setBlank(segment.id, ($event.target as HTMLInputElement).value)"
        />
      </template>
    </p>

    <div v-if="wordBank.length" class="word-bank">
      <span class="muted">Palabras sugeridas:</span>
      <span v-for="word in wordBank" :key="word" class="word">{{ word }}</span>
    </div>
  </div>
</template>

<style scoped>
.blank-question {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.phrase {
  margin: 0;
  font-size: 1.05rem;
  line-height: 2.4;
  color: var(--text-body);
}

.blank-input {
  display: inline-block;
  width: 9rem;
  max-width: 100%;
  padding: 0.35rem 0.6rem;
  margin: 0 0.15rem;
  vertical-align: baseline;
}

.word-bank {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.word {
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--blue-100);
  border-radius: var(--radius-full);
  background: var(--color-info-bg);
  color: var(--clarvi-navy);
  font-size: 0.82rem;
  font-weight: 600;
}
</style>
