<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const showHeader = computed(() => route.matched.length > 0 && !route.meta.bare)

// Si la sesión se pierde estando dentro de la app (expiró en otra pestaña, se
// cerró sesión, etc.), el guard de navegación no se dispara hasta que el
// usuario navega, así que podría quedarse en una pantalla de administración
// disparando escrituras sin token. Al detectar la pérdida lo mandamos a login
// para que vuelva a autenticarse en lugar de toparse con errores confusos.
watch(
  () => auth.isAuthenticated,
  (isAuth, wasAuth) => {
    if (wasAuth && !isAuth && !route.meta.public) {
      void router.push({ name: 'login', query: { redirect: route.fullPath } })
    }
  },
)
</script>

<template>
  <AppHeader v-if="showHeader" />
  <RouterView />
</template>
