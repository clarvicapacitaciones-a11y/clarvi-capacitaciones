// Campana de avisos: lista, no leídos y refresco periódico.
//
// Sin realtime a propósito: una consulta ligera cada minuto (y solo con la
// pestaña visible) alcanza para un aviso que se atiende en horas, y no obliga
// a mantener una suscripción abierta.

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications.service'
import { useAuthStore } from '@/stores/auth.store'
import type { AppNotification } from '@/types/domain'

const REFRESH_MS = 60_000

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  const loading = ref(false)

  const unread = computed(() => items.value.filter((n) => n.read_at === null))
  const unreadCount = computed(() => unread.value.length)

  let timer: ReturnType<typeof setInterval> | null = null
  let inFlight: Promise<void> | null = null

  function fetchNotifications(): Promise<void> {
    if (inFlight) return inFlight
    const auth = useAuthStore()
    if (!auth.isAuthenticated || auth.isPendingApproval) {
      items.value = []
      return Promise.resolve()
    }
    loading.value = true
    inFlight = listNotifications()
      .then((rows) => {
        items.value = rows
      })
      .catch(() => {
        /* un aviso que no carga no debe romper la pantalla */
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })
    return inFlight
  }

  /** Idempotente: arranca el refresco mientras la pestaña esté visible. */
  function start(): void {
    if (timer) return
    void fetchNotifications()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') void fetchNotifications()
    }, REFRESH_MS)
  }

  function stop(): void {
    if (timer) clearInterval(timer)
    timer = null
    items.value = []
  }

  async function markRead(id: string): Promise<void> {
    const item = items.value.find((n) => n.id === id)
    if (!item || item.read_at) return
    item.read_at = new Date().toISOString() // respuesta inmediata en la UI
    await markNotificationRead(id)
  }

  async function markAllRead(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.userId || unreadCount.value === 0) return
    const now = new Date().toISOString()
    items.value.forEach((n) => {
      if (!n.read_at) n.read_at = now
    })
    await markAllNotificationsRead(auth.userId)
  }

  return {
    items,
    loading,
    unread,
    unreadCount,
    fetchNotifications,
    start,
    stop,
    markRead,
    markAllRead,
  }
})
