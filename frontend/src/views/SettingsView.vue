<template>
  <div>
  <AppNavbar />
  <section class="settings">
    <header class="set-head">
      <!-- La configuración se abre desde el menú de cuenta, que no deja rastro
           de dónde se venía: sin esto la única salida es el botón atrás. -->
      <button type="button" class="set-back" @click="goBack">
        <span aria-hidden="true">←</span>
        <span>{{ $t('settings.back') }}</span>
      </button>
      <h1 class="set-title">{{ $t('settings.title') }}</h1>
      <p class="set-sub">{{ $t('settings.subtitle') }}</p>
    </header>

    <!-- Preferencias de quien mira, no de la empresa: se guardan en este
         navegador y no dependen del rol. -->
    <section class="set-card set-card--prefs">
      <h2 class="sc-title">{{ $t('settings.prefs.title') }}</h2>
      <p class="sc-hint">{{ $t('settings.prefs.hint') }}</p>

      <!-- Tres de cada cinco participantes buscaron el idioma aquí antes que en
           la barra superior, así que aquí está, con los dos nombres escritos. -->
      <div class="sc-row">
        <div class="sc-field">
          <span class="sc-label">{{ $t('settings.prefs.language') }}</span>
          <LanguageSelector variant="inline" />
        </div>
        <p class="sc-note">{{ $t('settings.prefs.languageNote') }}</p>
      </div>

      <div class="sc-row">
        <label class="sc-toggle">
          <input
            type="checkbox"
            :checked="prefsStore.birdieVisible"
            @change="prefsStore.setBirdieVisible($event.target.checked)"
          />
          <span class="sc-toggle-label">{{ $t('settings.prefs.birdie') }}</span>
        </label>
        <p class="sc-note">{{ $t('settings.prefs.birdieNote') }}</p>
      </div>

      <!-- Si se guardan o no las preferencias de arriba (L-3). -->
      <div class="sc-row sc-row--last">
        <span class="sc-label">{{ $t('settings.prefs.storage') }}</span>
        <StorageConsentControls />
        <p class="sc-note">
          {{ $t('settings.prefs.storageNote') }}
          <RouterLink to="/legal#cookies">{{ $t('settings.prefs.storagePolicy') }}</RouterLink>
        </p>
      </div>
    </section>

    <!-- Destino de Ventas > Configuración de venta. -->
    <section id="sale-config">
    <p v-if="!canManageCompany" class="set-state">
      {{ $t('settings.ownerOnly') }}
    </p>

    <p v-if="canManageCompany && loading" class="set-state">{{ $t('settings.loading') }}</p>

    <p v-else-if="canManageCompany && loadError" class="set-state set-state--err">
      {{ loadError }}
    </p>

    <form v-else-if="canManageCompany" class="set-card" @submit.prevent="save">
      <h2 class="sc-title">{{ $t('settings.sale.title') }}</h2>
      <p class="sc-hint">{{ $t('settings.sale.hint') }}</p>

      <!-- Moneda -->
      <div class="sc-row">
        <label class="sc-field">
          <span class="sc-label">{{ $t('settings.sale.currency') }}</span>
          <select v-model="form.moneda" class="sc-select">
            <option v-for="c in CURRENCY_OPTIONS" :key="c.code" :value="c.code">
              {{ c.label }}
            </option>
          </select>
        </label>
        <p class="sc-note">
          {{ $t('settings.sale.currencyNote', { sample: formatMoney(1234.5, form.moneda) }) }}
        </p>
      </div>

      <div class="sc-divider" />

      <!-- IVA -->
      <div class="sc-row">
        <label class="sc-toggle">
          <input v-model="form.iva_activo" type="checkbox" />
          <span class="sc-toggle-label">{{ $t('settings.sale.vatEnabled') }}</span>
        </label>
        <p class="sc-note">{{ $t('settings.sale.vatEnabledNote') }}</p>
      </div>

      <div class="sc-row" :class="{ 'is-disabled': !form.iva_activo }">
        <label class="sc-field">
          <span class="sc-label">{{ $t('settings.sale.vatRate') }}</span>
          <div class="sc-input-wrap">
            <input
              v-model.number="vatPercent"
              type="number"
              class="sc-input"
              min="0"
              max="100"
              step="0.01"
              :disabled="!form.iva_activo"
            />
            <span class="sc-suffix">%</span>
          </div>
        </label>
        <!-- Se edita en porcentaje y se guarda como fracción: escribir 0.12
             pensando en "12" es el error fácil, y cobraría un 0,12%. -->
        <p class="sc-note">{{ $t('settings.sale.vatRateNote') }}</p>
      </div>

      <div class="sc-divider" />

      <!-- Descuento -->
      <div class="sc-row">
        <label class="sc-toggle">
          <input v-model="form.descuento_activo" type="checkbox" />
          <span class="sc-toggle-label">{{ $t('settings.sale.discountEnabled') }}</span>
        </label>
        <p class="sc-note">{{ $t('settings.sale.discountEnabledNote') }}</p>
      </div>

      <div class="sc-row" :class="{ 'is-disabled': !form.descuento_activo }">
        <label class="sc-field">
          <span class="sc-label">{{ $t('settings.sale.discountMax') }}</span>
          <div class="sc-input-wrap">
            <input
              v-model.number="form.descuento_max_pct"
              type="number"
              class="sc-input"
              min="0"
              max="100"
              step="1"
              :disabled="!form.descuento_activo"
            />
            <span class="sc-suffix">%</span>
          </div>
        </label>
        <p class="sc-note">{{ $t('settings.sale.discountMaxNote') }}</p>
      </div>

      <p v-if="formError" class="sc-error">{{ formError }}</p>
      <p v-if="saved" class="sc-saved">{{ $t('settings.saved') }}</p>

      <div class="sc-actions">
        <button type="submit" class="sc-save" :disabled="saving">
          {{ saving ? $t('settings.saving') : $t('settings.save') }}
        </button>
      </div>
    </form>
    </section>

    <!-- PAY-1 — El plan es de la empresa: todos lo ven; solo el owner lo cambia
         desde /billing. -->
    <section id="plan" class="set-card set-card--link">
      <h2 class="sc-title">{{ $t('settings.billing.title') }}</h2>
      <p class="sc-hint">{{ $t('settings.billing.hint', { plan: $t(`billing.plans.${authStore.planCode}.name`) }) }}</p>
      <RouterLink class="sc-link" to="/billing">{{ $t('settings.billing.link') }} →</RouterLink>
    </section>

    <!-- Integraciones conserva su ruta y sus permisos; aquí solo se enlaza. -->
    <section v-if="canManageCompany" class="set-card set-card--link">
      <h2 class="sc-title">{{ $t('settings.integrations.title') }}</h2>
      <p class="sc-hint">{{ $t('settings.integrations.hint') }}</p>
      <RouterLink class="sc-link" to="/integrations">{{ $t('settings.integrations.link') }} →</RouterLink>
    </section>

    <!-- El panel sigue en Inicio; la tarjeta solo lo ve quien ve ese panel. -->
    <section v-if="authStore.canManageUsers" class="set-card set-card--link">
      <h2 class="sc-title">{{ $t('settings.members.title') }}</h2>
      <p class="sc-hint">{{ $t('settings.members.hint') }}</p>
      <RouterLink class="sc-link" :to="{ path: '/dashboard', hash: '#company-members' }">{{ $t('settings.members.link') }} →</RouterLink>
    </section>

    <section class="set-card set-card--privacy">
      <h2 class="sc-title">{{ $t('settings.privacy.title') }}</h2>
      <p class="sc-hint">{{ $t('settings.privacy.hint') }}</p>
      <div v-if="canExportCompany" class="privacy-action">
        <button class="sc-save" type="button" :disabled="exporting" @click="exportCompany">
          {{ exporting ? $t('settings.privacy.exporting') : $t('settings.privacy.export') }}
        </button>
      </div>
      <p v-else class="sc-note">{{ $t('settings.privacy.exportOwnerOnly') }}</p>
      <p v-if="privacyError" class="sc-error" role="alert">{{ privacyError }}</p>
      <p v-if="privacyNotice" class="sc-saved" role="status">{{ privacyNotice }}</p>

      <details class="privacy-delete">
        <summary>{{ $t('settings.privacy.deleteTitle') }}</summary>
        <p>{{ $t('settings.privacy.deleteWhat') }}</p>
        <p>{{ $t('settings.privacy.deleteRetained') }}</p>
        <p>{{ $t('settings.privacy.deleteDuration') }}</p>
        <p>{{ $t('settings.privacy.deleteExternal') }}</p>
        <label class="sc-field" for="account-delete-password">
          <span class="sc-label">{{ $t('settings.privacy.password') }}</span>
          <input
            id="account-delete-password"
            v-model="deletePassword"
            class="sc-input privacy-password"
            type="password"
            autocomplete="current-password"
          />
        </label>
        <button
          v-if="!googleReauthToken"
          class="privacy-google"
          type="button"
          :disabled="reauthenticating"
          @click="reauthenticateWithGoogle"
        >
          {{ reauthenticating ? $t('settings.privacy.reauthenticating') : $t('settings.privacy.googleReauth') }}
        </button>
        <p v-if="deletePasswordError" class="sc-error" role="alert">{{ deletePasswordError }}</p>
        <button
          class="sc-save privacy-delete-button"
          type="button"
          :disabled="deleting || (!deletePassword && !googleReauthToken)"
          @click="deleteAccount"
        >
          {{ deleting ? $t('settings.privacy.deleting') : $t('settings.privacy.deleteConfirm') }}
        </button>
      </details>
    </section>
  </section>
  </div>
</template>

<script setup>
import { apiFetch as requestApi, authHeaders } from '@/services/api.js'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'
import { useSaleConfigStore } from '../stores/saleConfig'
import LanguageSelector from '../components/common/LanguageSelector.vue'
import StorageConsentControls from '../components/StorageConsentControls.vue'
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY, formatMoney } from '@/utils/currency.js'

const authStore = useAuthStore()
const prefsStore = usePreferencesStore()
const saleConfigStore = useSaleConfigStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

/** La configuración de la empresa mueve lo que se cobra: solo owner y admin. */
const canManageCompany = computed(() =>
  ['owner', 'admin'].includes(authStore.empresaActual?.rol)
)
const canExportCompany = canManageCompany

function goBack() {
  // Si se llegó por un enlace directo no hay historia a la que volver, así que
  // el dashboard hace de destino en vez de dejar el botón sin efecto.
  if (window.history.length > 1) router.back()
  else router.push({ name: 'dashboard' })
}

const loading   = ref(true)
const loadError = ref(null)
const saving    = ref(false)
const formError = ref(null)
const saved     = ref(false)
const exporting = ref(false)
const deleting = ref(false)
const reauthenticating = ref(false)
const deletePassword = ref('')
const googleReauthToken = ref('')
const privacyError = ref('')
const privacyNotice = ref('')
const deletePasswordError = ref('')

const form = ref({
  iva_activo: false,
  iva_tasa: 0.12,
  descuento_activo: false,
  descuento_max_pct: 0,
  moneda: DEFAULT_CURRENCY,
})

/**
 * La tasa se guarda como fracción (0.12) pero se edita en porcentaje (12): un
 * campo que pide "0.12" invita a escribir "12" y cobrar un 1200%.
 */
const vatPercent = computed({
  get: () => Math.round(Number(form.value.iva_tasa) * 10000) / 100,
  set: (v) => {
    const n = Number(v)
    form.value.iva_tasa = Number.isFinite(n) ? n / 100 : 0
  },
})

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const res = await requestApi('/api/companies/sale-config', { headers: authHeaders() })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`)
    form.value = { ...form.value, ...body.data }
  } catch (err) {
    loadError.value = err.message || t('settings.loadError')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  formError.value = null
  saved.value = false
  try {
    const res = await requestApi('/api/companies/sale-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        iva_activo: form.value.iva_activo,
        iva_tasa: Number(form.value.iva_tasa),
        descuento_activo: form.value.descuento_activo,
        descuento_max_pct: Number(form.value.descuento_max_pct),
        moneda: form.value.moneda,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      // El backend valida los mismos límites: se muestra su mensaje en vez de
      // uno propio, para que el motivo del rechazo sea el real.
      throw new Error(body.errors?.[0]?.message || body.message || `HTTP ${res.status}`)
    }
    form.value = { ...form.value, ...body.data }
    // El resto de la app lee la moneda del store: sin esto, el dashboard
    // seguiría en la anterior hasta recargar la página.
    saleConfigStore.apply(body.data)
    saved.value = true
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function exportCompany() {
  exporting.value = true
  privacyError.value = ''
  privacyNotice.value = ''
  try {
    const response = await requestApi('/api/companies/export', { headers: authHeaders() })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || `HTTP ${response.status}`)
    }
    const file = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = file
    link.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
      || 'kontrol-company-export.json'
    link.click()
    URL.revokeObjectURL(file)
    privacyNotice.value = t('settings.privacy.exportSuccess')
  } catch (error) {
    privacyError.value = error.message || t('settings.privacy.error')
  } finally {
    exporting.value = false
  }
}

async function reauthenticateWithGoogle() {
  reauthenticating.value = true
  deletePasswordError.value = ''
  try {
    const response = await requestApi('/api/auth/google/reauth-for-deletion', {
      method: 'POST',
      headers: authHeaders(),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || !body.url) throw new Error(body.message || `HTTP ${response.status}`)
    window.location.assign(body.url)
  } catch (error) {
    deletePasswordError.value = error.message || t('settings.privacy.error')
    reauthenticating.value = false
  }
}

async function deleteAccount() {
  if (!window.confirm(t('settings.privacy.finalConfirm'))) return
  deleting.value = true
  deletePasswordError.value = ''
  try {
    const response = await requestApi('/api/auth/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        password: deletePassword.value || undefined,
        google_reauth_token: googleReauthToken.value || undefined,
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || `HTTP ${response.status}`)
    authStore.logout()
    await router.push('/')
  } catch (error) {
    deletePasswordError.value = error.message || t('settings.privacy.error')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  prefsStore.load()
  if (canManageCompany.value) load()
  else loading.value = false
  const deletionProof = route.hash.match(/^#deletion_proof=(.+)$/)?.[1]
  if (deletionProof) {
    googleReauthToken.value = decodeURIComponent(deletionProof)
    privacyNotice.value = t('settings.privacy.googleReauthSuccess')
    router.replace({ path: '/settings' })
  } else if (route.query.reauth_error) {
    deletePasswordError.value = t('settings.privacy.googleReauthError')
    router.replace({ path: '/settings' })
  }
})
</script>

<style scoped>
.settings {
  max-width: 720px;
  /* Bajo la barra fija de 56px. */
  margin: 56px auto 0;
  padding: var(--k-space-6) var(--k-space-5) var(--k-space-7);
}

.set-head { margin-bottom: var(--k-space-6); }

.set-back {
  display: inline-flex;
  align-items: center;
  gap: var(--k-space-2);
  margin-bottom: var(--k-space-4);
  padding: 0;
  min-height: var(--k-target-min-size);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: var(--k-transition-ui);
}
.set-back:hover { color: var(--k-color-primary); }

.set-card--prefs { margin-bottom: var(--k-space-5); }
.set-card--link { margin-top: var(--k-space-5); }
.set-card--privacy { margin-top: var(--k-space-5); }
.set-card--link .sc-hint { margin-bottom: var(--k-space-3); }
.sc-link {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-color-primary);
  text-decoration: none;
}
.sc-link:hover { text-decoration: underline; }
.privacy-action { display: flex; justify-content: flex-start; }
.privacy-delete {
  margin-top: var(--k-space-5);
  border-top: var(--k-border-width) solid var(--k-shade-6);
  padding-top: var(--k-space-4);
}
.privacy-delete summary {
  cursor: pointer;
  color: var(--k-state-error-text);
  font-family: var(--k-font-sans);
}
.privacy-delete p {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
  line-height: 1.6;
}
.privacy-password { display: block; max-width: 320px; margin-top: var(--k-space-2); }
.privacy-google {
  margin: var(--k-space-3) 0;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
}
.privacy-google:disabled { opacity: 0.5; cursor: wait; }
.privacy-delete-button {
  margin-top: var(--k-space-3);
  background: var(--k-state-error-text);
}
/* La última fila de una tarjeta no necesita separación inferior. */
.sc-row--last { margin-bottom: 0; }

.set-title {
  margin: 0 0 var(--k-space-2);
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  color: var(--k-color-text);
}
.set-sub {
  margin: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  color: var(--k-text-muted);
}

.set-state {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  color: var(--k-text-muted);
}
.set-state--err { color: var(--k-state-error-text); }

.set-card {
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
  padding: var(--k-space-5);
}

.sc-title {
  margin: 0 0 var(--k-space-2);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-large);
  color: var(--k-color-text);
}
.sc-hint {
  margin: 0 0 var(--k-space-5);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}

.sc-row { margin-bottom: var(--k-space-5); }
/* Atenuado, no oculto: enseña que el campo existe y qué lo habilita. */
.sc-row.is-disabled { opacity: 0.45; }

.sc-toggle {
  display: flex;
  align-items: center;
  gap: var(--k-space-3);
  cursor: pointer;
  min-height: var(--k-target-min-size);
}
.sc-toggle input { width: 18px; height: 18px; accent-color: var(--k-color-primary); cursor: pointer; }
.sc-toggle-label {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  color: var(--k-color-text);
}

.sc-field { display: flex; flex-direction: column; gap: var(--k-space-2); }
.sc-label {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-soft);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sc-select {
  max-width: 260px;
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-3);
  background: var(--k-form-input-bg);
  border: var(--k-border-width) solid var(--k-shade-7);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  cursor: pointer;
}
.sc-select:focus {
  outline: none;
  background: var(--k-form-input-focus-bg);
  border-color: var(--k-color-primary);
}
/* El desplegable lo pinta el sistema: sin esto, en un tema claro salen las
   opciones en blanco sobre blanco. */
.sc-select option {
  background: var(--k-shade-2);
  color: var(--k-color-text);
}

.sc-input-wrap { display: flex; align-items: stretch; max-width: 180px; }
.sc-input {
  flex: 1;
  min-width: 0;
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-3);
  background: var(--k-form-input-bg);
  border: var(--k-border-width) solid var(--k-shade-7);
  border-right: none;
  color: var(--k-color-text);
  font-family: var(--k-font-mono);
  font-size: var(--k-font-size-body-main);
}
.sc-input:focus {
  outline: none;
  background: var(--k-form-input-focus-bg);
  border-color: var(--k-color-primary);
}
.sc-input:disabled { cursor: not-allowed; }
.sc-suffix {
  display: flex;
  align-items: center;
  padding: 0 var(--k-space-3);
  background: var(--k-shade-4);
  border: var(--k-border-width) solid var(--k-shade-7);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}

.sc-note {
  margin: var(--k-space-2) 0 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  color: var(--k-text-dim);
  max-width: 52ch;
}

.sc-divider {
  height: var(--k-border-width);
  background: var(--k-shade-6);
  margin: 0 0 var(--k-space-5);
}

.sc-error {
  margin: 0 0 var(--k-space-3);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-state-error-text);
}
.sc-saved {
  margin: 0 0 var(--k-space-3);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-state-success-text);
}

.sc-actions { display: flex; justify-content: flex-end; }
.sc-save {
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-5);
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
  border: none;
  cursor: pointer;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: var(--k-transition-ui);
}
.sc-save:hover:not(:disabled) { filter: brightness(var(--k-state-hover-brightness)); }
.sc-save:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 640px) {
  .settings { padding: var(--k-space-5) var(--k-space-4) var(--k-space-6); }
  .set-card { padding: var(--k-space-4); }
  .sc-input-wrap { max-width: none; }
}
</style>
