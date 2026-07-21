<script setup lang="ts">
// Reproductor de YouTube con medición de visualización integrada.
// Reanuda donde el usuario se quedó y reporta el progreso en vivo al padre.

import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  loadYouTubeApi,
  type YTPlayer,
} from '@/composables/useYoutubePlayer'
import { useWatchTracking } from '@/composables/useWatchTracking'
import type { WatchedRange } from '@/types/domain'

const props = defineProps<{
  videoId: string
  trainingId: string
  initialRanges: WatchedRange[]
  initialPosition: number
  initialDuration: number
  isCompleted: boolean
}>()

const emit = defineEmits<{
  progress: [percent: number, watchedSeconds: number]
}>()

const playerEl = ref<HTMLDivElement | null>(null)
let player: YTPlayer | null = null

const tracking = useWatchTracking({
  trainingId: props.trainingId,
  getPlayer: () => player,
  initialRanges: props.initialRanges,
  initialDuration: props.initialDuration,
})

let emitTimer: number | null = null

onMounted(async () => {
  const YT = await loadYouTubeApi()
  if (!playerEl.value) return
  // Reanudar cerca de donde se quedó, salvo que ya haya completado.
  const startAt =
    !props.isCompleted && props.initialPosition > 5
      ? Math.floor(props.initialPosition)
      : 0
  player = new YT.Player(playerEl.value, {
    videoId: props.videoId,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      start: startAt,
      origin: window.location.origin,
    },
    events: {
      onReady: (event) => {
        tracking.setDuration(event.target.getDuration())
      },
      onStateChange: (event) => {
        tracking.onPlayerStateChange(event.data)
      },
    },
  })
  emitTimer = window.setInterval(() => {
    emit('progress', tracking.percent.value, tracking.watchedSecondsLive.value)
  }, 1000)
})

onBeforeUnmount(() => {
  if (emitTimer !== null) window.clearInterval(emitTimer)
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="player-frame">
    <div ref="playerEl" class="player-target" />
  </div>
</template>

<style scoped>
.player-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--glass-shadow);
  background: #000;
}

.player-frame :deep(iframe),
.player-target {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
