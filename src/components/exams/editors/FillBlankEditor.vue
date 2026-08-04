<script setup lang="ts">
// Editor de "completar la frase": se escribe la frase marcando los huecos con
// {{1}}, {{2}}… y se capturan las respuestas aceptadas de cada uno. La
// comparación del servidor ignora mayúsculas, acentos y espacios de sobra.

import { computed, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  blankIdsFromText,
  type ExamQuestionDraft,
  type FillBlankContent,
  type FillBlankKey,
} from '@/types/exams'

const question = defineModel<ExamQuestionDraft>({ required: true })

const content = computed(() => question.value.content as FillBlankContent)

const text = computed({
  get: () => content.value.text ?? '',
  set: (value: string) => {
    content.value.text = value
  },
})

const blankIds = computed(() => blankIdsFromText(text.value))

/** Respuestas aceptadas de un hueco, como texto separado por comas. */
function acceptedFor(blankId: string): string {
  const blanks = (question.value.answer_key as FillBlankKey).blanks ?? {}
  return (blanks[blankId] ?? []).join(', ')
}

function setAccepted(blankId: string, value: string): void {
  const blanks = { ...((question.value.answer_key as FillBlankKey).blanks ?? {}) }
  blanks[blankId] = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
  question.value.answer_key = { blanks }
}

/** Los marcadores llevan llaves dobles; se arman aquí para no meterlos en la
 *  plantilla, donde chocarían con la interpolación de Vue. */
function tagFor(blankId: string): string {
  return `{{${blankId}}}`
}

const SAMPLE_PHRASE =
  `El límite de exposición al cloro gas es de ${tagFor('1')} ppm ` +
  `durante ${tagFor('2')} minutos.`

function addBlank(): void {
  // Siguiente número libre, para no repetir un hueco que ya está en la frase.
  let next = 1
  while (blankIds.value.includes(String(next))) next += 1
  text.value = `${text.value}{{${next}}}`
}

// Los huecos declarados y sus respuestas siguen a la frase: si se borra
// {{2}} del texto, deja de pedirse su respuesta.
watch(
  blankIds,
  (ids) => {
    content.value.blanks = ids.map((id) => ({ id }))
    const previous = (question.value.answer_key as FillBlankKey).blanks ?? {}
    const blanks: Record<string, string[]> = {}
    for (const id of ids) blanks[id] = previous[id] ?? ['']
    question.value.answer_key = { blanks }
  },
  { immediate: true },
)
</script>

<template>
  <div class="blank-editor">
    <label class="field-block">
      <span class="field-label">Frase con huecos</span>
      <textarea
        v-model="text"
        class="field-textarea"
        rows="3"
        :placeholder="SAMPLE_PHRASE"
      />
    </label>

    <UiButton variant="ghost" @click="addBlank">Agregar hueco</UiButton>

    <template v-if="blankIds.length">
      <span class="field-label answers-label">Respuestas aceptadas</span>
      <p class="muted hint">
        Separa varias formas válidas con coma. No importan mayúsculas, acentos
        ni espacios de más.
      </p>
      <div v-for="blankId in blankIds" :key="blankId" class="blank-row">
        <span class="blank-tag">{{ tagFor(blankId) }}</span>
        <input
          class="field-input blank-input"
          type="text"
          placeholder="0.5, 0,5"
          :value="acceptedFor(blankId)"
          @input="setAccepted(blankId, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </template>

    <p v-else class="muted hint">
      Marca al menos un hueco en la frase, por ejemplo
      <code>{{ tagFor('1') }}</code
      >.
    </p>
  </div>
</template>

<style scoped>
.blank-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.hint {
  margin: -0.25rem 0 0.15rem;
  font-size: 0.8rem;
}

.answers-label {
  margin-top: 0.6rem;
}

.blank-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}

.blank-tag {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--clarvi-blue-ink);
  background: var(--color-info-bg);
  border: 1px solid var(--blue-100);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.blank-input {
  flex: 1;
  min-width: 0;
}
</style>
