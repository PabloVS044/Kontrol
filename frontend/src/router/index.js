import { createRouter, createWebHistory } from 'vue-router'
import LoginView     from '../views/LoginView.vue'
import RegisterView  from '../views/RegisterView.vue'
import LandingPage   from '../views/LandingPage.vue'
import InventoryPage from '../views/InventoryPage.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import ProjectsView  from '../views/ProjectsView.vue'
import DashboardView from '../views/DashboardView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import InviteView from '../views/InviteView.vue'
import AuthCallback from '../views/AuthCallback.vue'
import BudgetView from '../views/BudgetView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import ReportsView from '../views/ReportsView.vue'
import ReportDetailView from '../views/ReportDetailView.vue'
import ChatView from '../views/ChatView.vue'
import TeamsView from '../views/TeamsView.vue'
import AgentView from '../views/AgentView.vue'
import IntegrationsView from '../views/IntegrationsView.vue'
import AdminLayout from '../views/admin/AdminLayout.vue'
import AdminDashboardView from '../views/admin/AdminDashboardView.vue'
import AdminCompaniesView from '../views/admin/AdminCompaniesView.vue'
import AdminUsersView from '../views/admin/AdminUsersView.vue'

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
      component: LoginView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },
    {
      // Receives ?token=&onboarding=&error= from the backend Google OAuth callback
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallback,
    },
    {
      // Shown when user is authenticated but belongs to no empresa yet
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView,
      meta: { requiresAuth: true },
    },
    {
      path: '/invite/:token',
      name: 'invite',
      component: InviteView,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView,
      meta: { requiresAuth: true, requiresEmpresa: true, requiresProjectsAccess: true },
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectDetailView,
      meta: { requiresAuth: true, requiresEmpresa: true, requiresProjectsAccess: true },
    },
    {
      path: '/teams',
      name: 'teams',
      component: TeamsView,
      meta: { requiresAuth: true, requiresEmpresa: true, requiresTeamManagement: true },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: InventoryPage,
      meta: { requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/inventory/:id',
      name: 'inventory-detail',
      component: ProductDetailView,
      meta: { requiresAuth: true, requiresEmpresa: true, requiresInventoryAccess: true },
    },
    {
      path: '/reports',
      name: 'reports',
      component: ReportsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/reports/:id',
      name: 'report-detail',
      component: ReportDetailView,
      meta: { requiresAuth: true }
    },
    {
      path: '/budget',
      name: 'budget',
      component: BudgetView,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatView,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/agent',
      name: 'agent',
      component: AgentView,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/integrations',
      name: 'integrations',
      component: IntegrationsView,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresSuperUser: true },
      children: [
        { path: '',        name: 'admin-dashboard', component: AdminDashboardView },
        { path: 'companies', name: 'admin-companies', component: AdminCompaniesView },
        { path: 'users',     name: 'admin-users',     component: AdminUsersView },
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
