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
              <div class="card-icon">
                <component :is="integrationIcon(integration.slug)" />
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

            <!-- Acciones -->
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

            <!-- Feedback inline -->
            <p v-if="inlineFeedback[integration.slug]" class="inline-feedback" :class="inlineFeedback[integration.slug].type">
              {{ inlineFeedback[integration.slug].msg }}
            </p>
          </div>
        </div>
      </template>

    </div>

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
import { useAuthStore } from '../stores/auth'
import {
  listIntegrations,
  getIntegrationConfig,
  saveIntegrationConfig,
  toggleIntegration,
  testIntegration,
} from '../services/integrations.js'

const authStore = useAuthStore()

const integrations = ref([])
const loading = ref(false)
const fetchError = ref(null)

const activeCategory = ref('all')
const togglingSlug = ref(null)
const testingSlug = ref(null)
const inlineFeedback = ref({})

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
  try {
    await testIntegration(...authArgs(), integration.slug)
    setFeedback(integration.slug, 'success', 'Conexión exitosa')
    const idx = integrations.value.findIndex((i) => i.slug === integration.slug)
    if (idx !== -1) integrations.value[idx].status = 'active'
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

// ── Icon components ────────────────────────────────────────────────────────────

const SlackIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M7 17.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM11.5 17.5v-7" stroke="#E01E5A" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M7 17.5h7M11.5 10.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" stroke="#E01E5A" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M21 10.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM16.5 10.5v7" stroke="#36C5F0" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M21 10.5h-7M16.5 17.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" stroke="#36C5F0" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M10.5 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM10.5 7v4.5" stroke="#2EB67D" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M17.5 21a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM17.5 21v-4.5" stroke="#ECB22E" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`,
}

const SendGridIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="3" width="10" height="10" rx="1.5" fill="#1A82E2" opacity="0.9"/>
    <rect x="15" y="3" width="10" height="10" rx="1.5" fill="#1A82E2" opacity="0.6"/>
    <rect x="3" y="15" width="10" height="10" rx="1.5" fill="#1A82E2" opacity="0.6"/>
    <rect x="15" y="15" width="10" height="10" rx="1.5" fill="#1A82E2" opacity="0.3"/>
  </svg>`,
}

const TeamsIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="14" y="4" width="11" height="11" rx="2" fill="#5059C9"/>
    <circle cx="19.5" cy="9.5" r="3" fill="#7B83EB"/>
    <rect x="3" y="11" width="14" height="13" rx="2" fill="#5059C9"/>
    <circle cx="10" cy="8" r="4" fill="#7B83EB"/>
    <path d="M6 17.5h8M10 15v5" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,
}

const TelegramIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="11" fill="#29A9EB"/>
    <path d="M8 13.8l10.5-4.5c.5-.2.9.1.7.7l-1.8 8.4c-.1.5-.5.6-.9.4l-2.5-1.9-1.2 1.1c-.1.1-.3.2-.5.2l.2-2.6 4.8-4.3c.2-.2 0-.3-.3-.1l-5.9 3.7-2.5-.8c-.5-.2-.5-.5.4-.9z" fill="white"/>
  </svg>`,
}

const TwilioIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="11" fill="#F22F46"/>
    <circle cx="14" cy="14" r="4" fill="none" stroke="white" stroke-width="2"/>
    <circle cx="10.5" cy="10.5" r="1.5" fill="white"/>
    <circle cx="17.5" cy="10.5" r="1.5" fill="white"/>
    <circle cx="10.5" cy="17.5" r="1.5" fill="white"/>
    <circle cx="17.5" cy="17.5" r="1.5" fill="white"/>
  </svg>`,
}

const WebhookIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M10 14c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="#caa860" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M14 10V6M14 22v-4M6 14H4M24 14h-2M8.1 8.1L6.7 6.7M21.3 21.3l-1.4-1.4M8.1 19.9l-1.4 1.4M21.3 6.7l-1.4 1.4" stroke="#caa860" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,
}

const DefaultIcon = {
  template: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="4" y="4" width="20" height="20" rx="3" stroke="#555" stroke-width="1.6"/>
    <path d="M9 14h10M14 9v10" stroke="#555" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,
}

const ICONS = {
  'slack':           SlackIcon,
  'sendgrid':        SendGridIcon,
  'microsoft-teams': TeamsIcon,
  'telegram':        TelegramIcon,
  'twilio-sms':      TwilioIcon,
  'webhook':         WebhookIcon,
}

function integrationIcon(slug) {
  return ICONS[slug] ?? DefaultIcon
}

onMounted(() => {
  if (canManage.value) loadIntegrations()
})
</script>

<style scoped>
.integrations-root {
  min-height: 100vh;
  background: var(--Background, #000);
  color: var(--Text, #fff);
  font-family: 'DM Sans', sans-serif;
}

.integrations-layout {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

/* ── Header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-title {
  font-family: 'Alfa Slab One', serif;
  font-size: 32px;
  color: #faf8f5;
  margin: 0 0 6px;
}

.page-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* ── Filtros ── */
.filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}

.chip {
  padding: 6px 14px;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #888;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover {
  border-color: #444;
  color: #ccc;
}

.chip.active {
  background: rgba(202, 168, 96, 0.12);
  border-color: #caa860;
  color: #caa860;
}

/* ── Grid ── */
.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* ── Card ── */
.integration-card {
  background: #0c0c0c;
  border: 1px solid #1f1f1f;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.15s;
}

.integration-card:hover {
  border-color: #333;
}

.integration-card.card-active {
  border-color: rgba(202, 168, 96, 0.25);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: #141414;
  border: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: #faf8f5;
}

.cat-badge {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.card-description {
  font-size: 13px;
  color: #888;
  line-height: 1.55;
  margin: 0;
}

/* ── Status row ── */
.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.updated-at {
  font-size: 11px;
  color: #444;
}

/* ── Toggle switch ── */
.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-track {
  display: block;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #222;
  border: 1px solid #333;
  position: relative;
  transition: background 0.2s, border-color 0.2s;
}

.toggle-on .toggle-track {
  background: rgba(202, 168, 96, 0.25);
  border-color: #caa860;
}

.toggle-thumb {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #555;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s, background 0.2s;
}

.toggle-on .toggle-thumb {
  transform: translateX(16px);
  background: #caa860;
}

/* ── Acciones ── */
.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

.btn-configure {
  flex: 1;
  padding: 8px 14px;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  background: rgba(202, 168, 96, 0.1);
  border: 1px solid rgba(202, 168, 96, 0.3);
  color: #caa860;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-configure:hover {
  background: rgba(202, 168, 96, 0.18);
}

.btn-test {
  padding: 8px 14px;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-test:hover:not(:disabled) {
  border-color: #444;
  color: #ccc;
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Feedback inline ── */
.inline-feedback {
  font-size: 12px;
  padding: 8px 12px;
  margin: 0;
}

.inline-feedback.success {
  background: rgba(52, 211, 153, 0.08);
  color: #34d399;
  border-left: 2px solid #34d399;
}

.inline-feedback.error {
  background: rgba(251, 113, 133, 0.08);
  color: #fb7185;
  border-left: 2px solid #fb7185;
}

/* ── Skeleton ── */
.skeleton {
  pointer-events: none;
}

.skeleton-icon {
  width: 48px;
  height: 48px;
  background: #1a1a1a;
  border-radius: 2px;
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.skeleton-line {
  height: 12px;
  background: #1a1a1a;
  border-radius: 2px;
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-line.short { width: 40%; }
.skeleton-line.mid   { width: 70%; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.8; }
}

/* ── Estado vacío / error ── */
.state-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 12px;
}

.state-title {
  font-size: 20px;
  font-weight: 600;
  color: #faf8f5;
  margin: 0;
}

.state-msg {
  font-size: 14px;
  color: #666;
  max-width: 360px;
  margin: 0;
}

/* ── Modal form ── */
.modal-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #555;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.form-label {
  font-size: 13px;
  color: #aaa;
}

.required-dot {
  color: #fb7185;
  margin-left: 2px;
}

.form-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #2a2a2a;
  color: #faf8f5;
  padding: 10px 12px;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: rgba(202, 168, 96, 0.5);
}

.toggle-pass {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background: none;
  border: none;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.toggle-pass:hover {
  color: #888;
}

.modal-error {
  font-size: 13px;
  color: #fb7185;
  background: rgba(251, 113, 133, 0.08);
  border-left: 2px solid #fb7185;
  padding: 8px 12px;
  margin: 0;
}

.modal-success {
  font-size: 13px;
  color: #34d399;
  background: rgba(52, 211, 153, 0.08);
  border-left: 2px solid #34d399;
  padding: 8px 12px;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
