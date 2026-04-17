<template>
  <div class="auth-callback">
    <span class="auth-callback__spinner" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { finalizeAuthenticatedSession, getDefaultAuthenticatedRoute } from '@/utils/authFlow'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

const ERROR_MESSAGES = {
  google_cancelado:    'You cancelled the Google sign-in.',
  cuenta_desactivada:  'Your account is disabled. Contact the administrator.',
  rol_no_encontrado:   'Could not assign a role. Contact the administrator.',
  google_error:        'An error occurred with Google. Please try again.',
}

onMounted(async () => {
  const { token, error, joinedEmpresaId, inviteToken, inviteError } = route.query

  if (error) {
    const msg = ERROR_MESSAGES[error] || 'Error signing in with Google.'
    router.replace({ name: 'login', query: { error: msg } })
    return
  }

  if (!token) {
    router.replace({ name: 'login' })
    return
  }

  await finalizeAuthenticatedSession({
    authStore,
    token,
    joinedEmpresaId: joinedEmpresaId ? Number(joinedEmpresaId) : null,
  })

  if (inviteToken && inviteError && !authStore.empresaActual) {
    router.replace({
      name: 'invite',
      params: { token: inviteToken },
      query: { error: inviteError },
    })
    return
  }

  router.replace(getDefaultAuthenticatedRoute(authStore))
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
