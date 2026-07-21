<script setup lang="ts">
import AuthLayout from '@/components/layout/AuthLayout.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
</script>

<template>
  <AuthLayout subtitle="Página no encontrada">
    <div class="not-found">
      <p class="code">404</p>
      <p class="muted">La página que buscas no existe o fue movida.</p>
      <RouterLink :to="{ name: 'dashboard' }">
        <GlassButton block>Ir al inicio</GlassButton>
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
  font-size: 3rem;
  font-weight: 800;
  color: var(--clarvi-navy);
  margin: 0;
  opacity: 0.35;
}
</style>
