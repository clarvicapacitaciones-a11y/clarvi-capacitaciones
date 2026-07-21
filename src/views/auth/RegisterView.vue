<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassInput from '@/components/glass/GlassInput.vue'
import GlassSelect from '@/components/glass/GlassSelect.vue'
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
    <div class="tabs">
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
      <GlassInput
        v-model="fullName"
        label="Nombre completo"
        placeholder="Nombre y apellidos"
        autocomplete="name"
        required
      />

      <GlassInput
        v-if="tab === 'email'"
        v-model="email"
        label="Correo corporativo"
        type="email"
        placeholder="nombre@clarvi.com"
        autocomplete="email"
        hint="Debe ser tu correo @clarvi.com"
        required
      />
      <GlassInput
        v-else
        v-model="username"
        label="Nombre de usuario"
        placeholder="nombre.apellido"
        autocomplete="username"
        hint="3 a 30 caracteres: letras, números, punto, guion"
        required
      />

      <div class="form-row">
        <GlassSelect
          v-model="areaId"
          label="Área"
          :options="areaOptions"
          required
        />
        <GlassSelect
          v-model="sucursalId"
          label="Sucursal"
          :options="sucursalOptions"
          required
        />
      </div>

      <div class="form-row">
        <GlassInput
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="new-password"
          hint="Mínimo 8 caracteres"
          required
        />
        <GlassInput
          v-model="passwordConfirm"
          label="Confirmar contraseña"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <GlassButton type="submit" block :loading="loading">
        Crear cuenta
      </GlassButton>
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
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
  background: rgba(var(--clarvi-navy-rgb), 0.06);
  border-radius: var(--radius-md);
  padding: 0.3rem;
}

.tab {
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.tab.is-active {
  background: #fff;
  color: var(--clarvi-navy);
  box-shadow: 0 2px 8px rgba(var(--clarvi-navy-rgb), 0.12);
}

.switch-link {
  text-align: center;
  margin: 1.25rem 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}
</style>
