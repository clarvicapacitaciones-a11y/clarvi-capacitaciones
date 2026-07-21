<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'danger'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false, loading: false, block: false },
)
</script>

<template>
  <button
    class="glass-btn"
    :class="[`is-${variant}`, { 'is-block': block }]"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.glass-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1.15rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font: inherit;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast),
    color var(--transition-fast);
}

.glass-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.glass-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.glass-btn:not(:disabled):active {
  transform: translateY(0) scale(0.98);
}

.is-primary {
  background: linear-gradient(135deg, var(--clarvi-blue), var(--clarvi-navy));
  color: var(--text-inverse);
  box-shadow: 0 4px 14px rgba(var(--clarvi-blue-rgb), 0.35);
}

.is-primary:not(:disabled):hover {
  box-shadow: 0 6px 18px rgba(var(--clarvi-blue-rgb), 0.45);
}

.is-ghost {
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(var(--clarvi-navy-rgb), 0.18);
  color: var(--clarvi-navy);
  backdrop-filter: blur(6px);
}

.is-ghost:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(var(--clarvi-blue-rgb), 0.45);
}

.is-danger {
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(220, 38, 38, 0.35);
  color: var(--color-danger);
}

.is-danger:not(:disabled):hover {
  background: var(--color-danger-bg);
}

.is-block {
  width: 100%;
}

.spinner {
  width: 0.95em;
  height: 0.95em;
  border: 2px solid currentColor;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Única animación en loop permitida: el spinner de carga, visible solo
   durante una acción en curso. */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
