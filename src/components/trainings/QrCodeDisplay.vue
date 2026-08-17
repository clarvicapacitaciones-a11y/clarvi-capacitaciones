<script setup lang="ts">
// Muestra el QR de check-in de una capacitación con acciones de
// descarga y copia del link.

import { ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  checkinUrlForToken,
  downloadDataUrl,
  qrDataUrl,
} from '@/composables/useQrCode'

const props = defineProps<{ token: string; trainingTitle: string }>()

const dataUrl = ref('')
const copied = ref(false)

watch(
  () => props.token,
  async (token) => {
    dataUrl.value = await qrDataUrl(checkinUrlForToken(token))
  },
  { immediate: true },
)

function handleDownload(): void {
  const safeName = props.trainingTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  downloadDataUrl(dataUrl.value, `qr-${safeName || 'capacitacion'}.png`)
}

async function handleCopy(): Promise<void> {
  await navigator.clipboard.writeText(checkinUrlForToken(props.token))
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="qr-display">
    <img v-if="dataUrl" :src="dataUrl" alt="Código QR de asistencia" class="qr-img" />
    <p class="qr-url">{{ checkinUrlForToken(token) }}</p>
    <div class="qr-actions">
      <UiButton variant="ghost" icon="download" @click="handleDownload">
        Descargar PNG
      </UiButton>
      <UiButton
        variant="ghost"
        :icon="copied ? 'check' : 'link'"
        @click="handleCopy"
      >
        {{ copied ? 'Copiado' : 'Copiar link' }}
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

/* El QR se queda en blanco en los dos temas: un código invertido no lo lee
   la mitad de los teléfonos. */
.qr-img {
  width: min(230px, 100%);
  padding: 0.5rem;
  border-radius: var(--radius-md);
  border: var(--rule);
  background: #fff;
}

.qr-url {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  word-break: break-all;
  text-align: center;
}

.qr-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
