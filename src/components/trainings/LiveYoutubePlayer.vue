<script setup lang="ts">
// Reproductor de la transmisión en vivo.
//
// A diferencia del reproductor de la grabación, aquí no se miden "rangos
// vistos": en un directo no hay una línea de tiempo fija que cubrir. Lo que se
// mide es presencia —quién está conectado y cuánto tiempo— y eso es lo que al
// terminar se convierte en progreso de la grabación.
//
// El reproductor también es el testigo del final: cuando YouTube da por
// terminada la transmisión, el iframe pasa a ENDED y se avisa al padre. Es la
// vía más confiable para enterarse, porque el navegador de una persona sí ve
// YouTube sin el muro anti-bot que le sale a un servidor.

import { onBeforeUnmount, onMounted, ref } from 'vue'
import { loadYouTubeApi, YT_STATE, type YTPlayer } from '@/composables/useYoutubePlayer'
import { useLivePresence } from '@/composables/useLivePresence'

const props = defineProps<{
  videoId: string
  trainingId: string
}>()

const emit = defineEmits<{ ended: [] }>()

const playerEl = ref<HTMLDivElement | null>(null)
let player: YTPlayer | null = null

const { viewers, setWatching, refreshCount } = useLivePresence(props.trainingId)

onMounted(async () => {
  void refreshCount()
  const YT = await loadYouTubeApi()
  if (!playerEl.value) return
  player = new YT.Player(playerEl.value, {
    videoId: props.videoId,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      // Un directo se ve desde el aire, no desde donde arrancó.
      autoplay: 0,
      origin: window.location.origin,
    },
    events: {
      onStateChange: (event) => {
        if (event.data === YT_STATE.PLAYING) {
          setWatching(true)
          return
        }
        setWatching(false)
        if (event.data === YT_STATE.ENDED) emit('ended')
      },
    },
  })
})

onBeforeUnmount(() => {
  setWatching(false)
  player?.destroy()
  player = null
})
</script>

<template>
  <div>
    <div class="player-frame">
      <div ref="playerEl" class="player-target" />
    </div>
    <p class="viewers">
      <span class="live-dot" aria-hidden="true" />
      <template v-if="viewers === 1">1 persona viendo la transmisión</template>
      <template v-else>{{ viewers }} personas viendo la transmisión</template>
    </p>
  </div>
</template>

<style scoped>
.player-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #000;
}

.player-frame :deep(iframe),
.player-target {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.viewers {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* Punto sólido, sin parpadeo: en este sistema solo se anima el color. */
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
}
</style>
