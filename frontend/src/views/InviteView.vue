<template>
  <div class="invite-page">
    <div class="invite-shell">
      <div class="invite-card">
        <img src="@/assets/img/kontrol.png" alt="Kontrol" class="invite-logo" />

        <p class="invite-eyebrow">Workspace Invitation</p>
        <h1 class="invite-title">{{ title }}</h1>
        <p class="invite-subtitle">{{ subtitle }}</p>

        <div v-if="loading" class="invite-state">Loading invitation...</div>

        <div v-else-if="inviteData" class="invite-body">
          <div class="invite-summary">
            <div class="summary-row">
              <span class="summary-label">Company</span>
              <span class="summary-value">{{ inviteData.empresa.nombre }}</span>
            </div>
            <div v-if="isProjectInvite" class="summary-row">
              <span class="summary-label">Project</span>
              <span class="summary-value">{{ inviteData.proyecto.nombre }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">{{ isProjectInvite ? 'Invited by' : 'Owner' }}</span>
              <span class="summary-value">{{ inviteData.empresa.owner_nombre || 'Owner' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Role on entry</span>
              <span class="summary-value">{{ inviteData.rol_asignado }}</span>
            </div>
            <div v-if="isProjectInvite" class="summary-row">
              <span class="summary-label">Project permissions</span>
              <span class="summary-value">
                {{ inviteData.permisos_proyecto?.length ? inviteData.permisos_proyecto.join(', ') : 'No explicit permissions' }}
              </span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Status</span>
              <span class="summary-pill" :class="{ inactive: !inviteData.invitation.activa }">
                {{ inviteData.invitation.activa ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <p v-if="feedbackMessage" class="invite-feedback">{{ feedbackMessage }}</p>

          <div class="invite-actions">
            <button
              v-if="authStore.isLoggedIn && inviteData.invitation.activa"
              class="primary-btn"
              :disabled="accepting"
              @click="acceptInvite"
            >
              {{ accepting ? 'Joining...' : isProjectInvite ? 'Join the project' : 'Join the company' }}
            </button>

            <template v-else-if="!authStore.isLoggedIn && inviteData.invitation.activa">
              <RouterLink class="primary-btn link-btn" :to="loginLink">
                I already have an account
              </RouterLink>
              <RouterLink class="secondary-btn link-btn" :to="registerLink">
                Create new account
              </RouterLink>
              <button class="ghost-btn" @click="continueWithGoogle">
                Continue with Google
              </button>
            </template>

            <RouterLink
              v-if="authStore.isLoggedIn && authStore.empresaActual"
              class="secondary-btn link-btn"
              :to="{ name: 'dashboard' }"
            >
              Go to dashboard
            </RouterLink>

            <RouterLink
              v-if="authStore.isLoggedIn && !authStore.empresaActual && !inviteData.invitation.activa"
              class="secondary-btn link-btn"
              :to="{ name: 'onboarding' }"
            >
              Create my workspace
            </RouterLink>
          </div>
        </div>

        <div v-else class="invite-state">{{ feedbackMessage || 'Invitation not found.' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loginWithGoogle } from '@/services/auth'
import { getDefaultAuthenticatedRoute } from '@/utils/authFlow'
import { getInviteErrorMessage } from '@/utils/invitation'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const accepting = ref(false)
const inviteData = ref(null)
const feedbackMessage = ref('')

const token = computed(() => String(route.params.token || ''))
const isProjectInvite = computed(() => inviteData.value?.scope === 'project')

const title = computed(() => {
  if (loading.value) return 'Checking your invitation'
  if (!inviteData.value?.invitation?.activa) return 'This link is no longer available'
  if (authStore.isLoggedIn) {
    return isProjectInvite.value
      ? `Join ${inviteData.value.proyecto.nombre}`
      : `Join ${inviteData.value.empresa.nombre}`
  }
  return isProjectInvite.value
    ? `You've been invited to ${inviteData.value.proyecto.nombre}`
    : `You've been invited to ${inviteData.value.empresa.nombre}`
})

const subtitle = computed(() => {
  if (loading.value) return 'Validating the link shared by the owner.'
  if (!inviteData.value?.invitation?.activa) {
    return 'The owner deactivated this link or the invitation no longer exists.'
  }
  if (isProjectInvite.value) {
    return authStore.isLoggedIn
      ? 'You can sign in with your current session and be linked directly to this project.'
      : 'You can sign in or create an account to join the company and be assigned directly to this project.'
  }
  return authStore.isLoggedIn
    ? 'You can sign in with your current session and be added as a collaborator.'
    : 'You can sign in with an existing account or create a new one to be added as a collaborator.'
})

const loginLink = computed(() => ({ name: 'login', query: { invite: token.value } }))
const registerLink = computed(() => ({ name: 'register', query: { invite: token.value } }))

async function fetchInvitation(url) {
  const res = await fetch(url)
  const payload = await res.json()
  return { res, payload }
}

async function loadInvitation() {
  loading.value = true
  feedbackMessage.value = getInviteErrorMessage(route.query.error)

  try {
    const candidates = [
      `/api/empresas/invitaciones/${encodeURIComponent(token.value)}`,
      `/api/projects/invitaciones/${encodeURIComponent(token.value)}`,
    ]

    let loadedInvitation = null
    let loadedError = ''

    for (const candidate of candidates) {
      const { res, payload } = await fetchInvitation(candidate)

      if (payload.data) {
        loadedInvitation = payload.data
        loadedError = !res.ok
          ? payload.message || getInviteErrorMessage(payload.code)
          : ''
        break
      }

      if (!loadedError) {
        loadedError = payload.message || getInviteErrorMessage(payload.code)
      }
    }

    if (!loadedInvitation) {
      inviteData.value = null
      feedbackMessage.value = feedbackMessage.value || loadedError || 'Invitation not found.'
      return
    }

    inviteData.value = loadedInvitation
    if (!feedbackMessage.value && loadedError) {
      feedbackMessage.value = loadedError
    }
  } catch {
    inviteData.value = null
    feedbackMessage.value = 'Could not retrieve the invitation. Please try again.'
  } finally {
    loading.value = false
  }
}

async function acceptInvite() {
  accepting.value = true
  feedbackMessage.value = ''

  try {
    const acceptPath = isProjectInvite.value
      ? `/api/projects/invitaciones/${encodeURIComponent(token.value)}/accept`
      : `/api/empresas/invitaciones/${encodeURIComponent(token.value)}/accept`

    const res = await fetch(acceptPath, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    const payload = await res.json()
    if (!res.ok) {
      feedbackMessage.value = payload.message || getInviteErrorMessage(payload.code)
      await loadInvitation()
      return
    }

    await authStore.loadEmpresas()
    authStore.selectEmpresaById(payload.empresa.id_empresa)
    await authStore.loadAccessContext()
    feedbackMessage.value = payload.message

    if (payload.proyecto?.id_proyecto && authStore.canViewProjects) {
      router.push({ name: 'project-detail', params: { id: payload.proyecto.id_proyecto } })
      return
    }

    router.push(getDefaultAuthenticatedRoute(authStore))
  } catch {
    feedbackMessage.value = 'Could not accept the invitation. Please try again.'
  } finally {
    accepting.value = false
  }
}

function continueWithGoogle() {
  loginWithGoogle(token.value)
}

onMounted(loadInvitation)
watch(() => route.params.token, loadInvitation)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap');

.invite-page {
  min-height: 100vh;
  padding: 32px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(201, 169, 98, 0.18), transparent 28%),
    linear-gradient(180deg, #070707 0%, #111 100%);
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
}

.invite-shell {
  width: 100%;
  max-width: 760px;
}

.invite-card {
  background: rgba(12, 12, 12, 0.92);
  border: 1px solid rgba(201, 169, 98, 0.18);
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.45);
  padding: 44px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.invite-logo {
  width: 44px;
  height: 44px;
}

.invite-eyebrow {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c9a962;
}

.invite-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.invite-subtitle {
  color: #b2aca2;
  line-height: 1.7;
  max-width: 640px;
}

.invite-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.invite-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.summary-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #7f7a72;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
}

.summary-pill {
  display: inline-flex;
  width: fit-content;
  padding: 6px 10px;
  border: 1px solid rgba(52, 211, 153, 0.24);
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
}

.summary-pill.inactive {
  border-color: rgba(251, 113, 133, 0.24);
  background: rgba(251, 113, 133, 0.1);
  color: #fb7185;
}

.invite-feedback,
.invite-state {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 18px;
  color: #ded7cc;
  line-height: 1.6;
}

.invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.primary-btn,
.secondary-btn,
.ghost-btn {
  appearance: none;
  border: none;
  text-decoration: none;
  cursor: pointer;
  padding: 14px 18px;
  font: inherit;
  transition: transform 0.16s ease, opacity 0.16s ease, border-color 0.16s ease;
}

.primary-btn {
  background: #c9a962;
  color: #101010;
  font-weight: 700;
}

.secondary-btn {
  background: transparent;
  color: #faf8f5;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.03);
  color: #faf8f5;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.primary-btn:hover,
.secondary-btn:hover,
.ghost-btn:hover {
  transform: translateY(-1px);
}

.primary-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.link-btn {
  display: inline-flex;
  align-items: center;
}

@media (max-width: 720px) {
  .invite-card {
    padding: 28px 20px;
  }

  .invite-title {
    font-size: 34px;
  }

  .invite-summary {
    grid-template-columns: 1fr;
  }

  .invite-actions {
    flex-direction: column;
  }
}
</style>
