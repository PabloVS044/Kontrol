<template>
  <div class="integrations-root">
    <AppNavbar />

    <div class="integrations-layout">

      <!-- Error de acceso -->
      <div v-if="!canManage" class="state-screen">
        <p class="state-title">{{ t('integrations.restricted.title') }}</p>
        <p class="state-msg">{{ t('integrations.restricted.msg') }}</p>
      </div>

      <!-- Error de carga -->
      <div v-else-if="fetchError" class="state-screen">
        <p class="state-title">{{ t('integrations.loadError') }}</p>
        <p class="state-msg">{{ fetchError }}</p>
        <Button :label="t('integrations.retry')" style="margin-top:16px" backColor="var(--Primary)" @click="loadIntegrations" />
      </div>

      <template v-else>
        <!-- Encabezado -->
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('integrations.title') }}</h1>
            <p class="page-subtitle">{{ t('integrations.subtitle') }}</p>
          </div>
        </div>

        <!-- Filtro de categorías -->
        <div class="filter-row">
          <button
            class="chip"
            :class="{ active: activeCategory === 'all' }"
            :aria-pressed="activeCategory === 'all'"
            @click="activeCategory = 'all'"
          >{{ t('integrations.allCategories') }}</button>
          <button
            v-for="cat in categories"
            :key="cat"
            class="chip"
            :class="{ active: activeCategory === cat }"
            :aria-pressed="activeCategory === cat"
            @click="activeCategory = cat"
          >{{ categoryLabel(cat) }}</button>
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="integrations-grid">
          <div v-for="n in 4" :key="n" class="integration-card skeleton">
            <div class="skeleton-icon"></div>
            <div class="skeleton-body">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line mid"></div>
            </div>
          </div>
        </div>

        <!-- Grid de integraciones -->
        <div v-else class="integrations-grid">
          <div
            v-for="integration in filteredIntegrations"
            :key="integration.slug"
            class="integration-card"
            :class="{ 'card-active': integration.status === 'active' }"
          >
            <!-- Cabecera de la card -->
            <div class="card-top">
              <div
                class="card-icon"
                :style="integrationIcon(integration.slug)
                  ? { backgroundImage: `url('${integrationIcon(integration.slug)}')` }
                  : {}"
              >
                <DefaultIcon v-if="!integrationIcon(integration.slug)" />
              </div>
              <div class="card-info">
                <span class="card-name">{{ integration.nombre }}</span>
                <span class="cat-badge">{{ categoryLabel(integration.categoria) }}</span>
              </div>
            </div>

            <!-- Descripción -->
            <p class="card-description">{{ integration.descripcion }}</p>

            <!-- Estado de la conexión: texto informativo, no clicable -->
            <p class="card-status">
              <span class="status-dot" :class="`status-${statusKey(integration)}`" aria-hidden="true"></span>
              <span class="status-text" :class="`status-${statusKey(integration)}`">{{ statusLabel(integration) }}</span>
              <template v-if="integration.updated_at">
                <span class="status-sep" aria-hidden="true">·</span>
                <span class="updated-at">{{ t('integrations.updatedAt', { date: fmtDate(integration.updated_at) }) }}</span>
              </template>
            </p>

            <!-- Interruptor rotulado: es el único control para pausar/reanudar -->
            <div v-if="integration.is_configured" class="card-switch-row">
              <div class="switch-text">
                <span class="switch-title">{{ t('integrations.switch.title') }}</span>
                <span class="switch-hint">
                  {{ integration.status === 'active'
                    ? t('integrations.switch.onHint')
                    : t('integrations.switch.offHint') }}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                class="toggle-btn"
                :class="{ 'toggle-on': integration.status === 'active' }"
                :aria-checked="integration.status === 'active'"
                :aria-label="integration.status === 'active'
                  ? t('integrations.switch.pauseLabel', { name: integration.nombre })
                  : t('integrations.switch.resumeLabel', { name: integration.nombre })"
                :disabled="togglingSlug === integration.slug"
                :title="integration.status === 'active'
                  ? t('integrations.switch.pauseTitle')
                  : t('integrations.switch.resumeTitle')"
                @click="handleToggle(integration)"
              >
                <span class="toggle-label">{{ integration.status === 'active' ? t('integrations.switch.on') : t('integrations.switch.off') }}</span>
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
              </button>
            </div>

            <!-- Acciones primarias -->
            <div class="card-actions" :class="{ 'single': !integration.is_configured }">
              <button
                class="btn-configure"
                @click="openConfigure(integration)"
              >
                {{ integration.is_configured ? t('integrations.actions.edit') : t('integrations.actions.configure') }}
              </button>
              <button
                v-if="integration.is_configured"
                class="btn-test"
                :disabled="testingSlug === integration.slug"
                @click="handleTest(integration)"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M7.5 1.5 3 7.5h3.5l-1 4 4.5-6H6.5l1-4Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                </svg>
                {{ testingSlug === integration.slug ? t('integrations.actions.testing') : t('integrations.actions.test') }}
              </button>
            </div>

            <!-- Acciones secundarias -->
            <div class="card-secondary-actions">
              <button class="btn-how" @click="openTutorial(integration)">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M6.5 5.5v4M6.5 3.8v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
                {{ t('integrations.actions.how') }}
              </button>

              <button
                v-if="integration.is_configured"
                class="btn-disconnect"
                @click="confirmingDisconnect = integration"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 3h8M4.5 3V2h3v1M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                </svg>
                {{ t('integrations.actions.delete') }}
              </button>
            </div>

            <!-- Feedback inline -->
            <p v-if="inlineFeedback[integration.slug]" class="inline-feedback" :class="inlineFeedback[integration.slug].type">
              {{ inlineFeedback[integration.slug].msg }}
            </p>
          </div>
        </div>
      </template>

    </div>

    <!-- Animación 3D conexión exitosa (solo en nuevas integraciones) -->
    <ConnectionSuccessAnimation
      v-if="showSuccessAnimation"
      @done="showSuccessAnimation = false"
    />

    <!-- Confirmación de eliminación -->
    <BaseModal
      :modelValue="!!confirmingDisconnect"
      :title="t('integrations.confirm.title', { name: confirmingDisconnect?.nombre ?? '' })"
      max-width="460px"
      @update:modelValue="(v) => { if (!v && !disconnectingSlug) confirmingDisconnect = null }"
    >
      <div class="confirm-body" v-if="confirmingDisconnect">
        <p class="confirm-text">
          {{ t('integrations.confirm.text', { name: confirmingDisconnect.nombre }) }}
        </p>
        <p class="confirm-hint">
          <i18n-t keypath="integrations.confirm.hint" scope="global">
            <template #switch><strong>{{ t('integrations.confirm.switchName') }}</strong></template>
          </i18n-t>
        </p>
        <div class="confirm-footer">
          <button
            class="btn-cancel-disconnect"
            :disabled="!!disconnectingSlug"
            @click="confirmingDisconnect = null"
          >{{ t('integrations.confirm.cancel') }}</button>
          <button
            class="btn-confirm-disconnect"
            :disabled="!!disconnectingSlug"
            @click="handleDisconnect(confirmingDisconnect)"
          >{{ disconnectingSlug ? t('integrations.confirm.deleting') : t('integrations.confirm.confirm') }}</button>
        </div>
      </div>
    </BaseModal>

    <!-- Modal tutorial -->
    <BaseModal
      v-model="showTutorial"
      :title="t('integrations.tutorial.title', { name: tutorialIntegration?.nombre ?? '' })"
      max-width="500px"
    >
      <div class="tutorial-body" v-if="tutorialIntegration">
        <p class="tutorial-intro">{{ t('integrations.tutorial.intro', { name: tutorialIntegration.nombre }) }}</p>
        <ol class="tutorial-steps">
          <li v-for="(step, i) in tutorialSteps" :key="i" class="tutorial-step">
            <span class="step-num">{{ i + 1 }}</span>
            <span class="step-text">{{ step }}</span>
          </li>
        </ol>
        <div class="tutorial-footer">
          <button class="btn-configure" style="width:100%" @click="showTutorial = false; openConfigure(tutorialIntegration)">
            {{ t('integrations.tutorial.goConfigure') }}
          </button>
        </div>
      </div>
    </BaseModal>

    <!-- Modal de configuración -->
    <BaseModal v-model="showModal" :title="modalIntegration?.nombre ?? ''" max-width="520px">
      <template v-if="modalIntegration">
        <form class="modal-form" @submit.prevent="handleSave">
          <div class="modal-section-label">{{ t('integrations.modal.credentials') }}</div>
          <div
            v-for="field in modalIntegration.campos_credenciales"
            :key="field.key"
            class="form-group"
          >
            <label class="form-label">
              {{ field.label }}
              <span v-if="field.required" class="required-dot">*</span>
            </label>
            <input
              v-model="formCredentials[field.key]"
              class="form-input"
              :type="field.type === 'password' ? (showPasswords[field.key] ? 'text' : 'password') : field.type"
              :placeholder="field.required ? t('integrations.modal.required') : t('integrations.modal.optional')"
              autocomplete="off"
            />
            <button
              v-if="field.type === 'password'"
              type="button"
              class="toggle-pass"
              @click="showPasswords[field.key] = !showPasswords[field.key]"
            >
              {{ showPasswords[field.key] ? t('integrations.modal.hide') : t('integrations.modal.show') }}
            </button>
          </div>

          <p v-if="modalError" class="modal-error">{{ modalError }}</p>
          <p v-if="modalSuccess" class="modal-success">{{ modalSuccess }}</p>

          <div class="modal-footer">
            <Button
              :label="modalLoading ? t('integrations.modal.saving') : t('integrations.modal.save')"
              type="submit"
              :disabled="modalLoading"
              backColor="var(--Primary)"
            />
          </div>
        </form>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../components/AppNavbar.vue'
import BaseModal from '../components/UI/Modal/BaseModal.vue'
import Button from '../components/UI/Button/Button.vue'
import ConnectionSuccessAnimation from '../components/UI/ConnectionSuccessAnimation/ConnectionSuccessAnimation.vue'
import { useAuthStore } from '../stores/auth'
import {
  listIntegrations,
  getIntegrationConfig,
  saveIntegrationConfig,
  toggleIntegration,
  testIntegration,
  deleteIntegrationConfig,
} from '../services/integrations.js'
import './IntegrationView.css'

const { t, tm, rt, locale } = useI18n()
const authStore = useAuthStore()

const integrations = ref([])
const loading = ref(false)
const fetchError = ref(null)

const activeCategory = ref('all')
const togglingSlug = ref(null)
const testingSlug = ref(null)
const inlineFeedback = ref({})

const showSuccessAnimation = ref(false)

const showTutorial = ref(false)
const tutorialIntegration = ref(null)

const confirmingDisconnect = ref(null)
const disconnectingSlug = ref(null)

const showModal = ref(false)
const modalIntegration = ref(null)
const formCredentials = ref({})
const showPasswords = ref({})
const modalLoading = ref(false)
const modalError = ref(null)
const modalSuccess = ref(null)

const canManage = computed(() => {
  const rol = authStore.empresaActual?.rol
  return rol === 'owner' || rol === 'admin'
})

const categories = computed(() => {
  const cats = new Set(integrations.value.map((i) => i.categoria))
  return [...cats]
})

const filteredIntegrations = computed(() => {
  if (activeCategory.value === 'all') return integrations.value
  return integrations.value.filter((i) => i.categoria === activeCategory.value)
})

/** La categoría llega como slug del backend; la etiqueta es de interfaz. */
function categoryLabel(cat) {
  const key = `integrations.categories.${cat}`
  const label = t(key)
  return label === key ? cat : label
}

// Describe la conexión; el encendido/pausa lo comunica solo el interruptor.
function statusLabel(integration) {
  if (!integration.is_configured) return t('integrations.status.notConfigured')
  if (integration.status === 'error') return t('integrations.status.error')
  return t('integrations.status.configured')
}

function statusKey(integration) {
  if (!integration.is_configured) return 'none'
  return integration.status === 'error' ? 'error' : 'ok'
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return ''
  return dt.toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
}

function authArgs() {
  return [authStore.token, authStore.idEmpresaActual]
}

async function loadIntegrations() {
  loading.value = true
  fetchError.value = null
  try {
    integrations.value = await listIntegrations(...authArgs())
  } catch (err) {
    fetchError.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleToggle(integration) {
  const nextStatus = integration.status === 'active' ? 'inactive' : 'active'

  if (nextStatus === 'active' && integration.status === 'error') {
    setFeedback(integration.slug, 'error', t('integrations.feedback.lastTestFailed'))
    return
  }

  togglingSlug.value = integration.slug
  clearFeedback(integration.slug)
  try {
    const updated = await toggleIntegration(...authArgs(), integration.slug, nextStatus)
    const idx = integrations.value.findIndex((i) => i.slug === integration.slug)
    if (idx !== -1) integrations.value[idx].status = updated.status
  } catch (err) {
    setFeedback(integration.slug, 'error', err.message)
  } finally {
    togglingSlug.value = null
  }
}

async function handleTest(integration) {
  testingSlug.value = integration.slug
  clearFeedback(integration.slug)
  const wasActive = integration.status === 'active'
  try {
    await testIntegration(...authArgs(), integration.slug)
    const idx = integrations.value.findIndex((i) => i.slug === integration.slug)
    if (idx !== -1) integrations.value[idx].status = 'active'
    if (!wasActive) {
      showSuccessAnimation.value = true
    } else {
      setFeedback(integration.slug, 'success', t('integrations.feedback.testOk'))
    }
  } catch (err) {
    setFeedback(integration.slug, 'error', err.message)
    const idx = integrations.value.findIndex((i) => i.slug === integration.slug)
    if (idx !== -1) integrations.value[idx].status = 'error'
  } finally {
    testingSlug.value = null
  }
}

async function openConfigure(integration) {
  modalIntegration.value = integration
  modalError.value = null
  modalSuccess.value = null
  formCredentials.value = {}
  showPasswords.value = {}

  if (integration.is_configured) {
    try {
      const config = await getIntegrationConfig(...authArgs(), integration.slug)
      formCredentials.value = { ...config.credentials }
    } catch {
      // start with empty fields if fetch fails
    }
  }

  showModal.value = true
}

async function handleSave() {
  modalLoading.value = true
  modalError.value = null
  modalSuccess.value = null
  try {
    await saveIntegrationConfig(...authArgs(), modalIntegration.value.slug, {
      credentials: formCredentials.value,
      config: {},
    })
    modalSuccess.value = t('integrations.feedback.saved')
    const idx = integrations.value.findIndex((i) => i.slug === modalIntegration.value.slug)
    if (idx !== -1) {
      integrations.value[idx].is_configured = true
      integrations.value[idx].status = 'inactive'
      integrations.value[idx].updated_at = new Date().toISOString()
    }
    setTimeout(() => { showModal.value = false }, 1200)
  } catch (err) {
    modalError.value = err.message
  } finally {
    modalLoading.value = false
  }
}

function setFeedback(slug, type, msg) {
  inlineFeedback.value[slug] = { type, msg }
  setTimeout(() => clearFeedback(slug), 5000)
}

function clearFeedback(slug) {
  delete inlineFeedback.value[slug]
}

// ── Tutorial ───────────────────────────────────────────────────────────────────

/**
 * Los pasos viven en el diccionario (`integrations.tutorials.<slug>`) como
 * arreglo, así que `tm` los devuelve en el idioma activo. Una integración sin
 * guía propia cae en los tres pasos genéricos.
 */
const tutorialSteps = computed(() => {
  const integration = tutorialIntegration.value
  if (!integration) return []

  const steps = tm(`integrations.tutorials.${integration.slug}`)
  if (Array.isArray(steps) && steps.length) return steps.map((step) => rt(step))

  return tm('integrations.tutorials.fallback')
    .map((step) => rt(step).replace('{name}', integration.nombre))
})

function openTutorial(integration) {
  tutorialIntegration.value = integration
  showTutorial.value = true
}

async function handleDisconnect(integration) {
  disconnectingSlug.value = integration.slug
  try {
    await deleteIntegrationConfig(...authArgs(), integration.slug)
    const idx = integrations.value.findIndex((i) => i.slug === integration.slug)
    if (idx !== -1) {
      integrations.value[idx].is_configured = false
      integrations.value[idx].status = 'inactive'
      integrations.value[idx].updated_at = new Date().toISOString()
    }
    setFeedback(integration.slug, 'success', t('integrations.feedback.deleted'))
  } catch (err) {
    setFeedback(integration.slug, 'error', err.message)
  } finally {
    disconnectingSlug.value = null
    // Cierra el modal también en error para que el mensaje de la tarjeta quede visible
    confirmingDisconnect.value = null
  }
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const DefaultIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="4" y="4" width="20" height="20" rx="3" stroke="#555" stroke-width="1.6"/>
    <path d="M9 14h10M14 9v10" stroke="#555" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,
}

const ICON_PATHS = {
  'slack':           '/slack.png',
  'sendgrid':        '/send.png',
  'microsoft-teams': '/teams.png',
  'telegram':        '/telegram.png',
  'twilio-sms':      '/twilio.png',
  'webhook':         '/webhook.png',
}

function integrationIcon(slug) {
  return ICON_PATHS[slug] ?? null
}

onMounted(() => {
  if (canManage.value) loadIntegrations()
})
</script>