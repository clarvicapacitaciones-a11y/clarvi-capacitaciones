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
/* Superficie plana: fondo sólido y una línea de 1px. Sin sombra ni blur;
   lo que separa la tarjeta del fondo es el contorno. */
.ui-card {
  background: var(--bg-surface);
  border: var(--rule);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  transition: border-color var(--transition-fast);
}

.ui-card.is-hoverable:hover {
  border-color: var(--clarvi-navy);
}
</style>
