<script setup lang="ts">
import AuthLayout from '@/components/layout/AuthLayout.vue'
import UiButton from '@/components/ui/UiButton.vue'
</script>

<template>
  <AuthLayout subtitle="Página no encontrada">
    <div class="not-found">
      <p class="code">404</p>
      <p class="muted">La página que buscas no existe o fue movida.</p>
      <RouterLink :to="{ name: 'dashboard' }">
        <UiButton block>Ir al inicio</UiButton>
      </RouterLink>
    </div>
  </AuthLayout>
</template>

<style scoped>
.not-found {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.code {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--line-mid);
  margin: 0;
}
</style>
