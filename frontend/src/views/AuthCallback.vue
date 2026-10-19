<template>
  <div class="auth-callback">
    <span class="auth-callback__spinner" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { finalizeAuthenticatedSession, getDefaultAuthenticatedRoute } from '@/utils/authFlow'

const { t }     = useI18n()
const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

/**
 * Código que devuelve el backend → clave del diccionario. El mensaje se
 * redactaba aquí en inglés y se pasaba hecho por la URL, así que la pantalla
 * de login —que sí está traducida— lo mostraba en inglés.
 */
const ERROR_KEYS = {
  google_cancelado:   'auth.login.errors.googleCancelled',
  cuenta_desactivada: 'auth.login.errors.accountDisabled',
  rol_no_encontrado:  'auth.login.errors.roleNotFound',
  google_error:       'auth.login.errors.googleError',
}

onMounted(async () => {
  const { token, error, joinedEmpresaId, inviteToken, inviteError } = route.query

  if (error) {
    const msg = t(ERROR_KEYS[error] || 'auth.login.errors.googleGeneric')
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
  background: var(--k-shade-1);
}

.auth-callback__spinner {
  display: inline-block;
  width: 36px;
  height: 36px;
  border: 3px solid rgba(var(--k-color-primary-rgb), 0.15);
  border-top-color: var(--k-color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
