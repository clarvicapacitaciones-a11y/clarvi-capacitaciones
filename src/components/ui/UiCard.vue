<script setup lang="ts">
// Superficie base de la plataforma. Todo lo que se apoya sobre el fondo de
// página (tarjetas, paneles, bloques de datos) sale de aquí, así que el
// redondeo, el borde y el relleno son los mismos en toda la app.
//
// Puede ser un <div>, un <article> o un enlace de ruta: pasándole `to` se
// vuelve navegable sin que quien la usa tenga que envolver nada.

import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(
  defineProps<{
    /** Convierte la tarjeta en un enlace a esa ruta. */
    to?: RouteLocationRaw
    padding?: 'none' | 'sm' | 'md' | 'lg'
    /** Reacciona al cursor: se usa en tarjetas que llevan a algún lado. */
    interactive?: boolean
    /** Superficie tenue de acento, para destacar una tarjeta entre iguales. */
    tone?: 'default' | 'accent'
    /** Franja de color al borde superior (estado destacado). */
    accentBar?: boolean
    /** Etiqueta de la tarjeta cuando es un `article` con nombre propio. */
    as?: 'div' | 'article' | 'section'
    /** @deprecated Usa `interactive`. Se mantiene por las vistas antiguas. */
    hoverable?: boolean
  }>(),
  { padding: 'md', interactive: false, tone: 'default', accentBar: false, as: 'div', hoverable: false },
)

const tag = computed(() => (props.to ? RouterLink : props.as))

const isInteractive = computed(
  () => props.interactive || props.hoverable || props.to !== undefined,
)
</script>

<template>
  <component
    :is="tag"
    :to="to"
    class="ui-card"
    :class="[
      `pad-${padding}`,
      `tone-${tone}`,
      { 'is-interactive': isInteractive, 'has-accent-bar': accentBar },
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
/* Superficie plana con esquinas redondeadas: fondo sólido y línea suave.
   Sin sombra ni blur; lo que la separa del fondo es el contorno. */
.ui-card {
  position: relative;
  display: block;
  background: var(--surface-1);
  border: var(--rule);
  border-radius: var(--radius-lg);
  color: inherit;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.pad-none {
  padding: 0;
}

.pad-sm {
  padding: 0.9rem 1rem;
}

.pad-md {
  padding: 1.35rem;
}

.pad-lg {
  padding: 1.75rem;
}

.tone-accent {
  background: var(--accent-soft);
  border-color: var(--accent-line);
}

.is-interactive:hover {
  border-color: var(--line-mid);
}

.tone-accent.is-interactive:hover {
  border-color: var(--accent-fill);
}

/* Franja superior de color: marca una tarjeta sin cambiarle el fondo. */
.has-accent-bar::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  height: var(--accent-width);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--accent-fill);
}
</style>
