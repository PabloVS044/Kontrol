import { createRouter, createWebHistory } from 'vue-router'
// Landing is the public entry point → keep it eager for instant first paint.
// Every other view is lazy-loaded (() => import) so each route ships its own
// chunk and the initial bundle stays small (heavy deps like three/zxing only
// load when their route does).
import LandingPage from '../views/LandingPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingPage,
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
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('../views/ProjectsView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true, requiresProjectsAccess: true },
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: () => import('../views/ProjectDetailView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true, requiresProjectsAccess: true },
    },
    {
      path: '/teams',
      name: 'teams',
      component: () => import('../views/TeamsView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true, requiresTeamManagement: true },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('../views/InventoryPage.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/inventory/:id',
      name: 'inventory-detail',
      component: () => import('../views/ProductDetailView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('../views/ReportsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reports/:id',
      name: 'report-detail',
      component: () => import('../views/ReportDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/budget',
      name: 'budget',
      component: () => import('../views/BudgetView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/agent',
      name: 'agent',
      component: () => import('../views/AgentView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/integrations',
      name: 'integrations',
      component: () => import('../views/IntegrationsView.vue'),
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresSuperUser: true },
      children: [
        { path: '',        name: 'admin-dashboard', component: () => import('../views/admin/AdminDashboardView.vue') },
        { path: 'companies', name: 'admin-companies', component: () => import('../views/admin/AdminCompaniesView.vue') },
        { path: 'users',     name: 'admin-users',     component: () => import('../views/admin/AdminUsersView.vue') },
      ],
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

  // Block non-super-user access to admin panel
  if (to.meta.requiresSuperUser && !authStore.isSuperUser) {
    next({ name: authStore.isLoggedIn ? 'dashboard' : 'login' })
    return
  }

  next()
})

export default router
