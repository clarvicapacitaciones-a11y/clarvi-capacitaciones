<script setup lang="ts">
// Encabezado de una sección del dashboard: título, cuántas cosas hay y una
// línea que explica qué junta esa sección.
//
// Existe como componente para que todas las secciones alineen igual y para
// que el punto de "en vivo" no se reinvente en cada pantalla.

import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/UiIcon.vue'

withDefaults(
  defineProps<{
    title: string
    hint?: string
    /** Cuántos elementos trae la sección; se pinta como pastilla. */
    count?: number
    icon?: IconName
    /** Marca la sección que está pasando ahora (transmisión al aire). */
    live?: boolean
  }>(),
  { hint: '', live: false },
)
</script>

<template>
  <div class="section-header">
    <div class="heading">
      <span v-if="live" class="live-dot" aria-hidden="true" />
      <UiIcon v-else-if="icon" :name="icon" :size="18" class="heading-icon" />
      <h2>{{ title }}</h2>
      <span v-if="count !== undefined" class="count">{{ count }}</span>
      <div class="actions">
        <slot name="actions" />
      </div>
    </div>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.section-header {
  margin-bottom: 1.15rem;
}

.heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.heading h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.heading-icon {
  color: var(--text-muted);
}

/* Punto sólido de "al aire": color, sin parpadeo ni movimiento. */
.live-dot {
  width: 9px;
  height: 9px;
  border-radius: var(--radius-full);
  background: var(--state-danger);
  flex-shrink: 0;
}

.count {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.45rem;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.actions:empty {
  display: none;
}

.hint {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}
</style>
