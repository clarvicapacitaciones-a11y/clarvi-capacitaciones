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
/* Etiqueta en píldora: fondo tenue del estado y texto en altas y bajas. */
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.65rem;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.35;
  white-space: nowrap;
}

.is-neutral {
  background: var(--bg-subtle);
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
