<script setup lang="ts">
// Buscador en píldora. Vive en la barra superior, pero está escrito para
// cualquier superficie: el tono decide si se pinta sobre la barra navy
// (`header`) o sobre el fondo de la página (`surface`).

import UiIcon from '@/components/ui/UiIcon.vue'

withDefaults(
  defineProps<{
    placeholder?: string
    /** Rótulo para lectores de pantalla; el campo no lleva etiqueta visible. */
    label?: string
    tone?: 'header' | 'surface'
  }>(),
  { placeholder: 'Buscar cursos', label: 'Buscar cursos', tone: 'header' },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="search" :class="`tone-${tone}`">
    <span class="visually-hidden">{{ label }}</span>
    <UiIcon name="search" :size="15" class="search-icon" />
    <input
      v-model="model"
      class="search-input"
      type="search"
      :placeholder="placeholder"
      autocomplete="off"
    />
  </label>
</template>

<style scoped>
.search {
  display: inline-flex;
  align-items: center;
  gap: var(--s-9);
  padding: 0 var(--s-14);
  height: 36px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.search-icon {
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: none;
  font: inherit;
  font-size: 13px;
  width: 190px;
  max-width: 100%;
  padding: 0;
}

.search-input:focus {
  outline: none;
}

/* La equis nativa de los campos `search` se pinta a su aire en cada
   navegador; el sistema no la usa. */
.search-input::-webkit-search-decoration,
.search-input::-webkit-search-cancel-button {
  appearance: none;
}

/* ── Sobre la barra navy ── */

.tone-header {
  background: var(--on-header-soft);
  border-color: rgba(255, 255, 255, 0.14);
  color: var(--on-header-muted);
}

.tone-header:focus-within {
  border-color: var(--accent-fill);
}

.tone-header .search-input {
  color: var(--on-header);
}

.tone-header .search-input::placeholder {
  color: var(--on-header-muted);
}

/* ── Sobre el fondo de la página ── */

.tone-surface {
  background: var(--surface-1);
  border-color: var(--line);
  color: var(--text-muted);
}

.tone-surface:hover {
  border-color: var(--line-mid);
}

.tone-surface:focus-within {
  border-color: var(--accent-fill);
}

.tone-surface .search-input {
  color: var(--text-strong);
}

.tone-surface .search-input::placeholder {
  color: var(--text-muted);
}
</style>
