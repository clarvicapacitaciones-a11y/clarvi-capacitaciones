<script setup lang="ts">
// Perfil propio: datos personales y cambio de contraseña.

import { computed, onMounted, ref } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { FEATURES } from '@/config/features'
import { formatDateTime } from '@/composables/useFormat'
import { listMyCertificates } from '@/services/certificates.service'
import { updateProfile } from '@/services/profiles.service'
import { useAuthStore } from '@/stores/auth.store'
import { useCatalogsStore } from '@/stores/catalogs.store'
import { ROLE_LABELS, type CertificateWithSnapshot } from '@/types/domain'

const auth = useAuthStore()
const catalogs = useCatalogsStore()

const fullName = ref('')
const areaId = ref('')
const sucursalId = ref('')
const profileMessage = ref('')
const profileError = ref('')
const savingProfile = ref(false)

const newPassword = ref('')
const confirmPassword = ref('')
const passwordMessage = ref('')
const passwordError = ref('')
const savingPassword = ref(false)

const areaOptions = computed(() =>
  catalogs.areas
    .filter((area) => area.activo)
    .map((area) => ({ value: area.id, label: area.nombre })),
)
const sucursalOptions = computed(() =>
  catalogs.sucursales
    .filter((sucursal) => sucursal.activo)
    .map((sucursal) => ({ value: sucursal.id, label: sucursal.nombre })),
)

const accountLabel = computed(() => {
  if (!auth.profile) return ''
  return auth.profile.auth_method === 'email'
    ? (auth.profile.email ?? '')
    : `@${auth.profile.username ?? ''}`
})

// Diplomas: la base de datos ya los emite, pero no se muestran hasta que se
// encienda FEATURES.diplomas.
const certificates = ref<CertificateWithSnapshot[]>([])

onMounted(async () => {
  await catalogs.fetchCatalogs()
  if (auth.profile) {
    fullName.value = auth.profile.full_name
    areaId.value = auth.profile.area_id ?? ''
    sucursalId.value = auth.profile.sucursal_id ?? ''
  }
  if (FEATURES.diplomas && auth.userId) {
    certificates.value = await listMyCertificates(auth.userId)
  }
})

async function saveProfile(): Promise<void> {
  if (!auth.userId) return
  profileError.value = ''
  profileMessage.value = ''
  savingProfile.value = true
  try {
    await updateProfile(auth.userId, {
      full_name: fullName.value.trim(),
      area_id: areaId.value || null,
      sucursal_id: sucursalId.value || null,
    })
    await auth.fetchProfile()
    profileMessage.value = 'Datos actualizados'
  } catch (err) {
    profileError.value =
      err instanceof Error ? err.message : 'No se pudieron guardar los cambios'
  } finally {
    savingProfile.value = false
  }
}

async function savePassword(): Promise<void> {
  passwordError.value = ''
  passwordMessage.value = ''
  if (newPassword.value.length < 8) {
    passwordError.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Las contraseñas no coinciden'
    return
  }
  savingPassword.value = true
  try {
    await auth.changePassword(newPassword.value)
    passwordMessage.value = 'Contraseña actualizada'
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    passwordError.value =
      err instanceof Error ? err.message : 'No se pudo cambiar la contraseña'
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="page profile-page">
    <header class="page-header">
      <h1>Mi perfil</h1>
    </header>

    <UiCard v-if="auth.profile" class="profile-card">
      <div class="account-row">
        <div>
          <p class="account-id">{{ accountLabel }}</p>
          <p class="muted">
            Cuenta por
            {{ auth.profile.auth_method === 'email' ? 'correo' : 'usuario' }}
          </p>
        </div>
        <UiBadge tone="info">{{ ROLE_LABELS[auth.profile.role] }}</UiBadge>
      </div>

      <form class="form-grid" @submit.prevent="saveProfile">
        <UiInput v-model="fullName" label="Nombre completo" required />
        <div class="form-row">
          <UiSelect v-model="areaId" label="Área" :options="areaOptions" />
          <UiSelect
            v-model="sucursalId"
            label="Sucursal"
            :options="sucursalOptions"
          />
        </div>
        <p v-if="profileError" class="form-error">{{ profileError }}</p>
        <p v-if="profileMessage" class="form-success">{{ profileMessage }}</p>
        <div>
          <UiButton type="submit" :loading="savingProfile">
            Guardar cambios
          </UiButton>
        </div>
      </form>
    </UiCard>

    <UiCard v-if="FEATURES.diplomas" class="profile-card">
      <h3>Mis diplomas</h3>
      <p v-if="certificates.length === 0" class="muted">
        Cuando acredites una capacitación, tu diploma aparecerá aquí.
      </p>
      <ul v-else class="diploma-list">
        <li v-for="certificate in certificates" :key="certificate.id">
          <RouterLink
            :to="{ name: 'diploma', params: { id: certificate.id } }"
            class="diploma-row"
          >
            <span class="diploma-title">
              {{ certificate.snapshot.training_title }}
            </span>
            <span class="muted">
              {{ formatDateTime(certificate.earned_at) }} ·
              Folio {{ certificate.folio }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </UiCard>

    <UiCard class="profile-card">
      <h3>Cambiar contraseña</h3>
      <p v-if="auth.profile?.auth_method === 'username'" class="muted">
        Tu cuenta no tiene correo: si olvidas tu contraseña, un administrador
        tendrá que ayudarte, así que guárdala bien.
      </p>
      <form class="form-grid" @submit.prevent="savePassword">
        <div class="form-row">
          <UiInput
            v-model="newPassword"
            label="Nueva contraseña"
            type="password"
            autocomplete="new-password"
            required
          />
          <UiInput
            v-model="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
        <p v-if="passwordMessage" class="form-success">{{ passwordMessage }}</p>
        <div>
          <UiButton type="submit" :loading="savingPassword">
            Actualizar contraseña
          </UiButton>
        </div>
      </form>
    </UiCard>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 620px;
}

.profile-card {
  margin-bottom: 1rem;
}

.account-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.9rem;
  border-bottom: var(--rule);
}

.account-id {
  font-weight: 500;
  color: var(--text-strong);
  margin: 0;
}

/* Diplomas: renglones separados por línea, como las tablas. */
.diploma-list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}

.diploma-row {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.7rem 0;
  border-top: var(--rule);
  font-size: 0.9rem;
}

.diploma-title {
  color: var(--text-strong);
  font-weight: 500;
}
</style>
