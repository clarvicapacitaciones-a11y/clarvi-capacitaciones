<script setup lang="ts">
// Áreas a las que aplica una capacitación. Sin ninguna marcada es para todo
// el personal, que es lo que conviene por omisión: es preferible que alguien
// vea una capacitación de más a que no le llegue la que sí le tocaba.

import { computed, onMounted } from 'vue'
import { useCatalogsStore } from '@/stores/catalogs.store'

const selected = defineModel<string[]>({ required: true })

const catalogs = useCatalogsStore()

onMounted(() => {
  void catalogs.fetchCatalogs()
})

/** Áreas activas, más las inactivas que esta capacitación ya tenía marcadas. */
const options = computed(() =>
  catalogs.areas.filter(
    (area) => area.activo || selected.value.includes(area.id),
  ),
)

const isForEveryone = computed(() => selected.value.length === 0)

function toggle(areaId: string): void {
  selected.value = selected.value.includes(areaId)
    ? selected.value.filter((id) => id !== areaId)
    : [...selected.value, areaId]
}

function clearAll(): void {
  selected.value = []
}
</script>

<template>
  <div class="area-selector">
    <span class="field-label">Áreas a las que aplica</span>

    <div class="chips">
      <button
        class="chip"
        :class="{ 'is-active': isForEveryone }"
        type="button"
        :aria-pressed="isForEveryone"
        @click="clearAll"
      >
        Todo el personal
      </button>
      <button
        v-for="area in options"
        :key="area.id"
        class="chip"
        :class="{
          'is-active': selected.includes(area.id),
          'is-inactive': !area.activo,
        }"
        type="button"
        :aria-pressed="selected.includes(area.id)"
        @click="toggle(area.id)"
      >
        {{ area.nombre }}
        <span v-if="!area.activo" class="inactive-tag">(inactiva)</span>
      </button>
    </div>

    <p class="muted hint">
      <template v-if="isForEveryone">
        Todos la verán en su dashboard.
      </template>
      <template v-else>
        Solo la verá quien pertenezca a
        {{ selected.length === 1 ? 'esa área' : 'alguna de esas áreas' }}.
      </template>
    </p>
  </div>
</template>

<style scoped>
.area-selector {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-full);
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.14);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.chip:hover {
  border-color: rgba(var(--clarvi-blue-rgb), 0.45);
}

.chip.is-active {
  background: linear-gradient(135deg, var(--clarvi-blue), var(--clarvi-navy));
  border-color: transparent;
  color: #fff;
}

.chip.is-inactive {
  font-style: italic;
}

.inactive-tag {
  font-size: 0.76rem;
  opacity: 0.75;
}

.hint {
  margin: 0;
  font-size: 0.8rem;
}
</style>
