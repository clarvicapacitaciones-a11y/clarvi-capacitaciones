<script setup lang="ts">
// Avatar de iniciales. No hay fotos de perfil en la plataforma, así que la
// identidad visual de una persona son sus dos iniciales sobre un círculo.

import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string | null
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { name: '', size: 'md' },
)

/** Dos iniciales como mucho; si no hay nombre, un guion discreto. */
const initials = computed(() => {
  const parts = (props.name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '–'
})
</script>

<template>
  <span class="ui-avatar" :class="`is-${size}`" aria-hidden="true">
    {{ initials }}
  </span>
</template>

<style scoped>
.ui-avatar {
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.is-sm {
  width: 1.7rem;
  height: 1.7rem;
  font-size: 0.7rem;
}

.is-md {
  width: 2.1rem;
  height: 2.1rem;
  font-size: 0.8rem;
}

.is-lg {
  width: 3rem;
  height: 3rem;
  font-size: 1.05rem;
}
</style>
