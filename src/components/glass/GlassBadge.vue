<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="glass-badge" :class="`is-${tone}`">
    <slot />
  </span>
</template>

<style scoped>
.glass-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.65rem;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.is-neutral {
  background: rgba(var(--clarvi-navy-rgb), 0.08);
  color: var(--text-muted);
}

.is-info {
  background: var(--color-info-bg);
  color: var(--clarvi-blue);
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
