<script setup lang="ts">
// Estado de un curso, en los tres únicos que existen. Vive aparte de la
// tarjeta porque la ficha del curso muestra lo mismo: al ajustar el chip o la
// barra aquí, cambia en las dos pantallas.
//
//   sin iniciar → etiqueta en mayúsculas, sin barra
//   en curso    → barra de 4px + porcentaje
//   completado  → chip navy con marca de verificación
//
// La marca del chip es el icono SVG del sistema, no el carácter "✓": los
// glifos de teclado se pintan distinto en cada sistema operativo.

import { computed } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'

const props = withDefaults(
  defineProps<{
    status: 'pending' | 'in_progress' | 'completed'
    /** Avance de 0 a 100; solo se usa en `in_progress`. */
    percent?: number
    /** Nombre del curso, para que la barra se anuncie con contexto. */
    title?: string | null
    /** Sobre la miniatura el texto va en blanco pase lo que pase. */
    onCover?: boolean
  }>(),
  { percent: 0, title: null, onCover: false },
)

const value = computed(() =>
  Math.max(0, Math.min(100, Math.round(props.percent || 0))),
)
</script>

<template>
  <div class="course-status" :class="{ 'on-cover': onCover }">
    <span v-if="status === 'pending'" class="label-idle">Sin iniciar</span>

    <template v-else-if="status === 'in_progress'">
      <span
        class="track"
        role="progressbar"
        :aria-label="`Avance de ${title ?? 'este curso'}`"
        :aria-valuenow="value"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="fill" :style="{ width: `${value}%` }" />
      </span>
      <span class="percent">{{ value }}%</span>
    </template>

    <span v-else class="chip-done">
      <UiIcon name="check" :size="11" :stroke="2.4" />
      Completado
    </span>
  </div>
</template>

<style scoped>
.course-status {
  display: flex;
  align-items: center;
  gap: var(--s-10);
  min-height: 20px;
}

/* Sin iniciar: solo la etiqueta, en mayúsculas y tinta apagada. No lleva
   barra porque no hay nada que medir. */
.label-idle {
  font-family: var(--font-display);
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.on-cover .label-idle {
  color: rgba(255, 255, 255, 0.45);
}

.track {
  flex: 1;
  min-width: 0;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--track);
  overflow: hidden;
}

.on-cover .track {
  background: rgba(255, 255, 255, 0.18);
}

.fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--accent-fill);
}

.percent {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--accent-hover);
}

/* Completado: chip navy de marca con borde de acento. */
.chip-done {
  display: inline-flex;
  align-items: center;
  gap: var(--s-5);
  padding: 4px var(--s-10);
  border: 1px solid var(--done-border);
  border-radius: var(--radius-full);
  background: var(--done-bg);
  color: var(--done-text);
  font-family: var(--font-display);
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.4;
}
</style>
