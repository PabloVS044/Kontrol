<template>
  <div class="integrations-root">
    <AppNavbar />

    <div class="integrations-layout">

      <!-- Error de acceso -->
      <div v-if="!canManage" class="state-screen">
        <p class="state-title">Acceso restringido</p>
        <p class="state-msg">Solo los propietarios y administradores pueden gestionar integraciones.</p>
      </div>

      <!-- Error de carga -->
      <div v-else-if="fetchError" class="state-screen">
        <p class="state-title">No se pudo cargar las integraciones</p>
        <p class="state-msg">{{ fetchError }}</p>
        <Button label="Reintentar" style="margin-top:16px" backColor="var(--Primary)" @click="loadIntegrations" />
      </div>

      <template v-else>
        <!-- Encabezado -->
        <div class="page-header">
          <div>
            <h1 class="page-title">Integraciones</h1>
            <p class="page-subtitle">Conecta Kontrol con tus herramientas externas</p>
          </div>
        </div>

        <!-- Filtro de categorías -->
        <div class="filter-row">
          <button
            class="chip"
            :class="{ active: activeCategory === 'all' }"
            @click="activeCategory = 'all'"
          >Todas</button>
          <button
            v-for="cat in categories"
            :key="cat"
            class="chip"
            :class="{ active: activeCategory === cat }"
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
              <!-- Toggle enable/disable -->
              <button
                v-if="integration.is_configured"
                class="toggle-btn"
                :class="{ 'toggle-on': integration.status === 'active' }"
                :disabled="togglingSlug === integration.slug"
                :title="integration.status === 'active' ? 'Desactivar' : 'Activar'"
                @click="handleToggle(integration)"
              >
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
              </button>
            </div>

            <!-- Descripción -->
            <p class="card-description">{{ integration.descripcion }}</p>

            <!-- Estado + última actualización -->
            <div class="card-meta-row">
              <Pill
                :label="statusLabel(integration.status)"
                :btnColor="statusPillColors(integration.status).bg"
                :circleColor="statusPillColors(integration.status).dot"
                :textColor="statusPillColors(integration.status).text"
              />
              <span v-if="integration.updated_at" class="updated-at">
                Actualizado {{ fmtDate(integration.updated_at) }}
              </span>
            </div>

            <!-- Acciones primarias -->
            <div class="card-actions">
              <button
                class="btn-configure"
                @click="openConfigure(integration)"
              >
                {{ integration.is_configured ? 'Editar configuración' : 'Configurar' }}
              </button>
              <button
                v-if="integration.is_configured"
                class="btn-test"
                :disabled="testingSlug === integration.slug"
                @click="handleTest(integration)"
              >
                {{ testingSlug === integration.slug ? 'Probando…' : 'Probar conexión' }}
              </button>
            </div>

            <!-- Acciones secundarias -->
            <div class="card-secondary-actions">
              <button class="btn-how" @click="openTutorial(integration)">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M6.5 5.5v4M6.5 3.8v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
                ¿Cómo conectar?
              </button>

              <template v-if="integration.is_configured">
                <template v-if="confirmingDisconnect === integration.slug">
                  <button
                    class="btn-confirm-disconnect"
                    :disabled="disconnectingSlug === integration.slug"
                    @click="handleDisconnect(integration)"
                  >
                    {{ disconnectingSlug === integration.slug ? 'Cerrando…' : 'Sí, cerrar' }}
                  </button>
                  <button class="btn-cancel-disconnect" @click="confirmingDisconnect = null">
                    Cancelar
                  </button>
                </template>
                <button
                  v-else
                  class="btn-disconnect"
                  @click="confirmingDisconnect = integration.slug"
                >
                  Cerrar conexión
                </button>
              </template>
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

    <!-- Modal tutorial -->
    <BaseModal v-model="showTutorial" :title="`Cómo conectar ${tutorialIntegration?.nombre ?? ''}`" max-width="500px">
      <div class="tutorial-body" v-if="tutorialIntegration">
        <p class="tutorial-intro">Sigue estos pasos para configurar la integración con {{ tutorialIntegration.nombre }}.</p>
        <ol class="tutorial-steps">
          <li v-for="(step, i) in tutorialSteps" :key="i" class="tutorial-step">
            <span class="step-num">{{ i + 1 }}</span>
            <span class="step-text">{{ step }}</span>
          </li>
        </ol>
        <div class="tutorial-footer">
          <button class="btn-configure" style="width:100%" @click="showTutorial = false; openConfigure(tutorialIntegration)">
            Ir a configurar
          </button>
        </div>
      </div>
    </BaseModal>

    <!-- Modal de configuración -->
    <BaseModal v-model="showModal" :title="modalIntegration?.nombre ?? ''" max-width="520px">
      <template v-if="modalIntegration">
        <form class="modal-form" @submit.prevent="handleSave">
          <div class="modal-section-label">Credenciales</div>
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
              :placeholder="field.required ? 'Requerido' : 'Opcional'"
              autocomplete="off"
            />
            <button
              v-if="field.type === 'password'"
              type="button"
              class="toggle-pass"
              @click="showPasswords[field.key] = !showPasswords[field.key]"
            >
              {{ showPasswords[field.key] ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>

          <p v-if="modalError" class="modal-error">{{ modalError }}</p>
          <p v-if="modalSuccess" class="modal-success">{{ modalSuccess }}</p>

          <div class="modal-footer">
            <Button
              :label="modalLoading ? 'Guardando…' : 'Guardar'"
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
import AppNavbar from '../components/AppNavbar.vue'
import BaseModal from '../components/UI/Modal/BaseModal.vue'
import Pill from '../components/UI/Pill/Pill.vue'
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

function categoryLabel(cat) {
  const map = {
    comunicacion: 'Comunicación',
    email: 'Email',
    automatizacion: 'Automatización',
    crm: 'CRM',
    storage: 'Almacenamiento',
  }
  return map[cat] ?? cat
}

function statusLabel(status) {
  const map = { active: 'Activo', inactive: 'Inactivo', error: 'Error' }
  return map[status] ?? status
}

function statusPillColors(status) {
  if (status === 'active')  return { bg: 'rgba(52,211,153,0.1)',  dot: '#34d399', text: '#34d399' }
  if (status === 'error')   return { bg: 'rgba(251,113,133,0.1)', dot: '#fb7185', text: '#fb7185' }
  return                           { bg: 'rgba(255,255,255,0.05)', dot: '#444',   text: '#666'    }
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return ''
  return dt.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })
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
    setFeedback(integration.slug, 'error', 'La última conexión falló. Revisa las credenciales y usa "Probar conexión" antes de activar.')
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
      setFeedback(integration.slug, 'success', 'Conexión exitosa')
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
    modalSuccess.value = 'Integración guardada correctamente.'
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

const TUTORIALS = {
  'slack': [
    'Ve a api.slack.com/apps e inicia sesión con tu cuenta de Slack.',
    'Crea una nueva app seleccionando "From scratch" y elige tu workspace.',
    'En el menú lateral, ve a "Incoming Webhooks" y actívalo.',
    'Haz clic en "Add New Webhook to Workspace" y selecciona el canal donde quieres recibir notificaciones.',
    'Copia la URL del webhook generada (comienza con https://hooks.slack.com/...) y pégala en la configuración.',
  ],
  'sendgrid': [
    'Inicia sesión en app.sendgrid.com con tu cuenta de SendGrid.',
    'Ve a Settings → API Keys y haz clic en "Create API Key".',
    'Ponle un nombre descriptivo y selecciona el permiso "Restricted Access" → "Mail Send: Full Access".',
    'Copia la API Key generada (solo se muestra una vez) y guárdala en un lugar seguro.',
    'Pega la API Key, tu correo remitente verificado en SendGrid y el correo destinatario que recibirá las alertas.',
  ],
  'microsoft-teams': [
    'Abre Microsoft Teams y ve al canal donde quieres recibir las notificaciones.',
    'Haz clic en "..." junto al nombre del canal y selecciona "Connectors".',
    'Busca "Incoming Webhook" en la lista y haz clic en "Configure".',
    'Ponle un nombre al conector, sube un ícono opcional y haz clic en "Create".',
    'Copia la URL del webhook generada y pégala en la configuración de Kontrol.',
  ],
  'telegram': [
    'Abre Telegram y busca el bot @BotFather.',
    'Envía el comando /newbot y sigue las instrucciones para elegir nombre y usuario para tu bot.',
    'BotFather te entregará un Bot Token. Cópialo y guárdalo.',
    'Para obtener tu Chat ID: inicia una conversación con tu bot y luego consulta la API con el token o usa el bot @userinfobot.',
    'Ingresa el Bot Token y el Chat ID en la configuración de Kontrol.',
  ],
  'twilio-sms': [
    'Crea una cuenta en twilio.com o inicia sesión si ya tienes una.',
    'En el Dashboard principal verás tu Account SID y Auth Token. Cópialos.',
    'Ve a "Phone Numbers → Manage → Buy a number" para adquirir un número de Twilio desde donde se enviarán los SMS.',
    'Ingresa el Account SID, Auth Token, el número de Twilio y el número de destino en la configuración.',
  ],
  'webhook': [
    'Prepara el servidor o servicio externo que recibirá los eventos (debe ser accesible públicamente).',
    'El endpoint debe aceptar peticiones POST con body en formato JSON.',
    'Asegúrate de usar HTTPS para mayor seguridad.',
    'Copia la URL de tu endpoint y pégala en el campo URL de la configuración.',
    'Kontrol enviará un evento POST cada vez que ocurra una acción relevante en tu empresa.',
  ],
}

const tutorialSteps = computed(() => {
  if (!tutorialIntegration.value) return []
  return TUTORIALS[tutorialIntegration.value.slug] ?? [
    'Obtén las credenciales desde la plataforma de ' + tutorialIntegration.value.nombre + '.',
    'Cópialas e ingrésalas en el formulario de configuración de Kontrol.',
    'Guarda los cambios y usa "Probar conexión" para verificar que todo funciona.',
  ]
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
    confirmingDisconnect.value = null
    setFeedback(integration.slug, 'success', 'Conexión cerrada correctamente.')
  } catch (err) {
    setFeedback(integration.slug, 'error', err.message)
  } finally {
    disconnectingSlug.value = null
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