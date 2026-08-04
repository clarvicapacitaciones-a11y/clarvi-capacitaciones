<script setup lang="ts">
// Campana de avisos del encabezado. Al abrirla se refresca la lista; al pulsar
// un aviso se marca leído y se va a donde apunta.

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatDateTime } from '@/composables/useFormat'
import { useNotificationsStore } from '@/stores/notifications.store'
import type { AppNotification } from '@/types/domain'

const notifications = useNotificationsStore()
const router = useRouter()

const open = ref(false)

const badge = computed(() =>
  notifications.unreadCount > 9 ? '9+' : String(notifications.unreadCount),
)

function toggle(): void {
  open.value = !open.value
  if (open.value) void notifications.fetchNotifications()
}

function close(): void {
  open.value = false
}

async function openNotification(item: AppNotification): Promise<void> {
  close()
  await notifications.markRead(item.id)
  if (item.link) await router.push(item.link)
}

// Cerrar al pulsar fuera: el panel tapa contenido y no debe quedarse abierto.
function onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (open.value && !target?.closest('.bell')) close()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="bell">
    <button
      class="bell-button"
      :aria-label="`Avisos${notifications.unreadCount ? ` (${notifications.unreadCount} sin leer)` : ''}`"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 3a5.5 5.5 0 0 0-5.5 5.5v3.2L5 15.2h14l-1.5-3.5V8.5A5.5 5.5 0 0 0 12 3Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
        <path
          d="M9.8 18a2.2 2.2 0 0 0 4.4 0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
      <span v-if="notifications.unreadCount > 0" class="bell-badge">
        {{ badge }}
      </span>
    </button>

    <div v-if="open" class="bell-panel">
      <header class="bell-header">
        <span>Avisos</span>
        <button
          v-if="notifications.unreadCount > 0"
          class="bell-mark"
          @click="notifications.markAllRead()"
        >
          Marcar todo como leído
        </button>
      </header>

      <p v-if="notifications.items.length === 0" class="bell-empty">
        No tienes avisos.
      </p>

      <ul v-else class="bell-list">
        <li v-for="item in notifications.items" :key="item.id">
          <button
            class="bell-item"
            :class="{ 'is-unread': item.read_at === null }"
            @click="openNotification(item)"
          >
            <span class="bell-item-title">{{ item.title }}</span>
            <span v-if="item.body" class="bell-item-body">{{ item.body }}</span>
            <span class="bell-item-date">
              {{ formatDateTime(item.created_at) }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.bell {
  position: relative;
  display: flex;
  align-items: center;
}

.bell-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.bell-button:hover {
  background: var(--bg-subtle);
  color: var(--text-strong);
}

/* Contador sobre la campana: color plano, sin sombra ni animación. */
.bell-badge {
  position: absolute;
  top: 0.1rem;
  right: 0.05rem;
  min-width: 1.05rem;
  padding: 0 0.25rem;
  border-radius: var(--radius-full);
  background: var(--color-danger);
  color: var(--text-inverse);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.bell-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  z-index: 50;
  width: min(320px, calc(100vw - 2rem));
  background: var(--bg-surface);
  border: var(--rule);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.bell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-bottom: var(--rule);
  font-size: 0.82rem;
  color: var(--text-muted);
}

.bell-mark {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 0.78rem;
  color: var(--clarvi-blue-ink);
  cursor: pointer;
}

.bell-empty {
  margin: 0;
  padding: 1.5rem 0.8rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.bell-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.bell-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: none;
  border-bottom: var(--rule);
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.bell-item:hover {
  background: var(--bg-subtle);
}

/* Sin leer: fondo tenue y título en peso medio. */
.bell-item.is-unread {
  background: var(--navy-050);
}

.bell-item.is-unread .bell-item-title {
  font-weight: 600;
}

.bell-item-title {
  font-size: 0.87rem;
  color: var(--text-strong);
}

.bell-item-body {
  font-size: 0.82rem;
  color: var(--text-body);
}

.bell-item-date {
  font-size: 0.76rem;
  color: var(--text-muted);
}
</style>
