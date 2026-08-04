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

    // Registro rechazado: no hay nada que esperar, se cierra la sesión.
    if (auth.isAuthenticated && auth.isRejected) {
      await auth.logout()
      return { name: 'login', query: { rejected: '1' } }
    }

    // Registro pendiente de aprobación: solo la pantalla de espera. La RLS
    // aplica lo mismo del lado del servidor, esto es para que la persona vea
    // una explicación en vez de pantallas vacías.
    if (auth.isAuthenticated && auth.isPendingApproval) {
      return to.name === 'pendiente' ? true : { name: 'pendiente' }
    }
    if (auth.isAuthenticated && to.name === 'pendiente') {
      return { name: 'dashboard' }
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
      // El líder tiene acceso a la sección de administración, pero solo a
      // Solicitudes: si cae en cualquier otra pantalla de ahí (incluido
      // /admin, que redirige a Capacitaciones), se le manda a la suya.
      if (auth.isLider && to.path.startsWith('/admin')) {
        return { name: 'admin-approvals' }
      }
      return { name: 'dashboard' }
    }

    return true
  })
}
