<script setup lang="ts">
// Hueco gris mientras carga. Sirve para que la pantalla no salte de un
// "Cargando…" a la lista completa: el espacio ya está reservado con la forma
// que va a tener.
//
// Fiel al sistema, no hay brillo que se desplace: solo un pulso de color.

withDefaults(
  defineProps<{
    /** Alto de la pieza (px o cualquier medida CSS). */
    height?: string
    width?: string
    radius?: 'sm' | 'md' | 'lg' | 'full'
  }>(),
  { height: '1rem', width: '100%', radius: 'sm' },
)
</script>

<template>
  <span
    class="ui-skeleton"
    :class="`radius-${radius}`"
    :style="{ height, width }"
    aria-hidden="true"
  />
</template>

<style scoped>
.ui-skeleton {
  display: block;
  background: var(--surface-2);
  animation: pulse 1.4s ease-in-out infinite;
}

.radius-sm {
  border-radius: var(--radius-sm);
}

.radius-md {
  border-radius: var(--radius-md);
}

.radius-lg {
  border-radius: var(--radius-lg);
}

.radius-full {
  border-radius: var(--radius-full);
}

/* Solo cambia el color, como el resto del sistema. */
@keyframes pulse {
  0%,
  100% {
    background-color: var(--surface-2);
  }
  50% {
    background-color: var(--surface-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-skeleton {
    animation: none;
  }
}
</style>
