<script setup lang="ts">
// Muestra la pregunta que toca y despacha al componente de su tipo.

import { computed } from 'vue'
import ChoiceQuestion from '@/components/exams/runners/ChoiceQuestion.vue'
import FillBlankQuestion from '@/components/exams/runners/FillBlankQuestion.vue'
import MatchingQuestion from '@/components/exams/runners/MatchingQuestion.vue'
import OrderingQuestion from '@/components/exams/runners/OrderingQuestion.vue'
import { QUESTION_TYPE_LABELS, type QuestionResponse, type RunnerQuestion } from '@/types/exams'

const props = defineProps<{ question: RunnerQuestion }>()
const response = defineModel<QuestionResponse>({ required: true })

const runners = {
  multiple_choice: ChoiceQuestion,
  multiple_select: ChoiceQuestion,
  true_false: ChoiceQuestion,
  matching: MatchingQuestion,
  ordering: OrderingQuestion,
  fill_blank: FillBlankQuestion,
} as const

const runnerComponent = computed(() => runners[props.question.type])
</script>

<template>
  <div class="question-runner">
    <header class="question-head">
      <span class="type-tag">{{ QUESTION_TYPE_LABELS[question.type] }}</span>
      <span class="muted points">
        {{ question.points }} {{ question.points === 1 ? 'punto' : 'puntos' }}
      </span>
    </header>

    <h2 class="prompt">{{ question.prompt }}</h2>

    <!-- key por pregunta: sin esto, al pasar de una pregunta de ordenar a otra
         del mismo tipo se reusaría la instancia y arrastraría su estado. -->
    <component
      :is="runnerComponent"
      :key="question.id"
      v-model="response"
      :question="question"
    />
  </div>
</template>

<style scoped>
.question-runner {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.question-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.type-tag {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--clarvi-blue-ink);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}

.points {
  font-size: 0.82rem;
}

.prompt {
  margin: 0;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: var(--text-strong);
}
</style>
