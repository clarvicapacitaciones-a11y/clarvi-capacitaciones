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

/* Tarjeta blanca de esquinas suaves sobre el fondo de la página. */
.auth-card {
  width: min(430px, 100%);
  background: var(--bg-surface);
  border: var(--rule);
  border-radius: var(--radius-xl);
  padding: 2.25rem 2rem;
}

.auth-brand {
  text-align: center;
  margin-bottom: 1.75rem;
}

.auth-logo {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
}

.auth-brand h1 {
  margin: 0;
  letter-spacing: 0.08em;
  color: var(--clarvi-navy);
  font-size: 1.35rem;
  font-weight: 600;
}

.auth-subtitle {
  margin: 0.35rem 0 0;
  color: var(--text-muted);
  font-weight: 400;
  font-size: 0.88rem;
}
</style>
