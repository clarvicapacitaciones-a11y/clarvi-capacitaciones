<script setup lang="ts">
// Barra superior de la plataforma: marca y área a la izquierda, navegación en
// medio, buscador y cuenta a la derecha.
//
// La navegación es corta a propósito. Un colaborador solo tiene "Mis cursos":
// no hay catálogo abierto ni forma de asomarse a otras áreas, así que un menú
// largo sería ruido. Quien administra o aprueba registros ve un tercer ítem.

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NotificationsBell from '@/components/layout/NotificationsBell.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBrand from '@/components/ui/UiBrand.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiSearchField from '@/components/ui/UiSearchField.vue'
import UiThemeToggle from '@/components/ui/UiThemeToggle.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCatalogsStore } from '@/stores/catalogs.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useCourseSearch } from '@/composables/useCourseSearch'
import { ROLE_LABELS } from '@/types/domain'

const auth = useAuthStore()
const catalogs = useCatalogsStore()
const notifications = useNotificationsStore()
const router = useRouter()
const menuOpen = ref(false)

// El buscador de la barra filtra la lista de cursos, que vive en otra vista;
// el término se comparte por un composable en vez de subir el estado.
const { term } = useCourseSearch()

// El encabezado solo existe donde hay sesión, así que es el lugar natural
// para prender y apagar el refresco de avisos y para pedir los catálogos que
// dan nombre al área.
onMounted(() => {
  notifications.start()
  void catalogs.fetchCatalogs()
})
onUnmounted(() => notifications.stop())

/** El área de la persona, que es todo lo que puede ver de la plataforma. */
const areaName = computed(() =>
  auth.profile ? catalogs.areaName(auth.profile.area_id) : '',
)

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

/** Buscar manda siempre a Mis cursos, que es donde se filtra. */
async function goToCourses(): Promise<void> {
  if (router.currentRoute.value.name !== 'dashboard') {
    await router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <header class="app-header">
    <div class="app-header-inner">
      <div class="header-left">
        <RouterLink :to="{ name: 'dashboard' }" class="brand">
          <UiBrand tone="header" />
        </RouterLink>
        <span v-if="areaName" class="area-badge">
          Área<span class="badge-dot" aria-hidden="true" />{{ areaName }}
        </span>
      </div>

      <nav class="nav">
        <RouterLink :to="{ name: 'dashboard' }" class="nav-link">
          Mis cursos
        </RouterLink>
        <RouterLink v-if="auth.canApprove" :to="adminHome" class="nav-link">
          {{ auth.isAdmin ? 'Administración' : 'Solicitudes' }}
        </RouterLink>
      </nav>

      <div class="header-right">
        <UiSearchField
          v-model="term"
          class="header-search"
          @keydown.enter="goToCourses"
        />
        <UiThemeToggle class="on-header" />
        <NotificationsBell v-if="auth.profile" class="on-header" />

        <div v-if="auth.profile" class="user-menu">
          <button
            class="user-chip"
            type="button"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            :aria-label="`Cuenta de ${auth.profile.full_name}`"
            @click="menuOpen = !menuOpen"
          >
            <UiAvatar :name="auth.profile.full_name" size="md" />
          </button>

          <div v-if="menuOpen" class="user-dropdown" @click="menuOpen = false">
            <p class="dropdown-name">{{ auth.profile.full_name }}</p>
            <p class="dropdown-role">{{ ROLE_LABELS[auth.profile.role] }}</p>
            <RouterLink :to="{ name: 'perfil' }" class="dropdown-item">
              <UiIcon name="user" :size="15" />
              Mi perfil
            </RouterLink>
            <button class="dropdown-item" type="button" @click="handleLogout">
              <UiIcon name="logout" :size="15" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Barra de marca, sólida y sin sombra: lo que la separa del contenido es el
   corte de color. */
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--surface-header);
}

.app-header-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--s-22) var(--s-40);
  display: flex;
  align-items: center;
  gap: var(--s-32);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--s-12);
  flex-shrink: 0;
}

.brand {
  display: inline-flex;
  align-items: center;
}

/* El área de la persona: lo que delimita todo lo que ve. */
.area-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--s-5);
  padding: var(--s-4) var(--s-9);
  border-radius: var(--radius-full);
  background: var(--on-header-soft);
  color: var(--on-header-muted);
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.badge-dot {
  width: 3px;
  height: 3px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--s-20);
}

.nav-link {
  color: var(--on-header-muted);
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.nav-link:hover {
  color: var(--on-header);
}

.nav-link.router-link-active {
  color: var(--on-header);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--s-10);
  margin-left: auto;
}

/* La campana y el interruptor de tema viven sobre la barra navy, así que
   heredan su tinta en vez de la de la página. */
.header-right :deep(.on-header) {
  color: var(--on-header-muted);
}

.header-right :deep(.on-header:hover) {
  background: var(--on-header-soft);
  color: var(--on-header);
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
}

.user-chip {
  display: flex;
  align-items: center;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + var(--s-12));
  z-index: 50;
  min-width: 210px;
  display: flex;
  flex-direction: column;
  padding: var(--s-5);
  background: var(--surface-1);
  border: var(--rule);
  border-radius: var(--radius-md);
}

.dropdown-name {
  margin: 0;
  padding: var(--s-10) var(--s-12) 0;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
}

.dropdown-role {
  margin: 0 0 var(--s-5);
  padding: 0 var(--s-12) var(--s-10);
  border-bottom: var(--rule);
  font-size: 11.5px;
  color: var(--text-muted);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--s-10);
  text-align: left;
  padding: var(--s-9) var(--s-12);
  border: none;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 13px;
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

@media (max-width: 1080px) {
  .header-search {
    display: none;
  }
}

@media (max-width: 860px) {
  .app-header-inner {
    flex-wrap: wrap;
    gap: var(--s-12);
    padding: var(--s-14) var(--s-18);
  }

  .area-badge {
    display: none;
  }

  .nav {
    order: 3;
    width: 100%;
    gap: var(--s-18);
    overflow-x: auto;
    padding-top: var(--s-12);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
}
</style>
