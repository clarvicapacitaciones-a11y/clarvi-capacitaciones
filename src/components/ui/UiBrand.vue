<script setup lang="ts">
// La firma de la plataforma: "Campus CLARVI", en una sola línea y sin ningún
// símbolo al lado (la gota se retiró del logo).
//
// Es un componente y no texto suelto porque la marca aparece en el encabezado,
// en las pantallas de acceso y en el diploma: al ajustar el peso, el color o
// el espaciado aquí, cambia en los tres lugares a la vez.
//
// El contraste entre "Campus" (peso normal, tinta suave) y "CLARVI" (peso
// medio, color de acento) es lo que hace la jerarquía. Nada de mayúsculas
// forzadas por CSS: "CLARVI" ya se escribe así.

withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    /**
     * `accent` en pantalla (sigue al tema), `strong` sobre superficies con
     * color propio y `brand` en el pantón fijo de CLARVI, que es el que va
     * al papel: el diploma se imprime igual venga de donde venga.
     */
    tone?: 'accent' | 'strong' | 'brand'
  }>(),
  { size: 'md', tone: 'accent' },
)
</script>

<template>
  <span class="ui-brand" :class="[`is-${size}`, `tone-${tone}`]">
    <span class="brand-campus">Campus</span>
    <span class="brand-name">CLARVI</span>
  </span>
</template>

<style scoped>
.ui-brand {
  display: inline-flex;
  align-items: baseline;
  gap: 0.36em;
  white-space: nowrap;
  line-height: 1.1;
}

.brand-campus {
  color: var(--text-muted);
  font-weight: 400;
  transition: color var(--transition-fast);
}

.brand-name {
  font-weight: 600;
  letter-spacing: 0.06em;
  transition: color var(--transition-fast);
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
  font-size: 0.9rem;
}

.is-md {
  font-size: 1.05rem;
}

.is-lg {
  font-size: 1.35rem;
}
</style>
