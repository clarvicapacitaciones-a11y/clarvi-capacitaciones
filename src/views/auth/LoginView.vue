<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassInput from '@/components/glass/GlassInput.vue'
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
    <div class="tabs">
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

      <GlassInput
        v-if="tab === 'email'"
        v-model="email"
        label="Correo corporativo"
        type="email"
        placeholder="nombre@clarvi.com"
        autocomplete="email"
        required
      />
      <GlassInput
        v-else
        v-model="username"
        label="Nombre de usuario"
        placeholder="tu.usuario"
        autocomplete="username"
        required
      />

      <GlassInput
        v-model="password"
        label="Contraseña"
        type="password"
        autocomplete="current-password"
        required
      />

      <p v-if="error" class="form-error">{{ error }}</p>

      <GlassButton type="submit" block :loading="loading">
        Iniciar sesión
      </GlassButton>
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
