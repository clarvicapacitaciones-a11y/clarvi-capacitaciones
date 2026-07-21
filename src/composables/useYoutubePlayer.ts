// Carga única del YouTube IFrame Player API y creación de reproductores.
// No requiere API key: el API se comunica con el iframe vía postMessage.

export interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

/** Estados de YT.PlayerState (valores oficiales del IFrame API). */
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    config: {
      videoId: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YTPlayer }) => void
        onStateChange?: (event: { data: number; target: YTPlayer }) => void
      }
    },
  ) => YTPlayer
}

let apiPromise: Promise<YTNamespace> | null = null

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const w = window as unknown as {
      YT?: YTNamespace & { Player?: unknown }
      onYouTubeIframeAPIReady?: () => void
    }
    if (w.YT?.Player) {
      resolve(w.YT as YTNamespace)
      return
    }
    const previous = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(w.YT as YTNamespace)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}

/** Extrae el ID de 11 caracteres de cualquier formato de link de YouTube. */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  if (/^[\w-]{11}$/.test(value)) return value
  try {
    const url = new URL(value)
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0] ?? ''
      return /^[\w-]{11}$/.test(id) ? id : null
    }
    if (/(^|\.)youtube\.com$/.test(url.hostname)) {
      const v = url.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const match = url.pathname.match(/^\/(?:embed|live|shorts|v)\/([\w-]{11})/)
      if (match) return match[1] ?? null
    }
  } catch {
    return null
  }
  return null
}
