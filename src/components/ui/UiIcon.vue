<script setup lang="ts">
// Único lugar donde vive un icono en toda la plataforma.
//
// Regla del sistema: nada de emojis ni glifos de teclado (✓ ← × ⏳) haciendo
// de icono. Se ven distinto en cada sistema operativo, algunos se pintan a
// color aunque el resto de la interfaz sea plana, y los lectores de pantalla
// los leen en voz alta. Aquí son trazos SVG que heredan `currentColor` y el
// tamaño del texto, así que siguen al tema sin configurarse.
//
// Para agregar un icono: una entrada más en PATHS, dibujada en una caja de
// 24×24 con trazo (no relleno). Al cambiar un trazo cambia en toda la app.

import { computed } from 'vue'

/** Nombre de cada icono disponible. */
export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'chevron-down'
  | 'check'
  | 'check-circle'
  | 'close'
  | 'info'
  | 'alert'
  | 'clock'
  | 'calendar'
  | 'play'
  | 'broadcast'
  | 'book'
  | 'award'
  | 'bell'
  | 'user'
  | 'logout'
  | 'sun'
  | 'moon'
  | 'plus'
  | 'search'
  | 'link'
  | 'download'

/** Trazos de cada icono en una caja de 24×24. */
const PATHS: Record<IconName, string[]> = {
  'arrow-left': ['M19 12H5', 'M11 18l-6-6 6-6'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  'arrow-up': ['M12 19V5', 'M6 11l6-6 6 6'],
  'arrow-down': ['M12 5v14', 'M6 13l6 6 6-6'],
  'chevron-down': ['M6 9.5l6 6 6-6'],
  check: ['M4.5 12.5l5 5 10-11'],
  'check-circle': ['M20.5 11.2V12a8.5 8.5 0 1 1-5-7.8', 'M21 5.5L12 14.5l-2.6-2.6'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01'],
  alert: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5v5', 'M12 16h.01'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5.2l3.2 2'],
  calendar: [
    'M4.5 6.5A1.5 1.5 0 0 1 6 5h12a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-12Z',
    'M8 3.5v3',
    'M16 3.5v3',
    'M4.5 10h15',
  ],
  play: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M10.2 8.7l5.4 3.3-5.4 3.3V8.7Z'],
  broadcast: [
    'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    'M7.8 16.2a6 6 0 0 1 0-8.4',
    'M16.2 7.8a6 6 0 0 1 0 8.4',
    'M5 19a10 10 0 0 1 0-14',
    'M19 5a10 10 0 0 1 0 14',
  ],
  book: [
    'M7 3.5h12.5v17H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Z',
    'M19.5 16.5H7A2.5 2.5 0 0 0 4.5 19',
  ],
  award: ['M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z', 'M8.5 14.2L7 21l5-2.4L17 21l-1.5-6.8'],
  bell: [
    'M12 3a5.5 5.5 0 0 0-5.5 5.5v3.2L5 15.2h14l-1.5-3.5V8.5A5.5 5.5 0 0 0 12 3Z',
    'M9.8 18a2.2 2.2 0 0 0 4.4 0',
  ],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  logout: ['M15 4.5h3A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-3', 'M11 16l4-4-4-4', 'M15 12H4.5'],
  sun: [
    'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z',
    'M12 2.5v2',
    'M12 19.5v2',
    'M2.5 12h2',
    'M19.5 12h2',
    'M5.3 5.3l1.4 1.4',
    'M17.3 17.3l1.4 1.4',
    'M18.7 5.3l-1.4 1.4',
    'M6.7 17.3l-1.4 1.4',
  ],
  moon: ['M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'M20 20l-4-4'],
  link: ['M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 1 0-5-5l-1 1', 'M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 1 0 5 5l1-1'],
  download: ['M12 4v11', 'M7.5 10.5L12 15l4.5-4.5', 'M5 19h14'],
}

const props = withDefaults(
  defineProps<{
    name: IconName
    /** Alto y ancho en px. Sin valor, el icono crece con el texto (1.15em). */
    size?: number | string
    /** Grosor del trazo; se aclara en iconos grandes. */
    stroke?: number
    /**
     * Texto para lectores de pantalla. Sin él el icono queda decorativo
     * (aria-hidden), que es lo correcto cuando va junto a una etiqueta.
     */
    label?: string
  }>(),
  { stroke: 1.6, label: '' },
)

const dimension = computed(() =>
  props.size === undefined
    ? '1.15em'
    : typeof props.size === 'number'
      ? `${props.size}px`
      : props.size,
)

const paths = computed(() => PATHS[props.name])
</script>

<template>
  <svg
    class="ui-icon"
    viewBox="0 0 24 24"
    :width="dimension"
    :height="dimension"
    fill="none"
    :stroke-width="stroke"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="label ? undefined : true"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
</template>

<style scoped>
/* Alineado con la línea base del texto que acompaña. */
.ui-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: -0.18em;
}
</style>
