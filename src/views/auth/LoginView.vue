<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const tab = ref<'email' | 'username'>('email')
const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const notice = ref('')
const loading = ref(false)

onMounted(() => {
  if (route.query.inactive === '1') {
    notice.value =
      'Tu cuenta está desactivada. Contacta a un administrador de CLARVI.'
  }
  if (route.query.rejected === '1') {
    notice.value =
      'Tu registro fue rechazado. Si crees que es un error, habla con tu líder.'
  }
})

async function handleSubmit(): Promise<void> {
  error.value = ''
  loading.value = true
  try {
    if (tab.value === 'email') {
      await auth.loginWithEmail(email.value, password.value)
    } else {
      await auth.loginWithUsername(username.value, password.value)
    }
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect ?? { name: 'dashboard' })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="tabs is-block">
      <button
        class="tab"
        :class="{ 'is-active': tab === 'email' }"
        @click="tab = 'email'"
      >
        Con correo
      </button>
      <button
        class="tab"
        :class="{ 'is-active': tab === 'username' }"
        @click="tab = 'username'"
      >
        Con usuario
      </button>
    </div>

    <form class="form-grid" @submit.prevent="handleSubmit">
      <p v-if="notice" class="form-error">{{ notice }}</p>

      <UiInput
        v-if="tab === 'email'"
        v-model="email"
        label="Correo corporativo"
        type="email"
        placeholder="nombre@clarvi.com"
        autocomplete="email"
        required
      />
      <UiInput
        v-else
        v-model="username"
        label="Nombre de usuario"
        placeholder="tu.usuario"
        autocomplete="username"
        required
      />

      <UiInput
        v-model="password"
        label="Contraseña"
        type="password"
        autocomplete="current-password"
        required
      />

      <p v-if="error" class="form-error">{{ error }}</p>

      <UiButton type="submit" block :loading="loading">
        Iniciar sesión
      </UiButton>
    </form>

    <p class="switch-link">
      ¿No tienes cuenta?
      <RouterLink :to="{ name: 'registro', query: route.query }">
        Regístrate
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
</style>
