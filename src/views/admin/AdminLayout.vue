<script setup lang="ts">
// Contenedor de la sección de administración con su sub-navegación.
</script>

<template>
  <div class="page">
    <nav class="admin-nav">
      <RouterLink :to="{ name: 'admin-trainings' }" class="admin-tab">
        Capacitaciones
      </RouterLink>
      <RouterLink :to="{ name: 'admin-users' }" class="admin-tab">
        Usuarios
      </RouterLink>
      <RouterLink :to="{ name: 'admin-catalogs' }" class="admin-tab">
        Catálogos
      </RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.admin-nav {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(var(--clarvi-navy-rgb), 0.12);
  padding-bottom: 0;
  flex-wrap: wrap;
}

.admin-tab {
  padding: 0.55rem 1rem;
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.admin-tab:hover {
  color: var(--clarvi-navy);
}

.admin-tab.router-link-active {
  color: var(--clarvi-navy);
  border-bottom-color: var(--clarvi-blue);
}
</style>
