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
/* Sub-navegación por línea inferior: la sección activa se marca con un
   filete navy sobre la línea de la barra. */
.admin-nav {
  display: flex;
  margin-bottom: 1.75rem;
  border-bottom: var(--rule);
  flex-wrap: wrap;
}

.admin-tab {
  padding: 0.6rem 1rem 0.6rem 0;
  margin-right: 1.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.admin-tab:hover {
  color: var(--clarvi-navy);
  border-bottom-color: var(--line-mid);
}

.admin-tab.router-link-active {
  color: var(--clarvi-navy);
  border-bottom-color: var(--clarvi-navy);
}
</style>
