<script setup lang="ts">
// Página pública a la que apunta el QR de cada capacitación.
// Sin sesión: muestra el nombre de la sesión e invita a entrar/registrarse
// (conservando el token para volver). Con sesión: registra la asistencia.

import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  checkinViaQr,
  getMyAttendance,
  trainingTitleForToken,
  type CheckinStatus,
} from '@/services/trainings.service'
import { formatDateTime } from '@/composables/useFormat'
import { useAuthStore } from '@/stores/auth.store'
import { useCatalogsStore } from '@/stores/catalogs.store'
import { supabase } from '@/services/supabase'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const route = useRoute()
const auth = useAuthStore()
const catalogs = useCatalogsStore()

const state = ref<'loading' | 'anonymous' | 'done' | 'invalid' | 'error'>(
  'loading',
)
const result = ref<CheckinStatus | null>(null)
const title = ref<string | null>(null)
const scannedAt = ref<string | null>(null)
const token = String(route.params.token ?? '')

onMounted(async () => {
  if (!UUID_REGEX.test(token)) {
    state.value = 'invalid'
    return
  }
  await auth.init()
  try {
    if (!auth.isAuthenticated) {
      title.value = await trainingTitleForToken(token)
      state.value = title.value ? 'anonymous' : 'invalid'
      return
    }
    await catalogs.fetchCatalogs()
    const response = await checkinViaQr(token)
    result.value = response.status
    title.value = response.trainingTitle
    if (response.status === 'invalid_token') {
      state.value = 'invalid'
      return
    }
    // Recuperar la hora del registro (nuevo o previo) para mostrarla.
    const { data: trainingRow } = await supabase
      .from('trainings')
      .select('id')
      .eq('qr_token', token)
      .maybeSingle()
    if (trainingRow && auth.userId) {
      const attendanceRow = await getMyAttendance(trainingRow.id, auth.userId)
      scannedAt.value = attendanceRow?.scanned_at ?? null
    }
    state.value = 'done'
  } catch {
    state.value = 'error'
  }
})
</script>

<template>
  <AuthLayout subtitle="Registro de asistencia">
    <div v-if="state === 'loading'" class="checkin-body">
      <p class="muted">Verificando…</p>
    </div>

    <div v-else-if="state === 'anonymous'" class="checkin-body">
      <p class="training-name">{{ title }}</p>
      <p class="muted">
        Inicia sesión o crea tu cuenta para registrar tu asistencia.
      </p>
      <div class="actions">
        <RouterLink :to="{ name: 'login', query: { redirect: route.fullPath } }">
          <UiButton block>Iniciar sesión</UiButton>
        </RouterLink>
        <RouterLink
          :to="{ name: 'registro', query: { redirect: route.fullPath } }"
        >
          <UiButton variant="ghost" block>Crear cuenta</UiButton>
        </RouterLink>
      </div>
    </div>

    <div v-else-if="state === 'done'" class="checkin-body">
      <div
        class="result-icon"
        :class="result === 'checked_in' ? 'is-success' : 'is-info'"
      >
        {{ result === 'checked_in' ? '✓' : 'ℹ' }}
      </div>
      <p class="training-name">{{ title }}</p>
      <p v-if="result === 'checked_in'" class="result-text">
        ¡Asistencia registrada!
      </p>
      <p v-else class="result-text">Ya habías registrado tu asistencia.</p>
      <div class="detail-box">
        <p><strong>{{ auth.profile?.full_name }}</strong></p>
        <p class="muted">
          {{ catalogs.areaName(auth.profile?.area_id ?? null) }} ·
          {{ catalogs.sucursalName(auth.profile?.sucursal_id ?? null) }}
        </p>
        <p v-if="scannedAt" class="muted">{{ formatDateTime(scannedAt) }}</p>
      </div>
      <RouterLink :to="{ name: 'dashboard' }">
        <UiButton block>Ir a mis capacitaciones</UiButton>
      </RouterLink>
    </div>

    <div v-else-if="state === 'invalid'" class="checkin-body">
      <div class="result-icon is-danger">✕</div>
      <p class="result-text">Código no válido</p>
      <p class="muted">
        Este código QR no corresponde a ninguna capacitación. Pide al
        instructor que muestre el código nuevamente.
      </p>
    </div>

    <div v-else class="checkin-body">
      <p class="form-error">
        Ocurrió un error al registrar tu asistencia. Intenta de nuevo.
      </p>
    </div>
  </AuthLayout>
</template>

<style scoped>
.checkin-body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  text-align: center;
}

.training-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-strong);
  margin: 0;
}

.result-text {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-strong);
  margin: 0;
}

/* Marca de resultado: círculo de color plano. */
.result-icon {
  width: 62px;
  height: 62px;
  margin: 0 auto;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  font-size: 1.7rem;
  font-weight: 500;
}

.result-icon.is-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.result-icon.is-info {
  background: var(--color-info-bg);
  color: var(--clarvi-blue-ink);
}

.result-icon.is-danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.detail-box {
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  padding: 0.9rem 1rem;
  text-align: left;
}

.detail-box p {
  margin: 0.15rem 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
</style>
