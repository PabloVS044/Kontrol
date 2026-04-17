import { createRouter, createWebHistory } from 'vue-router'
import LoginView     from '../views/LoginView.vue'
import RegisterView  from '../views/RegisterView.vue'
import LandingPage   from '../views/LandingPage.vue'
import InventoryPage from '../views/InventoryPage.vue'
import ProjectsView  from '../views/ProjectsView.vue'
import DashboardView from '../views/DashboardView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import AuthCallback from '../views/AuthCallback.vue'
import BudgetView from '../views/BudgetView.vue'
import ReportsView from '../views/ReportsView.vue'
import ReportDetailView from '../views/ReportDetailView.vue'

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
      // Receives ?token=&error= from the backend Google OAuth callback
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
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: InventoryPage,
      meta: { requiresAuth: true, requiresEmpresa: true },
    },
  ],
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
      // Receives ?token=&onboarding=&error= from the backend Google OAuth callback
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallback
    },
    {
      path: '/budget',
      name: 'budget',
      component: BudgetView
    }
  ]
})

import { useAuthStore } from '../stores/auth'

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Not authenticated → redirect to login
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'login' })
    return
  }

  // Authenticated but heading to a route that needs an empresa context
  if (authStore.isLoggedIn && to.meta.requiresEmpresa) {
    // Reload empresas if the list is empty (e.g. after a hard refresh with no localStorage)
    if (!authStore.empresas.length && !authStore.empresaActual) {
      await authStore.loadEmpresas()
    }

    if (!authStore.empresaActual) {
      next({ name: 'onboarding' })
      return
    }
  }

  next()
})

export default router
