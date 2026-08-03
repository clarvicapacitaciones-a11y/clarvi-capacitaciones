<script setup lang="ts">
defineProps<{ subtitle?: string }>()
</script>

<template>
  <div class="auth-layout">
    <div class="auth-card">
      <div class="auth-brand">
        <img src="/favicon.svg" alt="CLARVI" class="auth-logo" />
        <h1>CLARVI</h1>
        <p class="auth-subtitle">{{ subtitle ?? 'Plataforma de capacitaciones' }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem 1rem;
}

/* Tarjeta plana con el filete azul de marca arriba. */
.auth-card {
  width: min(430px, 100%);
  background: var(--bg-surface);
  border: var(--rule);
  border-top: var(--accent-width) solid var(--clarvi-blue);
  border-radius: var(--radius-lg);
  padding: 2rem 1.75rem;
}

.auth-brand {
  text-align: center;
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: var(--rule);
}

.auth-logo {
  width: 48px;
  height: 48px;
  margin-bottom: 0.6rem;
}

.auth-brand h1 {
  margin: 0;
  letter-spacing: 0.2em;
  color: var(--clarvi-navy);
  font-size: 1.5rem;
}

.auth-subtitle {
  margin: 0.35rem 0 0;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}
</style>
