<script setup lang="ts">
// Contenedor de la sección de administración con su sub-navegación.
//
// El líder entra a esta misma sección pero solo ve Solicitudes: no administra
// capacitaciones, usuarios ni catálogos.

import { onMounted } from 'vue'
import { useApprovalsStore } from '@/stores/approvals.store'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const approvals = useApprovalsStore()

// El contador vive en el store: al resolver una solicitud, la pestaña se
// actualiza sin recargar.
onMounted(() => {
  void approvals.fetchRequests().catch(() => {
    /* el error real se muestra dentro de la pestaña de solicitudes */
  })
})
</script>

<template>
  <div class="page">
    <nav class="admin-nav">
      <template v-if="auth.isAdmin">
        <RouterLink :to="{ name: 'admin-trainings' }" class="admin-tab">
          Capacitaciones
        </RouterLink>
        <RouterLink :to="{ name: 'admin-users' }" class="admin-tab">
          Usuarios
        </RouterLink>
      </template>
      <RouterLink
        v-if="auth.canApprove"
        :to="{ name: 'admin-approvals' }"
        class="admin-tab"
      >
        Solicitudes
        <span v-if="approvals.pendingCount > 0" class="tab-count">
          {{ approvals.pendingCount }}
        </span>
      </RouterLink>
      <RouterLink
        v-if="auth.isAdmin"
        :to="{ name: 'admin-catalogs' }"
        class="admin-tab"
      >
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

/* Pendientes por revisar: número al lado del nombre de la pestaña. */
.tab-count {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0 0.4rem;
  border-radius: var(--radius-full);
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
}
</style>
