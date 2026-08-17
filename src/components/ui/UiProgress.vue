<script setup lang="ts">
// Barra de avance. La usan la tarjeta de capacitación, la ficha y el examen,
// así que el grosor, el color y el redondeo se deciden una sola vez.

import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Avance de 0 a 100. Se recorta solo si llega fuera de rango. */
    value: number
    /** Muestra el porcentaje a la derecha de la barra. */
    showValue?: boolean
    size?: 'sm' | 'md'
    /** Sin tono explícito, al 100% la barra se pone en verde sola. */
    tone?: 'accent' | 'success'
    label?: string
  }>(),
  { showValue: false, size: 'sm', label: 'Avance' },
)

const percent = computed(() =>
  Math.max(0, Math.min(100, Math.round(props.value || 0))),
)

const resolvedTone = computed(
  () => props.tone ?? (percent.value >= 100 ? 'success' : 'accent'),
)
</script>

<template>
  <div class="ui-progress" :class="`is-${size}`">
    <div
      class="track"
      :class="`tone-${resolvedTone}`"
      role="progressbar"
      :aria-label="label"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span class="fill" :style="{ width: `${percent}%` }" />
    </div>
    <span v-if="showValue" class="value">{{ percent }}%</span>
  </div>
</template>

<style scoped>
.ui-progress {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.track {
  flex: 1;
  min-width: 60px;
  border-radius: var(--radius-full);
  background: var(--surface-3);
  overflow: hidden;
}

.is-sm .track {
  height: 4px;
}

.is-md .track {
  height: 7px;
}

.fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  transition: background-color var(--transition-fast);
}

.tone-accent .fill {
  background: var(--accent-fill);
}

.tone-success .fill {
  background: var(--state-success);
}

.value {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
</style>
