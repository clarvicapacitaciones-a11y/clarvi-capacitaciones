<script setup lang="ts">
// Etiqueta de estado en píldora. Es el vocabulario con el que la plataforma
// dice "en vivo", "examen aprobado" o "pendiente", así que el color de cada
// estado se decide aquí y no en cada pantalla.

import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/UiIcon.vue'

withDefaults(
  defineProps<{
    tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent'
    /** `soft` es fondo tenue (lo normal); `solid` se reserva para lo urgente. */
    variant?: 'soft' | 'solid' | 'outline'
    icon?: IconName
    /** Punto de color antes del texto, para estados que ocurren ahora. */
    dot?: boolean
  }>(),
  { tone: 'neutral', variant: 'soft', dot: false },
)
</script>

<template>
  <span class="ui-badge" :class="[`is-${tone}`, `variant-${variant}`]">
    <span v-if="dot" class="badge-dot" aria-hidden="true" />
    <UiIcon v-else-if="icon" :name="icon" :size="13" :stroke="1.9" />
    <slot />
  </span>
</template>

<style scoped>
/* Píldora con fondo tenue del estado y texto en altas y bajas. */
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  padding: 0.22rem 0.65rem;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.35;
  white-space: nowrap;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
}

/* ── Variante tenue (la de siempre) ── */

.variant-soft.is-neutral {
  background: var(--surface-2);
  color: var(--text-muted);
}

.variant-soft.is-info {
  background: var(--state-info-bg);
  color: var(--state-info);
}

.variant-soft.is-accent {
  background: var(--accent-soft);
  color: var(--accent-ink);
}

.variant-soft.is-success {
  background: var(--state-success-bg);
  color: var(--state-success);
}

.variant-soft.is-warning {
  background: var(--state-warning-bg);
  color: var(--state-warning);
}

.variant-soft.is-danger {
  background: var(--state-danger-bg);
  color: var(--state-danger);
}

/* ── Variante sólida: solo para lo que está pasando ahora ── */

.variant-solid {
  color: var(--text-inverse);
}

.variant-solid.is-neutral {
  background: var(--text-muted);
}

.variant-solid.is-info,
.variant-solid.is-accent {
  background: var(--accent-fill);
}

.variant-solid.is-success {
  background: var(--state-success);
}

.variant-solid.is-warning {
  background: var(--state-warning);
}

.variant-solid.is-danger {
  background: var(--state-danger);
}

/* ── Variante de contorno: cuando la píldora va sobre una imagen o superficie
      que ya tiene color ── */

.variant-outline {
  background: var(--surface-1);
  border-color: var(--line-mid);
  color: var(--text-body);
}

.variant-outline.is-info,
.variant-outline.is-accent {
  border-color: var(--accent-line);
  color: var(--accent-ink);
}

.variant-outline.is-success {
  border-color: var(--state-success);
  color: var(--state-success);
}

.variant-outline.is-warning {
  border-color: var(--state-warning);
  color: var(--state-warning);
}

.variant-outline.is-danger {
  border-color: var(--state-danger);
  color: var(--state-danger);
}
</style>
