<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NotificationsBell from '@/components/layout/NotificationsBell.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { ROLE_LABELS } from '@/types/domain'

const auth = useAuthStore()
const notifications = useNotificationsStore()
const router = useRouter()
const menuOpen = ref(false)

// El encabezado solo existe donde hay sesión, así que es el lugar natural
// para prender y apagar el refresco de avisos.
onMounted(() => notifications.start())
onUnmounted(() => notifications.stop())

/** Iniciales para el avatar del menú de cuenta. */
const initials = computed(() => {
  const parts = (auth.profile?.full_name ?? '').trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '·'
})

/** El líder solo tiene Solicitudes; el admin entra por Capacitaciones. */
const adminHome = computed(() => ({
  name: auth.isAdmin ? 'admin-trainings' : 'admin-approvals',
}))

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

      <!-- La navegación solo existe para quien administra o aprueba registros:
           un colaborador únicamente ve sus capacitaciones, así que el menú
           sería ruido. -->
      <nav v-if="auth.canApprove" class="nav">
        <RouterLink :to="{ name: 'dashboard' }" class="nav-link">
          Mis capacitaciones
        </RouterLink>
        <RouterLink :to="adminHome" class="nav-link">
          {{ auth.isAdmin ? 'Administración' : 'Solicitudes' }}
        </RouterLink>
      </nav>

      <NotificationsBell v-if="auth.profile" class="header-bell" />

      <div v-if="auth.profile" class="user-menu">
        <button class="user-chip" @click="menuOpen = !menuOpen">
          <span class="user-avatar" aria-hidden="true">{{ initials }}</span>
          <span class="user-name">{{ auth.profile.full_name }}</span>
        </button>
        <div v-if="menuOpen" class="user-dropdown" @click="menuOpen = false">
          <p class="dropdown-role">{{ ROLE_LABELS[auth.profile.role] }}</p>
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
/* Barra sólida (nada de transparencias) separada por una línea suave.
   Todo alineado a la izquierda: marca, navegación y, al extremo, la cuenta. */
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bg-surface);
  border-bottom: var(--rule);
}

.app-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-icon {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text strong {
  color: var(--clarvi-navy);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.brand-text small {
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 400;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
}

/* Sección activa: píldora tenue, sin subrayados ni negritas de más. */
.nav-link {
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 500;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.nav-link:hover {
  background: var(--bg-subtle);
  color: var(--text-strong);
}

.nav-link.router-link-active {
  background: var(--navy-050);
  color: var(--clarvi-navy);
}

/* La campana abre el bloque de la derecha; la cuenta va pegada a ella. */
.header-bell {
  margin-left: auto;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  margin-left: 0.15rem;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  font: inherit;
  transition: background-color var(--transition-fast);
}

.user-chip:hover {
  background: var(--bg-subtle);
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  background: var(--navy-050);
  color: var(--clarvi-navy);
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.user-name {
  color: var(--text-strong);
  font-size: 0.88rem;
  font-weight: 500;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  min-width: 190px;
  display: flex;
  flex-direction: column;
  padding: 0.35rem;
  background: var(--bg-surface);
  border: var(--rule);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.dropdown-role {
  padding: 0.5rem 0.7rem 0.6rem;
  border-bottom: var(--rule);
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.dropdown-item {
  text-align: left;
  padding: 0.55rem 0.7rem;
  border: none;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 400;
  color: var(--text-body);
  background: none;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--bg-subtle);
  color: var(--text-strong);
}

@media (max-width: 640px) {
  .app-header-inner {
    gap: 0.75rem;
    padding: 0.65rem 1rem;
  }

  .brand-text small {
    display: none;
  }

  .nav {
    order: 3;
    width: 100%;
    flex: none;
    overflow-x: auto;
    padding-top: 0.3rem;
    border-top: var(--rule);
  }

  .app-header-inner {
    flex-wrap: wrap;
  }

  .user-name {
    max-width: 120px;
  }
}
</style>
