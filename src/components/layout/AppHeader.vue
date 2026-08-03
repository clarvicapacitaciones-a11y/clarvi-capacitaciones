<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { ROLE_LABELS } from '@/types/domain'

const auth = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)

async function handleLogout(): Promise<void> {
  menuOpen.value = false
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <div class="app-header-inner">
      <RouterLink :to="{ name: 'dashboard' }" class="brand">
        <img src="/favicon.svg" alt="" class="brand-icon" />
        <span class="brand-text">
          <strong>CLARVI</strong>
          <small>Capacitaciones</small>
        </span>
      </RouterLink>

      <nav class="nav">
        <RouterLink :to="{ name: 'dashboard' }" class="nav-link">
          Mis capacitaciones
        </RouterLink>
        <RouterLink
          v-if="auth.isAdmin"
          :to="{ name: 'admin-trainings' }"
          class="nav-link"
        >
          Administración
        </RouterLink>
      </nav>

      <div v-if="auth.profile" class="user-menu">
        <button class="user-chip" @click="menuOpen = !menuOpen">
          <span class="user-name">{{ auth.profile.full_name }}</span>
          <span class="user-role">{{ ROLE_LABELS[auth.profile.role] }}</span>
        </button>
        <div v-if="menuOpen" class="user-dropdown" @click="menuOpen = false">
          <RouterLink :to="{ name: 'perfil' }" class="dropdown-item">
            Mi perfil
          </RouterLink>
          <button class="dropdown-item" @click="handleLogout">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Barra plana: fondo sólido, filete azul de marca arriba y una línea
   de 1px abajo. Las divisiones internas también son líneas. */
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bg-surface);
  border-top: var(--accent-width) solid var(--clarvi-blue);
  border-bottom: var(--rule);
}

.app-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.25rem;
  display: flex;
  align-items: stretch;
  gap: 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.5rem 0.7rem 0;
  border-right: var(--rule);
}

.brand-icon {
  width: 32px;
  height: 32px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-text strong {
  color: var(--clarvi-navy);
  font-size: 0.95rem;
  letter-spacing: 0.14em;
}

.brand-text small {
  color: var(--text-muted);
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}

.nav {
  display: flex;
  align-items: stretch;
  flex: 1;
}

/* La pestaña activa se marca con una línea inferior; el borde siempre
   ocupa su lugar (transparente) para que nada se mueva al cambiar. */
.nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0 1rem;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  border-bottom: 2px solid transparent;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.nav-link:hover {
  color: var(--clarvi-navy);
  border-bottom-color: var(--line-mid);
}

.nav-link.router-link-active {
  color: var(--clarvi-navy);
  border-bottom-color: var(--clarvi-navy);
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
}

.user-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  border: var(--rule);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font: inherit;
  transition: border-color var(--transition-fast);
}

.user-chip:hover {
  border-color: var(--clarvi-navy);
}

.user-name {
  font-weight: 600;
  color: var(--text-strong);
  font-size: 0.85rem;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 0.64rem;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% - 0.3rem);
  min-width: 180px;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: var(--rule-strong);
  border-radius: var(--radius-md);
}

.dropdown-item {
  text-align: left;
  padding: 0.6rem 0.9rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-body);
  background: none;
  border: none;
  border-bottom: var(--rule);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: var(--clarvi-navy);
  color: var(--text-inverse);
}

@media (max-width: 640px) {
  .app-header-inner {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0 1rem;
  }

  .brand {
    border-right: none;
    padding-right: 0;
  }

  .nav {
    order: 3;
    width: 100%;
    border-top: var(--rule);
  }

  .nav-link {
    padding: 0.7rem 0.9rem;
  }

  .nav-link:first-child {
    padding-left: 0;
  }

  .user-menu {
    margin-left: auto;
  }
}
</style>
