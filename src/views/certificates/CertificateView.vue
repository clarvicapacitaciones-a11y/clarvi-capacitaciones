<script setup lang="ts">
// Pantalla del diploma: la hoja imprimible más el botón de imprimir/guardar.
// Vive detrás de FEATURES.diplomas (el guard del router bloquea la ruta
// mientras esté apagada).

import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DiplomaSheet from '@/components/certificates/DiplomaSheet.vue'
import UiBackLink from '@/components/ui/UiBackLink.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { getCertificate } from '@/services/certificates.service'
import type { CertificateWithSnapshot } from '@/types/domain'

const route = useRoute()

const certificate = ref<CertificateWithSnapshot | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    certificate.value = await getCertificate(String(route.params.id ?? ''))
    if (!certificate.value) error.value = 'Ese diploma no existe o no es tuyo.'
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudo cargar el diploma'
  } finally {
    loading.value = false
  }
})

/** Guardar como PDF es "imprimir a PDF": el navegador ya sabe hacerlo. */
function printSheet(): void {
  window.print()
}
</script>

<template>
  <div class="page certificate-page">
    <header class="page-actions">
      <UiBackLink label="Mis capacitaciones" :to="{ name: 'dashboard' }" />
      <UiButton v-if="certificate" @click="printSheet">
        Imprimir o guardar PDF
      </UiButton>
    </header>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="form-error">{{ error }}</p>
    <DiplomaSheet v-else-if="certificate" :certificate="certificate" />
  </div>
</template>

<style scoped>
.page-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

/* Al imprimir solo queda la hoja. */
@media print {
  .page-actions {
    display: none;
  }

  .certificate-page {
    padding: 0;
    max-width: none;
  }
}
</style>
