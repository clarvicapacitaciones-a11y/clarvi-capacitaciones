<script setup lang="ts">
// Regreso a la pantalla anterior. Sirve tanto para navegar a una ruta fija
// (`to`) como para volver en el historial: sin `to`, emite `click` y lo
// resuelve quien lo usa.
//
// Es un componente porque la flecha, el espaciado y el color del hover deben
// ser idénticos en toda la plataforma, y porque así la flecha es un SVG y no
// un carácter de teclado.

import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import UiIcon from '@/components/ui/UiIcon.vue'

const props = defineProps<{
  label: string
  to?: RouteLocationRaw
}>()

defineEmits<{ click: [] }>()

const tag = computed(() => (props.to ? RouterLink : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="to ? undefined : 'button'"
    class="back-link"
    @click="!to && $emit('click')"
  >
    <UiIcon name="arrow-left" :size="15" />
    {{ label }}
  </component>
</template>

<style scoped>
/* El estilo base vive en base.css (.back-link) para que ambas etiquetas,
   enlace y botón, se pinten igual. */
</style>
