// Presencia en una transmisión en vivo: "quién la está viendo".
//
// Mientras el reproductor está reproduciendo y la pestaña visible, se manda un
// latido cada 15 segundos. El servidor es quien suma el tiempo (el cliente
// nunca manda segundos), así que dejar la pestaña abierta sin reproducir no
// acredita nada, y cerrarla de golpe tampoco deja a nadie "viendo" para
// siempre: el latido vence a los 45 segundos.
//
// Es el equivalente en vivo de `useWatchTracking`, que mide la grabación.

import { onBeforeUnmount, ref } from 'vue'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/services/supabase'
import { liveHeartbeat, liveViewerCount } from '@/services/live.service'
import { useAuthStore } from '@/stores/auth.store'

const BEAT_MS = 15_000

export function useLivePresence(trainingId: string) {
  const viewers = ref(0)
  const auth = useAuthStore()

  let timer: number | null = null
  let watching = false
  let joined = false

  async function beat(leaving = false): Promise<void> {
    try {
      const result = await liveHeartbeat(trainingId, leaving)
      viewers.value = result.viewers
      if (result.status === 'ok' && !leaving) joined = true
    } catch {
      // Un latido perdido no rompe nada: el siguiente lo repone.
    }
  }

  /** Salida inmediata al cerrar la pestaña, para no dejar el latido colgado. */
  function leaveWithKeepalive(): void {
    if (!joined || !auth.accessToken) return
    void fetch(`${SUPABASE_URL}/rest/v1/rpc/live_heartbeat`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({ p_training_id: trainingId, p_leaving: true }),
    })
  }

  function stopTimer(): void {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  /** Lo llama el reproductor: true al reproducir, false al pausar o terminar. */
  function setWatching(value: boolean): void {
    if (watching === value) return
    watching = value
    if (value) {
      void beat()
      if (timer === null) {
        timer = window.setInterval(() => {
          if (document.hidden) return
          void beat()
        }, BEAT_MS)
      }
    } else {
      stopTimer()
      if (joined) void beat(true)
    }
  }

  /** Conteo para quien todavía no le da play (o ya lo pausó). */
  async function refreshCount(): Promise<void> {
    try {
      viewers.value = await liveViewerCount(trainingId)
    } catch {
      /* sin conteo, la interfaz simplemente no lo muestra */
    }
  }

  function onVisibilityChange(): void {
    if (!document.hidden && watching) void beat()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', leaveWithKeepalive)

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', leaveWithKeepalive)
    stopTimer()
    if (joined) void beat(true)
  })

  return { viewers, setWatching, refreshCount }
}
