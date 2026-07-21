// Medición de visualización real del video.
//
// Estrategia:
//  - Un heartbeat local cada 5s lee la posición del reproductor mientras
//    está en PLAYING y la pestaña es visible.
//  - Se construyen "rangos vistos" [inicio, fin]: un salto entre dos
//    lecturas mayor al que permite la reproducción normal (velocidad ≤2x)
//    cierra el rango actual y abre otro, de modo que adelantar el video
//    arrastrando la barra NO acredita el tramo saltado.
//  - Los rangos se fusionan (re-ver un tramo no lo cuenta dos veces) y el
//    total cubierto es el avance real del usuario.
//  - Se escribe a Supabase cada 3 heartbeats (~15s) y siempre al pausar,
//    terminar, ocultar la pestaña o salir (con fetch keepalive para
//    sobrevivir el cierre). El RPC del servidor re-valida los rangos y
//    aplica su propio tope anti-trampa.

import { onBeforeUnmount, ref } from 'vue'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { YT_STATE, type YTPlayer } from '@/composables/useYoutubePlayer'
import type { WatchedRange } from '@/types/domain'

const TICK_MS = 5000
const FLUSH_EVERY_TICKS = 3
/** Avance máximo entre lecturas para considerarse reproducción continua. */
const MAX_DELTA_SECONDS = (TICK_MS / 1000) * 2.5 + 2
/** Rangos separados por menos de esto se fusionan (jitter del player). */
const MERGE_SLACK_SECONDS = 1.5
const MIN_SEGMENT_SECONDS = 0.5

export function mergeRanges(
  ranges: WatchedRange[],
  next: WatchedRange,
): WatchedRange[] {
  const all = [...ranges, next].sort((a, b) => a[0] - b[0])
  const merged: WatchedRange[] = []
  for (const range of all) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1] + MERGE_SLACK_SECONDS) {
      last[1] = Math.max(last[1], range[1])
    } else {
      merged.push([range[0], range[1]])
    }
  }
  return merged
}

export function coveredSeconds(ranges: WatchedRange[]): number {
  return ranges.reduce((total, [start, end]) => total + (end - start), 0)
}

export interface WatchTrackingOptions {
  trainingId: string
  getPlayer: () => YTPlayer | null
  initialRanges: WatchedRange[]
  initialDuration: number
}

export function useWatchTracking(options: WatchTrackingOptions) {
  const percent = ref(0)
  const watchedSecondsLive = ref(0)

  let ranges: WatchedRange[] = options.initialRanges.map(([s, e]) => [s, e])
  let segmentStart: number | null = null
  let lastTime: number | null = null
  let duration = options.initialDuration
  let tickCount = 0
  let timer: number | null = null
  let hasPlayed = false

  const auth = useAuthStore()

  function commitSegment(): void {
    if (
      segmentStart !== null &&
      lastTime !== null &&
      lastTime - segmentStart >= MIN_SEGMENT_SECONDS
    ) {
      ranges = mergeRanges(ranges, [segmentStart, lastTime])
    }
    segmentStart = null
    lastTime = null
  }

  function updateLiveStats(): void {
    let current = ranges
    if (
      segmentStart !== null &&
      lastTime !== null &&
      lastTime > segmentStart
    ) {
      current = mergeRanges(ranges, [segmentStart, lastTime])
    }
    const covered = coveredSeconds(current)
    watchedSecondsLive.value = covered
    percent.value = duration > 0 ? Math.min(100, (covered / duration) * 100) : 0
  }

  function tick(): void {
    const player = options.getPlayer()
    if (!player) return
    if (document.hidden) {
      commitSegment()
      return
    }
    if (player.getPlayerState() !== YT_STATE.PLAYING) {
      commitSegment()
      updateLiveStats()
      return
    }
    if (!duration) duration = player.getDuration() || 0
    const current = player.getCurrentTime()
    if (lastTime === null || segmentStart === null) {
      segmentStart = current
      lastTime = current
    } else {
      const delta = current - lastTime
      if (delta > 0 && delta <= MAX_DELTA_SECONDS) {
        lastTime = current
      } else {
        // Salto (scrub), retroceso o congelamiento: cerrar y re-anclar.
        commitSegment()
        segmentStart = current
        lastTime = current
      }
    }
    updateLiveStats()
    tickCount += 1
    if (tickCount % FLUSH_EVERY_TICKS === 0) {
      void flush()
    }
  }

  function startTimer(): void {
    if (timer === null) {
      timer = window.setInterval(tick, TICK_MS)
    }
  }

  /** Conectar al evento onStateChange del reproductor. */
  function onPlayerStateChange(state: number): void {
    if (state === YT_STATE.PLAYING) {
      hasPlayed = true
      startTimer()
      return
    }
    if (state === YT_STATE.PAUSED || state === YT_STATE.ENDED) {
      commitSegment()
      updateLiveStats()
      void flush()
    }
  }

  function buildPayload() {
    const player = options.getPlayer()
    return {
      p_training_id: options.trainingId,
      p_ranges: ranges,
      p_position: player ? player.getCurrentTime() : (lastTime ?? 0),
      p_duration: duration || 0,
    }
  }

  async function flush(): Promise<void> {
    if (!hasPlayed || ranges.length === 0) return
    // Cerrar el segmento abierto sin perder el ancla de reproducción.
    if (
      segmentStart !== null &&
      lastTime !== null &&
      lastTime - segmentStart >= MIN_SEGMENT_SECONDS
    ) {
      ranges = mergeRanges(ranges, [segmentStart, lastTime])
      segmentStart = lastTime
    }
    const { error } = await supabase.rpc('upsert_watch_progress', buildPayload())
    if (error) {
      console.error('No se pudo guardar el progreso:', error.message)
    }
  }

  /** Flush síncrono-compatible para beforeunload/pagehide. */
  function flushWithKeepalive(): void {
    if (!hasPlayed || !auth.accessToken) return
    commitSegment()
    if (ranges.length === 0) return
    void fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_watch_progress`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify(buildPayload()),
    })
  }

  function onVisibilityChange(): void {
    if (document.hidden) {
      commitSegment()
      void flush()
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', flushWithKeepalive)

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', flushWithKeepalive)
    commitSegment()
    void flush()
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  })

  updateLiveStats()

  return {
    percent,
    watchedSecondsLive,
    onPlayerStateChange,
    setDuration(value: number) {
      if (value > 0) duration = value
      updateLiveStats()
    },
  }
}
