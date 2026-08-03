<script setup lang="ts">
defineProps<{
  /** Marca el borde al pasar el cursor (para tarjetas clicables). */
  hoverable?: boolean
}>()
</script>

<template>
  <div class="ui-card" :class="{ 'is-hoverable': hoverable }">
    <slot />
  </div>
</template>

<style scoped>
/* Superficie plana con esquinas redondeadas: fondo sólido y línea suave.
   Sin sombra ni blur; lo que la separa del fondo es el contorno. */
.ui-card {
  background: var(--bg-surface);
  border: var(--rule);
  border-radius: var(--radius-lg);
  padding: 1.35rem;
  transition: border-color var(--transition-fast);
}

.ui-card.is-hoverable:hover {
  border-color: var(--line-mid);
}
</style>
