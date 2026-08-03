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
    class="ui-btn"
    :class="[`is-${variant}`, { 'is-block': block }]"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="loader" aria-hidden="true">
      <i /><i /><i />
    </span>
    <slot />
  </button>
</template>

<style scoped>
/* Botón plano con esquinas redondeadas. Texto en altas y bajas: el peso y
   el color hacen la jerarquía, no las mayúsculas. */
.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.2rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.is-primary {
  background: var(--clarvi-navy);
  border-color: var(--clarvi-navy);
  color: var(--text-inverse);
}

.is-primary:not(:disabled):hover {
  background: var(--clarvi-navy-soft);
  border-color: var(--clarvi-navy-soft);
}

.is-ghost {
  background: var(--bg-surface);
  border-color: var(--line);
  color: var(--text-strong);
}

.is-ghost:not(:disabled):hover {
  background: var(--bg-subtle);
  border-color: var(--line-mid);
}

.is-danger {
  background: var(--bg-surface);
  border-color: var(--line);
  color: var(--color-danger);
}

.is-danger:not(:disabled):hover {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-bg);
}

/* Deshabilitado explícito y plano (sin opacidad), después de las variantes
   para ganarles en especificidad. */
.ui-btn:disabled {
  background: var(--bg-subtle);
  border-color: var(--line);
  color: var(--text-muted);
  cursor: not-allowed;
}

.is-block {
  width: 100%;
}

/* Indicador de carga: tres puntos que solo cambian de color, sin giro. */
.loader {
  display: inline-flex;
  align-items: center;
  gap: 0.22em;
}

.loader i {
  width: 0.3em;
  height: 0.3em;
  border-radius: var(--radius-full);
  background: currentColor;
  animation: blink 0.9s steps(1, end) infinite;
}

.loader i:nth-child(2) {
  animation-delay: 0.15s;
}

.loader i:nth-child(3) {
  animation-delay: 0.3s;
}

/* Única animación en loop del sistema: es un cambio de color a pasos,
   visible solo durante una acción en curso. */
@keyframes blink {
  0%,
  49% {
    background: currentColor;
  }
  50%,
  100% {
    background: transparent;
  }
}
</style>
