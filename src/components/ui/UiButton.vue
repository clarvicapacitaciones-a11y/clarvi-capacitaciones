<script setup lang="ts">
// Botón de la plataforma. Cuatro variantes y tres tamaños: cualquier acción de
// la app cabe en alguna combinación, y así no aparecen botones sueltos con
// estilos propios.

import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/UiIcon.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'danger' | 'quiet'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
    block?: boolean
    /** Icono a la izquierda del texto. Nunca un emoji: entra por UiIcon. */
    icon?: IconName
    /** Icono a la derecha (flechas de avanzar, por ejemplo). */
    iconEnd?: IconName
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
  },
)
</script>

<template>
  <button
    class="ui-btn"
    :class="[`is-${variant}`, `size-${size}`, { 'is-block': block }]"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="loader" aria-hidden="true">
      <i /><i /><i />
    </span>
    <UiIcon v-else-if="icon" :name="icon" :size="16" />
    <slot />
    <UiIcon v-if="iconEnd && !loading" :name="iconEnd" :size="16" />
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
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.size-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.84rem;
}

.size-md {
  padding: 0.65rem 1.2rem;
  font-size: 0.9rem;
}

.size-lg {
  padding: 0.8rem 1.5rem;
  font-size: 0.98rem;
}

.is-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}

.is-primary:not(:disabled):hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.is-ghost {
  background: var(--surface-1);
  border-color: var(--line);
  color: var(--text-strong);
}

.is-ghost:not(:disabled):hover {
  background: var(--surface-2);
  border-color: var(--line-mid);
}

/* Acción secundaria sin caja: ocupa poco y no compite con el botón principal. */
.is-quiet {
  background: transparent;
  border-color: transparent;
  color: var(--text-muted);
}

.is-quiet:not(:disabled):hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.is-danger {
  background: var(--surface-1);
  border-color: var(--line);
  color: var(--state-danger);
}

.is-danger:not(:disabled):hover {
  background: var(--state-danger-bg);
  border-color: var(--state-danger-bg);
}

/* Deshabilitado explícito y plano (sin opacidad), después de las variantes
   para ganarles en especificidad. */
.ui-btn:disabled {
  background: var(--surface-2);
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

@media (prefers-reduced-motion: reduce) {
  .loader i {
    animation: none;
  }
}
</style>
