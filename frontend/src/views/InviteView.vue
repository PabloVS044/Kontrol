<template>
  <div class="invite-page">
    <div class="invite-shell">
      <div class="invite-card">
        <img src="@/assets/img/kontrol.png" alt="Kontrol" class="invite-logo" />

        <p class="invite-eyebrow">{{ t('invite.eyebrow') }}</p>
        <h1 class="invite-title">{{ title }}</h1>
        <p class="invite-subtitle">{{ subtitle }}</p>

        <div v-if="loading" class="invite-state">{{ t('invite.loading') }}</div>

        <div v-else-if="inviteData" class="invite-body">
          <div class="invite-summary">
            <div class="summary-row">
              <span class="summary-label">{{ t('invite.summary.company') }}</span>
              <span class="summary-value">{{ inviteData.empresa.nombre }}</span>
            </div>
            <div v-if="isProjectInvite" class="summary-row">
              <span class="summary-label">{{ t('invite.summary.project') }}</span>
              <span class="summary-value">{{ inviteData.proyecto.nombre }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">{{ isProjectInvite ? t('invite.summary.invitedBy') : t('invite.summary.owner') }}</span>
              <span class="summary-value">{{ inviteData.empresa.owner_nombre || t('invite.summary.owner') }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">{{ t('invite.summary.role') }}</span>
              <span class="summary-value">{{ roleLabel(inviteData.rol_asignado) }}</span>
            </div>
            <div v-if="isProjectInvite" class="summary-row">
              <span class="summary-label">{{ t('invite.summary.permissions') }}</span>
              <span class="summary-value">
                {{ inviteData.permisos_proyecto?.length
                  ? permissionList(inviteData.permisos_proyecto)
                  : t('invite.summary.noPermissions') }}
              </span>
            </div>
            <div class="summary-row">
              <span class="summary-label">{{ t('invite.summary.status') }}</span>
              <Pill
                class="summary-pill"
                :label="inviteData.invitation.activa ? t('invite.summary.active') : t('invite.summary.inactive')"
                :btn-color="inviteData.invitation.activa ? 'var(--k-alert-ok-bg)' : 'var(--k-alert-critical-bg)'"
                :circle-color="inviteData.invitation.activa ? 'var(--k-alert-ok-text)' : 'var(--k-alert-critical-text)'"
                :text-color="inviteData.invitation.activa ? 'var(--k-alert-ok-text)' : 'var(--k-alert-critical-text)'"
              />
            </div>
          </div>

          <p v-if="feedbackMessage" class="invite-feedback">{{ feedbackMessage }}</p>

          <div class="invite-actions">
            <Button
              v-if="authStore.isLoggedIn && inviteData.invitation.activa"
              class="primary-btn"
              :disabled="accepting"
              back-color="var(--k-color-primary)"
              hover-back="var(--k-color-primary-2)"
              @click="acceptInvite"
            >
              {{ accepting
                ? t('invite.actions.joining')
                : isProjectInvite ? t('invite.actions.joinProject') : t('invite.actions.joinCompany') }}
            </Button>

            <template v-else-if="!authStore.isLoggedIn && inviteData.invitation.activa">
              <RouterLink class="primary-btn link-btn" :to="loginLink">
                {{ t('invite.actions.haveAccount') }}
              </RouterLink>
              <RouterLink class="secondary-btn link-btn" :to="registerLink">
                {{ t('invite.actions.createAccount') }}
              </RouterLink>
              <Button
                class="ghost-btn"
                :label="t('invite.actions.withGoogle')"
                back-color="var(--k-shade-3)"
                hover-back="var(--k-shade-4)"
                @click="continueWithGoogle"
              />
            </template>

            <RouterLink
              v-if="authStore.isLoggedIn && authStore.empresaActual"
              class="secondary-btn link-btn"
              :to="{ name: 'dashboard' }"
            >
              {{ t('invite.actions.goToDashboard') }}
            </RouterLink>

            <RouterLink
              v-if="authStore.isLoggedIn && !authStore.empresaActual && !inviteData.invitation.activa"
              class="secondary-btn link-btn"
              :to="{ name: 'onboarding' }"
            >
              {{ t('invite.actions.createWorkspace') }}
            </RouterLink>
          </div>
        </div>

        <div v-else class="invite-state">{{ feedbackMessage || t('invite.notFound') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/UI/Button/Button.vue'
import Pill from '@/components/UI/Pill/Pill.vue'
import { loginWithGoogle } from '@/services/auth'
import { getDefaultAuthenticatedRoute } from '@/utils/authFlow'
import { getInviteErrorMessage } from '@/utils/invitation'
import { projectPermissionListLabel } from '@/utils/projectAccessLabels'
import { translateRole } from '@/utils/roles.js'

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// El rol y los permisos llegan en inglés desde la base de datos: son valores
// del esquema. Lo que se pinta sí se traduce.
const roleLabel = (rol) => translateRole(rol, { t, te })
const permissionList = (nombres) => projectPermissionListLabel(nombres, { t, te })
const inviteError = (code) => getInviteErrorMessage(code, { t })

const loading = ref(true)
const accepting = ref(false)
const inviteData = ref(null)
const feedbackMessage = ref('')

const token = computed(() => String(route.params.token || ''))
const isProjectInvite = computed(() => inviteData.value?.scope === 'project')

/** Nombre de lo que se está invitando a unirse: el proyecto o la empresa. */
const inviteTarget = computed(() => (isProjectInvite.value
  ? inviteData.value?.proyecto?.nombre
  : inviteData.value?.empresa?.nombre) ?? '')

const title = computed(() => {
  if (loading.value) return t('invite.title.checking')
  if (!inviteData.value?.invitation?.activa) return t('invite.title.unavailable')
  return authStore.isLoggedIn
    ? t('invite.title.join', { name: inviteTarget.value })
    : t('invite.title.invited', { name: inviteTarget.value })
})

const subtitle = computed(() => {
  if (loading.value) return t('invite.subtitle.checking')
  if (!inviteData.value?.invitation?.activa) return t('invite.subtitle.unavailable')
  if (isProjectInvite.value) {
    return authStore.isLoggedIn
      ? t('invite.subtitle.projectLoggedIn')
      : t('invite.subtitle.projectGuest')
  }
  return authStore.isLoggedIn
    ? t('invite.subtitle.companyLoggedIn')
    : t('invite.subtitle.companyGuest')
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
  feedbackMessage.value = inviteError(route.query.error)

  try {
    const candidates = [
      `/api/companies/invitations/${encodeURIComponent(token.value)}`,
      `/api/projects/invitations/${encodeURIComponent(token.value)}`,
    ]

    let loadedInvitation = null
    let loadedError = ''

    for (const candidate of candidates) {
      const { res, payload } = await fetchInvitation(candidate)

      if (payload.data) {
        loadedInvitation = payload.data
        loadedError = !res.ok
          ? payload.message || inviteError(payload.code)
          : ''
        break
      }

      if (!loadedError) {
        loadedError = payload.message || inviteError(payload.code)
      }
    }

    if (!loadedInvitation) {
      inviteData.value = null
      feedbackMessage.value = feedbackMessage.value || loadedError || t('invite.notFound')
      return
    }

    inviteData.value = loadedInvitation
    if (!feedbackMessage.value && loadedError) {
      feedbackMessage.value = loadedError
    }
  } catch {
    inviteData.value = null
    feedbackMessage.value = t('invite.errors.retrieve')
  } finally {
    loading.value = false
  }
}

async function acceptInvite() {
  accepting.value = true
  feedbackMessage.value = ''

  try {
    const acceptPath = isProjectInvite.value
      ? `/api/projects/invitations/${encodeURIComponent(token.value)}/accept`
      : `/api/companies/invitations/${encodeURIComponent(token.value)}/accept`

    const res = await fetch(acceptPath, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    const payload = await res.json()
    if (!res.ok) {
      feedbackMessage.value = payload.message || inviteError(payload.code)
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
    radial-gradient(circle at top, rgba(var(--k-color-primary-rgb), 0.18), transparent 28%),
    linear-gradient(180deg, var(--k-shade-1) 0%, var(--k-shade-3) 100%);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
}

.invite-shell {
  width: 100%;
  max-width: 760px;
}

.invite-card {
  background: var(--k-shade-1);
  border: 1px solid rgba(var(--k-color-primary-rgb), 0.18);
  box-shadow: var(--k-shadow-card);
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
  font-size: var(--k-font-size-caption-lg);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--k-color-primary);
}

.invite-title {
  font-family: var(--k-font-display);
  font-size: 48px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.invite-subtitle {
  color: var(--k-text-muted);
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
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-label {
  font-size: var(--k-font-size-caption);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--k-text-muted);
}

.summary-value {
  font-size: 18px;
  font-weight: var(--k-font-weight-semibold);
}

.summary-pill {
  width: fit-content;
}

.invite-feedback,
.invite-state {
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
  padding: 16px 18px;
  color: var(--k-text-soft);
  line-height: 1.6;
}

.invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* `Button` recibe el color por props; los `RouterLink` (destino con query)
   se quedan como enlaces y replican su aspecto con los mismos tokens. */
.primary-btn,
.secondary-btn,
.ghost-btn {
  appearance: none;
  border: none;
  border-radius: 0;
  text-decoration: none;
  cursor: pointer;
  padding: 14px 18px;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  transition: var(--k-transition-ui);
}

.primary-btn {
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
  font-weight: var(--k-font-weight-bold);
}

.secondary-btn,
.ghost-btn {
  background: var(--k-shade-3);
  color: var(--k-color-text);
  border: var(--k-border-width) solid var(--k-shade-6);
  font-weight: var(--k-font-weight-semibold);
}

.btn.primary-btn,
.btn.ghost-btn {
  border-radius: 0;
  padding: 14px 18px;
  font-size: var(--k-font-size-body-main);
}

.btn.ghost-btn {
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
}

.link-btn:hover {
  filter: brightness(var(--k-state-hover-brightness));
  transform: translateY(-1px);
}

.link-btn:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
}

.link-btn {
  display: inline-flex;
  align-items: center;
  min-height: var(--k-target-min-size);
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
