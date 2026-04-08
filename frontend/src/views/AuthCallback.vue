<template>
  <div class="auth-callback">
    <span class="auth-callback__spinner" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

const ERROR_MESSAGES = {
  google_cancelado:    'Cancelaste el inicio de sesión con Google.',
  cuenta_desactivada:  'Tu cuenta está desactivada. Contacta al administrador.',
  rol_no_encontrado:   'No se pudo asignar un rol. Contacta al administrador.',
  google_error:        'Ocurrió un error con Google. Intenta de nuevo.',
}

onMounted(() => {
  const { token, onboarding, error } = route.query

  if (error) {
    const msg = ERROR_MESSAGES[error] || 'Error al iniciar sesión con Google.'
    router.replace({ name: 'login', query: { error: msg } })
    return
  }

  if (!token) {
    router.replace({ name: 'login' })
    return
  }

  authStore.setToken(token)

  // onboarding=true means the user just signed up via Google and has no empresa yet
  if (onboarding === 'true') {
    // TODO: redirect to onboarding flow once that view exists
    router.replace({ name: 'dashboard' })
  } else {
    router.replace({ name: 'dashboard' })
  }
})
</script>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0a0a0a;
}

.auth-callback__spinner {
  display: inline-block;
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
