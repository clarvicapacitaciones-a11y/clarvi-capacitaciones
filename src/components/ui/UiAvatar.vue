<script setup lang="ts">
// Avatar de iniciales. No hay fotos de perfil en la plataforma, así que la
// identidad visual de una persona son sus dos iniciales sobre el círculo de
// acento.

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
  background: var(--accent);
  color: var(--accent-contrast);
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  transition: background-color var(--transition-fast);
}

.is-sm {
  width: 26px;
  height: 26px;
  font-size: 10px;
}

/* 32px: el de la barra superior. */
.is-md {
  width: 32px;
  height: 32px;
  font-size: 11.5px;
}

.is-lg {
  width: 48px;
  height: 48px;
  font-size: 16px;
}
</style>
