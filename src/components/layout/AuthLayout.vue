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

.auth-card {
  width: min(430px, 100%);
  background: var(--glass-bg);
  border: var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 2rem 1.75rem;
}

.auth-brand {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-logo {
  width: 52px;
  height: 52px;
  margin-bottom: 0.5rem;
}

.auth-brand h1 {
  margin: 0;
  letter-spacing: 0.12em;
  color: var(--clarvi-navy);
  font-size: 1.6rem;
}

.auth-subtitle {
  margin: 0.2rem 0 0;
  color: var(--clarvi-blue);
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
