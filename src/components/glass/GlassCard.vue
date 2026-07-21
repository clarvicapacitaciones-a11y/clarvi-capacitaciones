<script setup lang="ts">
defineProps<{
  /** Eleva la tarjeta al pasar el cursor (para tarjetas clicables). */
  hoverable?: boolean
}>()
</script>

<template>
  <div class="glass-card" :class="{ 'is-hoverable': hoverable }">
    <slot />
  </div>
</template>

<style scoped>
.glass-card {
  background: var(--glass-bg);
  border: var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 1.25rem;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.glass-card.is-hoverable:hover {
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow-hover);
}
</style>
