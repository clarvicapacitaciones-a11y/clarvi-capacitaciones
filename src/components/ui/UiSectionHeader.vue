<script setup lang="ts">
// Encabezado de una sección: título, un subtítulo que dice cuántas cosas hay
// y, alineada a la derecha, la acción de la sección ("Ver todos").
//
// Existe como componente para que todas las secciones alineen igual y para que
// el punto de "en vivo" no se reinvente en cada pantalla.

withDefaults(
  defineProps<{
    title: string
    /** Línea de abajo; normalmente el conteo ("4 cursos en progreso"). */
    subtitle?: string
    /** Marca la sección que está pasando ahora (transmisión al aire). */
    live?: boolean
  }>(),
  { subtitle: '', live: false },
)
</script>

<template>
  <div class="section-header">
    <div class="heading">
      <h2>
        <span v-if="live" class="live-dot" aria-hidden="true" />
        {{ title }}
      </h2>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <div class="action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-20);
  margin-bottom: var(--s-18);
}

.heading h2 {
  display: flex;
  align-items: center;
  gap: var(--s-9);
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Punto sólido de "al aire": color, sin parpadeo ni movimiento. */
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: #ff5252;
  flex-shrink: 0;
}

.subtitle {
  margin: var(--s-4) 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.action {
  flex-shrink: 0;
  padding-bottom: 2px;
}

.action:empty {
  display: none;
}
</style>
