<script setup lang="ts">
// La firma de la plataforma: "Campus CLARVI", en una sola línea y sin ningún
// símbolo al lado (la gota se retiró del logo).
//
// Es un componente y no texto suelto porque la marca aparece en la barra
// superior, en las pantallas de acceso y en el diploma: al ajustar el peso, el
// color o el interletraje aquí, cambia en los tres lugares.
//
// Va en Space Grotesk, la tipografía de marca del sistema. El contraste entre
// "Campus" (peso medio, tinta suave) y "CLARVI" (peso fuerte) hace la
// jerarquía; nada de mayúsculas forzadas por CSS: "CLARVI" ya se escribe así.

withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    /**
     * `header` sobre la barra navy, `accent` sobre superficie normal,
     * `strong` cuando la superficie ya tiene color propio y `brand` en el
     * pantón fijo, que es el que va al papel.
     */
    tone?: 'header' | 'accent' | 'strong' | 'brand'
  }>(),
  { size: 'md', tone: 'accent' },
)
</script>

<template>
  <span class="ui-brand" :class="[`is-${size}`, `tone-${tone}`]">
    <span class="brand-campus">Campus</span><span class="brand-name">CLARVI</span>
  </span>
</template>

<style scoped>
.ui-brand {
  display: inline-flex;
  align-items: baseline;
  gap: 0.34em;
  white-space: nowrap;
  font-family: var(--font-display);
  line-height: 1.1;
}

.brand-campus {
  font-weight: 500;
  transition: color var(--transition-fast);
}

.brand-name {
  font-weight: 700;
  letter-spacing: 0.02em;
  transition: color var(--transition-fast);
}

/* Sobre la barra navy: "CLARVI" en blanco y "Campus" un paso atrás. */
.tone-header .brand-campus {
  color: var(--on-header-muted);
}

.tone-header .brand-name {
  color: var(--on-header);
}

.tone-accent .brand-campus {
  color: var(--text-muted);
}

.tone-accent .brand-name {
  color: var(--accent-ink);
}

.tone-strong .brand-campus,
.tone-strong .brand-name {
  color: var(--text-strong);
}

.tone-brand .brand-campus,
.tone-brand .brand-name {
  color: var(--brand-navy);
}

.is-sm {
  font-size: 14px;
}

.is-md {
  font-size: 17px;
}

.is-lg {
  font-size: 22px;
}
</style>
