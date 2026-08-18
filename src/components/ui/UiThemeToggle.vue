<script setup lang="ts">
// Interruptor de tema del encabezado.
//
// Un solo botón, no un menú de tres opciones: la plataforma abre en oscuro y
// lo único que hace falta es poder encender la luz. El icono muestra a dónde
// va el cambio (sol = pasar a claro), que es lo que la gente espera de un
// botón, y el texto accesible lo dice completo.

import { useTheme } from '@/composables/useTheme'
import UiIcon from '@/components/ui/UiIcon.vue'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    :title="isDark ? 'Modo claro' : 'Modo oscuro'"
    @click="toggleTheme"
  >
    <UiIcon :name="isDark ? 'sun' : 'moon'" :size="18" />
  </button>
</template>

<style scoped>
/* Mismo tamaño y comportamiento que la campana: los dos botones redondos del
   encabezado tienen que verse hermanos. */
.theme-toggle {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--bg-subtle);
  color: var(--text-strong);
}
</style>
