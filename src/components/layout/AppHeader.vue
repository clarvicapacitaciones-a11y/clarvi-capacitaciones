<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NotificationsBell from '@/components/layout/NotificationsBell.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBrand from '@/components/ui/UiBrand.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiThemeToggle from '@/components/ui/UiThemeToggle.vue'
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

/** El líder solo tiene Solicitudes; el admin entra por Capacitaciones. */
const adminHome = computed(() => ({
  name: auth.isAdmin ? 'admin-trainings' : 'admin-approvals',
}))

// Cerrar al pulsar fuera: el menú tapa contenido y no debe quedarse abierto.
function onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (menuOpen.value && !target?.closest('.user-menu')) menuOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

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
        <UiBrand />
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

      <div class="header-tools">
        <UiThemeToggle />
        <NotificationsBell v-if="auth.profile" />

        <div v-if="auth.profile" class="user-menu">
          <button
            class="user-chip"
            type="button"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            @click="menuOpen = !menuOpen"
          >
            <UiAvatar :name="auth.profile.full_name" size="md" />
            <span class="user-name">{{ auth.profile.full_name }}</span>
            <UiIcon name="chevron-down" :size="14" class="user-caret" />
          </button>

          <div v-if="menuOpen" class="user-dropdown" @click="menuOpen = false">
            <p class="dropdown-role">{{ ROLE_LABELS[auth.profile.role] }}</p>
            <RouterLink :to="{ name: 'perfil' }" class="dropdown-item">
              <UiIcon name="user" :size="16" />
              Mi perfil
            </RouterLink>
            <button class="dropdown-item" type="button" @click="handleLogout">
              <UiIcon name="logout" :size="16" />
              Cerrar sesión
            </button>
          </div>
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
  background: var(--surface-1);
  border-bottom: var(--rule);
}

.app-header-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 0.7rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.brand {
  display: inline-flex;
  align-items: center;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  background: var(--surface-2);
  color: var(--text-strong);
}

.nav-link.router-link-active {
  background: var(--accent-soft);
  color: var(--accent-ink);
}

/* Bloque de la derecha: tema, avisos y cuenta, siempre en ese orden. */
.header-tools {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  padding: 0.3rem 0.5rem 0.3rem 0.35rem;
  cursor: pointer;
  font: inherit;
  color: var(--text-muted);
  transition: background-color var(--transition-fast);
}

.user-chip:hover {
  background: var(--surface-2);
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
  z-index: 50;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  padding: 0.35rem;
  background: var(--surface-1);
  border: var(--rule);
  border-radius: var(--radius-md);
}

.dropdown-role {
  padding: 0.5rem 0.7rem 0.6rem;
  border-bottom: var(--rule);
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
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
  background: var(--surface-2);
  color: var(--text-strong);
}

@media (max-width: 720px) {
  .app-header-inner {
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.65rem 1rem;
  }

  .nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
    padding-top: 0.45rem;
    border-top: var(--rule);
  }

  .user-name {
    display: none;
  }

  .user-caret {
    display: none;
  }
}
</style>
