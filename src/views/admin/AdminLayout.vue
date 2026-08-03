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
/* Sub-navegación en píldoras, del mismo lenguaje que las pestañas. */
.admin-nav {
  display: inline-flex;
  gap: 0.25rem;
  margin-bottom: 1.75rem;
  padding: 0.25rem;
  border-radius: var(--radius-full);
  background: var(--bg-subtle);
  flex-wrap: wrap;
}

.admin-tab {
  padding: 0.5rem 1.05rem;
  border-radius: var(--radius-full);
  font-weight: 500;
  font-size: 0.86rem;
  color: var(--text-muted);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.admin-tab:hover {
  color: var(--text-strong);
}

.admin-tab.router-link-active {
  background: var(--clarvi-navy);
  color: var(--text-inverse);
}
</style>
