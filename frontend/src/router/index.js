import { createRouter, createWebHistory } from 'vue-router'
// All views lazy-loaded, landing included, to keep the entry bundle small (DT-17).

// La pestaña "Equipo" del proyecto se ocultó: el acceso se da en "Miembros".
export function redirectLegacyProjectTab(to) {
  if (to.query.tab !== 'team') return true
  return { path: to.path, query: { ...to.query, tab: 'members' }, hash: to.hash, replace: true }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // Enlaces a una sección (/settings#sale-config); 72px por la barra fija.
    if (to.hash && document.querySelector(to.hash)) {
      return { el: to.hash, top: -72, behavior: 'instant' }
    }
    return { top: 0, behavior: 'instant' }
  },
  // `meta.surface`: la vista va sobre <AppSurface> (velo de contraste sobre el
  // fondo animado, DT-09 / T-18). Las vistas internas no pintan fondo de página.
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingPage.vue'),
    },
    {
      path: '/legal',
      name: 'legal',
      component: () => import('../views/LegalView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
    {
      // Receives ?token=&onboarding=&error= from the backend Google OAuth callback
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallback.vue'),
    },
    {
      // Shown when user is authenticated but belongs to no empresa yet
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../views/OnboardingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/invite/:token',
      name: 'invite',
      component: () => import('../views/InviteView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('../views/ProjectsView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresProjectsAccess: true },
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: () => import('../views/ProjectDetailView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresProjectsAccess: true },
      beforeEnter: redirectLegacyProjectTab,
    },
    {
      path: '/teams',
      name: 'teams',
      component: () => import('../views/TeamsView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresTeamManagement: true, requiresFeature: 'teams' },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('../views/InventoryPage.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/inventory/:id',
      name: 'inventory-detail',
      component: () => import('../views/ProductDetailView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/sales',
      name: 'sales',
      component: () => import('../views/SalesView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/suppliers',
      name: 'suppliers',
      component: () => import('../views/SuppliersView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('../views/ReportsView.vue'),
      meta: { surface: true, requiresAuth: true }
    },
    {
      path: '/reports/:id',
      name: 'report-detail',
      component: () => import('../views/ReportDetailView.vue'),
      meta: { surface: true, requiresAuth: true }
    },
    {
      path: '/budget',
      name: 'budget',
      component: () => import('../views/BudgetView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/agent',
      name: 'agent',
      component: () => import('../views/AgentView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresFeature: 'ai_agent' },
    },
    {
      path: '/integrations',
      name: 'integrations',
      component: () => import('../views/IntegrationsView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresFeature: 'integrations' },
    },
    {
      path: '/marketing',
      name: 'marketing',
      component: () => import('../views/MarketingPublicationsView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true, requiresFeature: 'marketing' },
    },
    {
      // PAY-1 — Planes y suscripción de la empresa (pasarela en modo de prueba).
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { surface: true, requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { surface: true, requiresAuth: true, requiresSuperUser: true },
      children: [
        { path: '',        name: 'admin-dashboard', component: () => import('../views/admin/AdminDashboardView.vue') },
        { path: 'companies', name: 'admin-companies', component: () => import('../views/admin/AdminCompaniesView.vue') },
        { path: 'users',     name: 'admin-users',     component: () => import('../views/admin/AdminUsersView.vue') },
      ],
    },
    // Cualquier ruta que no exista. Va al final y sin meta: es pública, sin
    // AppSurface, y los guards no la redirigen a login.
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

import { useAuthStore } from '../stores/auth'

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Not authenticated → redirect to login
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'login' })
    return
  }

  // Super user belongs only in the admin panel
  if (authStore.isSuperUser && to.meta.requiresAuth && !to.meta.requiresSuperUser) {
    next({ name: 'admin-dashboard' })
    return
  }

  // Authenticated but heading to a route that needs an empresa context (super_user bypasses this)
  if (authStore.isLoggedIn && to.meta.requiresEmpresa && !authStore.isSuperUser) {
    // Reload empresas if the list is empty (e.g. after a hard refresh with no localStorage)
    if (!authStore.empresas.length && !authStore.empresaActual) {
      await authStore.loadEmpresas()
    }

    if (!authStore.empresaActual) {
      next({ name: 'onboarding' })
      return
    }

    const accessEmpresaId = authStore.accessContext?.empresa?.id_empresa
    if (accessEmpresaId !== authStore.idEmpresaActual) {
      await authStore.loadAccessContext()
    }
  }

  if (to.meta.requiresProjectsAccess && !authStore.canViewProjects) {
    next({ name: 'dashboard' })
    return
  }

  if (to.meta.requiresInventoryAccess && !authStore.canViewInventory) {
    next({ name: 'dashboard' })
    return
  }

  if (to.meta.requiresTeamManagement && !authStore.canManageTeams) {
    next({ name: 'dashboard' })
    return
  }

  // PAY-1 — Módulo fuera del plan: se muestra la página de planes en vez de
  // una vista que solo recibiría 403. El backend aplica la misma regla.
  if (to.meta.requiresFeature && !authStore.isSuperUser && !authStore.hasFeature(to.meta.requiresFeature)) {
    next({ name: 'billing', query: { feature: to.meta.requiresFeature } })
    return
  }

  // Block non-super-user access to admin panel
  if (to.meta.requiresSuperUser && !authStore.isSuperUser) {
    next({ name: authStore.isLoggedIn ? 'dashboard' : 'login' })
    return
  }

  next()
})

export default router
