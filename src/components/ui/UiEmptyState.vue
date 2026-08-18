<script setup lang="ts">
// Hueco vacío: cuando una lista no tiene nada, se explica por qué y qué va a
// pasar, en vez de dejar la pantalla en blanco.

import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/UiIcon.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: IconName
  }>(),
  { description: '', icon: 'book' },
)
</script>

<template>
  <div class="ui-empty">
    <span class="empty-icon" aria-hidden="true">
      <UiIcon :name="icon" :size="22" :stroke="1.5" />
    </span>
    <p class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-text">{{ description }}</p>
    <div class="empty-actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ui-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1.5rem;
  border: 1px dashed var(--line-mid);
  border-radius: var(--radius-lg);
  background: var(--surface-1);
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 0.9rem;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text-muted);
}

.empty-title {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 600;
}

.empty-text {
  margin: 0.35rem 0 0;
  max-width: 42ch;
  color: var(--text-muted);
  font-size: 0.89rem;
}

.empty-actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 1.1rem;
}

.empty-actions:empty {
  display: none;
}
</style>
