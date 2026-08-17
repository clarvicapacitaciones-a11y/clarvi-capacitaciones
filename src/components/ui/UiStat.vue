<script setup lang="ts">
// Dato suelto del resumen: un número grande con su etiqueta.
//
// La fila de resumen del dashboard se arma con varios de estos, así que el
// tamaño del número y el color de la etiqueta se deciden una vez.

import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/UiIcon.vue'

withDefaults(
  defineProps<{
    label: string
    value: number | string
    /** Se agrega pegado al número (por ejemplo, %). */
    suffix?: string
    icon?: IconName
    tone?: 'neutral' | 'accent' | 'success' | 'danger'
  }>(),
  { suffix: '', tone: 'neutral' },
)
</script>

<template>
  <div class="ui-stat" :class="`tone-${tone}`">
    <span v-if="icon" class="stat-icon" aria-hidden="true">
      <UiIcon :name="icon" :size="16" />
    </span>
    <span class="stat-value">
      {{ value }}<small v-if="suffix">{{ suffix }}</small>
    </span>
    <span class="stat-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.ui-stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.95rem 1.1rem;
  border: var(--rule);
  border-radius: var(--radius-md);
  background: var(--surface-1);
}

.stat-icon {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--text-muted);
  line-height: 1;
}

.stat-value {
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.stat-value small {
  font-size: 0.95rem;
  font-weight: 500;
  margin-left: 0.08em;
}

.stat-label {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.tone-accent .stat-value,
.tone-accent .stat-icon {
  color: var(--accent-ink);
}

.tone-success .stat-value,
.tone-success .stat-icon {
  color: var(--state-success);
}

.tone-danger .stat-value,
.tone-danger .stat-icon {
  color: var(--state-danger);
}
</style>
