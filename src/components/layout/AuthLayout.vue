<script setup lang="ts">
// Marco de las pantallas sin sesión (acceso, registro, aprobación pendiente,
// asistencia por QR): una tarjeta centrada con la marca arriba.

import UiBrand from '@/components/ui/UiBrand.vue'
import UiThemeToggle from '@/components/ui/UiThemeToggle.vue'

defineProps<{ subtitle?: string }>()
</script>

<template>
  <div class="auth-layout">
    <!-- El interruptor de tema también vive aquí: quien todavía no entra debe
         poder cambiar de modo sin tener que iniciar sesión primero. -->
    <div class="auth-tools">
      <UiThemeToggle />
    </div>

    <div class="auth-card">
      <div class="auth-brand">
        <UiBrand size="lg" />
        <p class="auth-subtitle">{{ subtitle ?? 'Plataforma de capacitaciones' }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem 1rem;
}

.auth-tools {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

/* Tarjeta de esquinas suaves sobre el fondo de la página. */
.auth-card {
  width: min(430px, 100%);
  background: var(--surface-1);
  border: var(--rule);
  border-radius: var(--radius-xl);
  padding: 2.25rem 2rem;
}

.auth-brand {
  text-align: center;
  margin-bottom: 1.75rem;
}

.auth-subtitle {
  margin: 0.5rem 0 0;
  color: var(--text-muted);
  font-weight: 400;
  font-size: 0.88rem;
}
</style>
