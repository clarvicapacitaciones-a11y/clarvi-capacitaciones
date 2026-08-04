<script setup lang="ts">
// Pantalla de espera de quien se registró con nombre de usuario: su cuenta
// existe, pero no puede usar la plataforma hasta que un líder la apruebe.
// El botón vuelve a leer el perfil por si ya la aprobaron.

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCatalogsStore } from '@/stores/catalogs.store'

const auth = useAuthStore()
const catalogs = useCatalogsStore()
const router = useRouter()

const checking = ref(false)
const stillPending = ref(false)

void catalogs.fetchCatalogs()

async function recheck(): Promise<void> {
  checking.value = true
  stillPending.value = false
  try {
    await auth.fetchProfile()
    if (!auth.isPendingApproval) {
      await router.push({ name: 'dashboard' })
      return
    }
    stillPending.value = true
  } finally {
    checking.value = false
  }
}

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <AuthLayout subtitle="Registro en revisión">
    <div class="pending-body">
      <div class="result-icon">⏳</div>
      <p class="result-text">Tu registro está pendiente de aprobación</p>
      <p class="muted">
        Un líder tiene que confirmar que trabajas en CLARVI antes de darte
        acceso. En cuanto lo apruebe podrás entrar con tu usuario y contraseña.
      </p>

      <div v-if="auth.profile" class="detail-box">
        <p><strong>{{ auth.profile.full_name }}</strong></p>
        <p class="muted">@{{ auth.profile.username }}</p>
        <p class="muted">
          {{ catalogs.areaName(auth.profile.area_id) }} ·
          {{ catalogs.sucursalName(auth.profile.sucursal_id) }}
        </p>
      </div>

      <p v-if="stillPending" class="muted">
        Todavía no hay respuesta. Avísale a tu líder que ya te registraste.
      </p>

      <div class="actions">
        <UiButton block :loading="checking" @click="recheck">
          Ya me aprobaron, revisar
        </UiButton>
        <UiButton variant="ghost" block @click="handleLogout">
          Cerrar sesión
        </UiButton>
      </div>
    </div>
  </AuthLayout>
</template>

<style scoped>
.pending-body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  text-align: center;
}

.result-icon {
  width: 62px;
  height: 62px;
  margin: 0 auto;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--color-warning-bg);
  font-size: 1.6rem;
}

.result-text {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-strong);
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
  margin-top: 0.35rem;
}
</style>
