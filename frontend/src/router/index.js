import { createRouter, createWebHistory } from 'vue-router'
import LoginView    from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import LandingPage  from '../views/LandingPage.vue'
import InventoryPage from '../views/InventoryPage.vue'
import ProjectsView from '../views/ProjectsView.vue'
import DashboardView from '../views/DashboardView.vue'
import AuthCallback from '../views/AuthCallback.vue'
import ReportsView from '../views/ReportsView.vue'
import ReportDetailView from '../views/ReportDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingPage
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: InventoryPage
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView,
      meta: { requiresAuth: true }
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
      // Receives ?token=&onboarding=&error= from the backend Google OAuth callback
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallback
    }
  ]
})

import { useAuthStore } from '../stores/auth'

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
