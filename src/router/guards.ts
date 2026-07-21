// Guards globales: autenticación, cuentas desactivadas y roles.

import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types/domain'

export function applyGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    await auth.init()

    // Cuenta desactivada por un administrador: cerrar sesión.
    if (auth.isAuthenticated && auth.profile && !auth.profile.is_active) {
      await auth.logout()
      return { name: 'login', query: { inactive: '1' } }
    }

    if (to.meta.public) {
      // Un usuario con sesión no necesita login/registro: continuar el flujo.
      if (auth.isAuthenticated && (to.name === 'login' || to.name === 'registro')) {
        const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : null
        return redirect ? { path: redirect } : { name: 'dashboard' }
      }
      return true
    }

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    const allowedRoles = to.meta.roles as UserRole[] | undefined
    if (allowedRoles && (!auth.role || !allowedRoles.includes(auth.role))) {
      return { name: 'dashboard' }
    }

    return true
  })
}
