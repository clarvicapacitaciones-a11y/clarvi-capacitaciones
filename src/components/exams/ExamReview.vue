<script setup lang="ts">
// Repaso del examen entregado: qué contestó la persona, qué era lo correcto y
// la explicación del instructor.

import UiBadge from '@/components/ui/UiBadge.vue'
import {
  isFillBlankContent,
  isMatchingContent,
  isOptionsContent,
  isOrderingContent,
  type AnswerKey,
  type ExamItem,
  type QuestionContent,
  type QuestionResponse,
  type QuestionType,
  type ReviewItem,
} from '@/types/exams'

defineProps<{ review: ReviewItem[] }>()

const SIN_RESPUESTA = ['Sin responder']

function textOf(items: ExamItem[], id: string | undefined): string {
  return items.find((item) => item.id === id)?.text ?? '—'
}

/** Describe una respuesta (la del usuario o la correcta) como renglones. */
function describe(
  type: QuestionType,
  content: QuestionContent,
  answer: QuestionResponse | AnswerKey,
): string[] {
  const value = answer as Record<string, unknown>

  switch (type) {
    case 'true_false': {
      if (typeof value.value !== 'boolean') return SIN_RESPUESTA
      return [value.value ? 'Verdadero' : 'Falso']
    }

    case 'multiple_choice': {
      const options = isOptionsContent(content) ? content.options : []
      const id = (value.option_id ?? '') as string
      return id ? [textOf(options, id)] : SIN_RESPUESTA
    }

    case 'multiple_select': {
      const options = isOptionsContent(content) ? content.options : []
      const ids = (value.option_ids ?? []) as string[]
      return ids.length ? ids.map((id) => textOf(options, id)) : SIN_RESPUESTA
    }

    case 'matching': {
      if (!isMatchingContent(content)) return SIN_RESPUESTA
      const pairs = (value.pairs ?? {}) as Record<string, string>
      const rows = content.left.map(
        (left) => `${left.text} → ${textOf(content.right, pairs[left.id])}`,
      )
      return rows.length ? rows : SIN_RESPUESTA
    }

    case 'ordering': {
      const items = isOrderingContent(content) ? content.items : []
      const order = (value.order ?? []) as string[]
      return order.length
        ? order.map((id, index) => `${index + 1}. ${textOf(items, id)}`)
        : SIN_RESPUESTA
    }

    case 'fill_blank': {
      if (!isFillBlankContent(content)) return SIN_RESPUESTA
      // La respuesta del usuario trae una cadena por hueco; la correcta, la
      // lista de formas aceptadas.
      const blanks = (value.blanks ?? {}) as Record<string, string | string[]>
      const rows = content.blanks.map((blank) => {
        const filled = blanks[blank.id]
        const shown = Array.isArray(filled) ? filled.join(' / ') : filled
        return `${blank.id}. ${shown?.trim() ? shown : '—'}`
      })
      return rows.length ? rows : SIN_RESPUESTA
    }
  }
}
</script>

<template>
  <div class="review">
    <article
      v-for="(item, index) in review"
      :key="item.question_id"
      class="review-item"
      :class="{ 'is-correct': item.is_correct }"
    >
      <header class="review-head">
        <span class="review-number">Pregunta {{ index + 1 }}</span>
        <UiBadge :tone="item.is_correct ? 'success' : 'danger'">
          {{ item.points_awarded }} / {{ item.points }}
        </UiBadge>
      </header>

      <p class="review-prompt">{{ item.prompt }}</p>

      <div class="answer-block">
        <span class="answer-label">Tu respuesta</span>
        <ul class="answer-list" :class="{ 'is-wrong': !item.is_correct }">
          <li
            v-for="(line, lineIndex) in describe(item.type, item.content, item.response)"
            :key="lineIndex"
          >
            {{ line }}
          </li>
        </ul>
      </div>

      <div v-if="!item.is_correct" class="answer-block">
        <span class="answer-label">Respuesta correcta</span>
        <ul class="answer-list is-right">
          <li
            v-for="(line, lineIndex) in describe(
              item.type,
              item.content,
              item.correct_answer,
            )"
            :key="lineIndex"
          >
            {{ line }}
          </li>
        </ul>
      </div>

      <p v-if="item.explanation" class="explanation">{{ item.explanation }}</p>
    </article>
  </div>
</template>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* La línea izquierda dice de un vistazo si la respuesta fue correcta. */
.review-item {
  padding: 1rem 1.1rem;
  border-radius: var(--radius-md);
  border: var(--rule);
  border-left: var(--accent-width) solid var(--color-danger);
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.review-item.is-correct {
  border-left-color: var(--color-success);
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.review-number {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
}

.review-prompt {
  margin: 0;
  font-weight: 500;
  color: var(--text-strong);
}

.answer-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.answer-label {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text-muted);
}

.answer-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.92rem;
  color: var(--text-body);
}

.answer-list.is-wrong {
  color: var(--color-danger);
}

.answer-list.is-right {
  color: var(--color-success);
}

.explanation {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  color: var(--text-muted);
  font-style: italic;
}
</style>
