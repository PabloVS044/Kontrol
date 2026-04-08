import { createRouter, createWebHistory } from 'vue-router'
import LoginView    from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import LandingPage  from '../views/LandingPage.vue'
import HomeView     from '../views/HomeView.vue'
import InventoryPage from '../views/InventoryPage.vue'
import AuthCallback from '../views/AuthCallback.vue'

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
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: InventoryPage,
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
