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
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.65);
  border-bottom: 1px solid rgba(var(--clarvi-navy-rgb), 0.08);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.app-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.6rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.brand-icon {
  width: 34px;
  height: 34px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-text strong {
  color: var(--clarvi-navy);
  letter-spacing: 0.06em;
}

.brand-text small {
  color: var(--clarvi-blue);
  font-size: 0.72rem;
  font-weight: 600;
}

.nav {
  display: flex;
  gap: 0.35rem;
  flex: 1;
}

.nav-link {
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-md);
  color: var(--text-body);
  font-weight: 600;
  font-size: 0.92rem;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-link:hover {
  background: rgba(var(--clarvi-blue-rgb), 0.1);
  color: var(--clarvi-navy);
}

.nav-link.router-link-active {
  background: rgba(var(--clarvi-blue-rgb), 0.14);
  color: var(--clarvi-navy);
}

.user-menu {
  position: relative;
}

.user-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.12);
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-md);
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font: inherit;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.user-chip:hover {
  border-color: rgba(var(--clarvi-blue-rgb), 0.5);
  background: rgba(255, 255, 255, 0.85);
}

.user-name {
  font-weight: 600;
  color: var(--text-strong);
  font-size: 0.88rem;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 0.72rem;
  color: var(--clarvi-blue);
  font-weight: 600;
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 170px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  border: var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--glass-shadow-hover);
  backdrop-filter: blur(var(--glass-blur));
  overflow: hidden;
}

.dropdown-item {
  text-align: left;
  padding: 0.6rem 0.9rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-body);
  background: none;
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.dropdown-item:hover {
  background: rgba(var(--clarvi-blue-rgb), 0.1);
  color: var(--clarvi-navy);
}

@media (max-width: 640px) {
  .app-header-inner {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .nav {
    order: 3;
    width: 100%;
  }

  .user-menu {
    margin-left: auto;
  }
}
</style>
