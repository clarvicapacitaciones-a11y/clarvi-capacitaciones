<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="ui-badge" :class="`is-${tone}`">
    <slot />
  </span>
</template>

<style scoped>
/* Etiqueta plana: rectángulo con contorno del propio color del estado
   y fondo sólido tenue. */
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.16rem 0.5rem;
  border: 1px solid currentColor;
  border-radius: var(--radius-full);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  white-space: nowrap;
}

.is-neutral {
  background: var(--bg-subtle);
  border-color: var(--line-mid);
  color: var(--text-muted);
}

.is-info {
  background: var(--color-info-bg);
  color: var(--clarvi-blue-ink);
}

.is-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.is-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.is-danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
</style>
