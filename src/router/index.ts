import { createRouter, createWebHistory } from 'vue-router'
import { applyGuards } from '@/router/guards'
import { ADMIN_ROLES, APPROVER_ROLES } from '@/types/domain'

// meta.public: accesible sin sesión.
// meta.bare: sin header de la app (login, registro, check-in).
// meta.roles: roles permitidos; sin definir = cualquier usuario autenticado.

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'dashboard' } },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true, bare: true },
    },
    {
      path: '/registro',
      name: 'registro',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { public: true, bare: true },
    },
    {
      path: '/pendiente',
      name: 'pendiente',
      component: () => import('@/views/auth/PendingApprovalView.vue'),
      meta: { bare: true },
    },
    {
      path: '/checkin/:token',
      name: 'checkin',
      component: () => import('@/views/checkin/CheckinView.vue'),
      meta: { public: true, bare: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/dashboard/DashboardView.vue'),
    },
    {
      path: '/capacitaciones/:id',
      name: 'training-detail',
      component: () => import('@/views/trainings/TrainingDetailView.vue'),
    },
    {
      path: '/capacitaciones/:id/examen',
      name: 'exam-runner',
      component: () => import('@/views/exams/ExamRunnerView.vue'),
    },
    {
      path: '/perfil',
      name: 'perfil',
      component: () => import('@/views/ProfileView.vue'),
    },
    {
      // El líder entra a esta sección, pero solo a Solicitudes: cada hijo
      // declara sus roles y el hijo gana sobre el meta del padre.
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { roles: APPROVER_ROLES },
      children: [
        // Al líder lo reencamina el guard: los redirect se resuelven antes de
        // que la sesión esté cargada, así que aquí no se sabe qué rol es.
        { path: '', redirect: { name: 'admin-trainings' } },
        {
          path: 'capacitaciones',
          name: 'admin-trainings',
          component: () => import('@/views/admin/AdminTrainingListView.vue'),
          meta: { roles: ADMIN_ROLES },
        },
        {
          path: 'capacitaciones/nueva',
          name: 'admin-training-new',
          component: () => import('@/views/admin/AdminTrainingFormView.vue'),
          meta: { roles: ADMIN_ROLES },
        },
        {
          path: 'capacitaciones/:id',
          name: 'admin-training-detail',
          component: () => import('@/views/admin/AdminTrainingDetailView.vue'),
          meta: { roles: ADMIN_ROLES },
        },
        {
          path: 'capacitaciones/:id/editar',
          name: 'admin-training-edit',
          component: () => import('@/views/admin/AdminTrainingFormView.vue'),
          meta: { roles: ADMIN_ROLES },
        },
        {
          path: 'usuarios',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsersView.vue'),
          meta: { roles: ADMIN_ROLES },
        },
        {
          path: 'solicitudes',
          name: 'admin-approvals',
          component: () => import('@/views/admin/AdminApprovalsView.vue'),
          meta: { roles: APPROVER_ROLES },
        },
        {
          path: 'catalogos',
          name: 'admin-catalogs',
          component: () => import('@/views/admin/AdminCatalogsView.vue'),
          meta: { roles: ADMIN_ROLES },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { public: true, bare: true },
    },
  ],
})

applyGuards(router)

export default router
