<template>
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

      <div class="sc-row sc-row--last">
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
    </section>

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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'
import { useSaleConfigStore } from '../stores/saleConfig'
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY, formatMoney } from '@/utils/currency.js'

const authStore = useAuthStore()
const prefsStore = usePreferencesStore()
const saleConfigStore = useSaleConfigStore()
const router = useRouter()
const { t } = useI18n()

/** La configuración de la empresa mueve lo que se cobra: solo owner y admin. */
const canManageCompany = computed(() =>
  ['owner', 'admin'].includes(authStore.empresaActual?.rol)
)

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

function authHeader() {
  const token = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
  return headers
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const res = await fetch('/api/companies/sale-config', { headers: authHeader() })
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
    const res = await fetch('/api/companies/sale-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
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

onMounted(() => {
  prefsStore.load()
  if (canManageCompany.value) load()
  else loading.value = false
})
</script>

<style scoped>
.settings {
  max-width: 720px;
  margin: 0 auto;
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
