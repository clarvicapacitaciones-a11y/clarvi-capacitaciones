<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCatalogsStore } from '@/stores/catalogs.store'

const auth = useAuthStore()
const catalogs = useCatalogsStore()
const route = useRoute()
const router = useRouter()

const tab = ref<'email' | 'username'>('email')
const fullName = ref('')
const email = ref('')
const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const areaId = ref('')
const sucursalId = ref('')
const error = ref('')
const loading = ref(false)

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

onMounted(() => {
  void catalogs.fetchCatalogs()
})

async function handleSubmit(): Promise<void> {
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  loading.value = true
  try {
    await auth.register({
      method: tab.value,
      email: tab.value === 'email' ? email.value : undefined,
      username: tab.value === 'username' ? username.value : undefined,
      password: password.value,
      full_name: fullName.value,
      area_id: areaId.value,
      sucursal_id: sucursalId.value,
    })
    // El alta por usuario queda pendiente de que un líder la apruebe.
    if (tab.value === 'username') {
      await router.push({ name: 'pendiente' })
      return
    }
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect ?? { name: 'dashboard' })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al crear la cuenta'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout subtitle="Crea tu cuenta">
    <div class="tabs is-block">
      <button
        class="tab"
        :class="{ 'is-active': tab === 'email' }"
        @click="tab = 'email'"
      >
        Tengo correo
      </button>
      <button
        class="tab"
        :class="{ 'is-active': tab === 'username' }"
        @click="tab = 'username'"
      >
        No tengo correo
      </button>
    </div>

    <form class="form-grid" @submit.prevent="handleSubmit">
      <UiInput
        v-model="fullName"
        label="Nombre completo"
        placeholder="Nombre y apellidos"
        autocomplete="name"
        required
      />

      <UiInput
        v-if="tab === 'email'"
        v-model="email"
        label="Correo corporativo"
        type="email"
        placeholder="nombre@clarvi.com"
        autocomplete="email"
        hint="Debe ser tu correo @clarvi.com"
        required
      />
      <UiInput
        v-else
        v-model="username"
        label="Nombre de usuario"
        placeholder="nombre.apellido"
        autocomplete="username"
        hint="3 a 30 caracteres: letras, números, punto, guion"
        required
      />

      <p v-if="tab === 'username'" class="approval-note">
        Al no haber correo corporativo que te identifique, tu registro lo tiene
        que <strong>aprobar un líder</strong>. Podrás entrar en cuanto lo haga.
      </p>

      <div class="form-row">
        <UiSelect
          v-model="areaId"
          label="Área"
          :options="areaOptions"
          required
        />
        <UiSelect
          v-model="sucursalId"
          label="Sucursal"
          :options="sucursalOptions"
          required
        />
      </div>

      <div class="form-row">
        <UiInput
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="new-password"
          hint="Mínimo 8 caracteres"
          required
        />
        <UiInput
          v-model="passwordConfirm"
          label="Confirmar contraseña"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <UiButton type="submit" block :loading="loading">
        Crear cuenta
      </UiButton>
    </form>

    <p class="switch-link">
      ¿Ya tienes cuenta?
      <RouterLink :to="{ name: 'login', query: route.query }">
        Inicia sesión
      </RouterLink>
    </p>
  </AuthLayout>
</template>

<style scoped>
.switch-link {
  text-align: center;
  margin: 1.25rem 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* Aviso de que el alta por usuario no es inmediata. */
.approval-note {
  margin: 0;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-md);
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: 0.85rem;
  line-height: 1.45;
}

.approval-note strong {
  font-weight: 600;
}
</style>
