<template>
  <div>
  <AppNavbar />
  <section class="billing">
    <header class="bl-head">
      <h1 class="bl-title">{{ $t('billing.title') }}</h1>
      <p class="bl-sub">{{ $t('billing.subtitle') }}</p>
    </header>

    <TestModeBanner class="bl-banner" />

    <p v-if="loading" class="bl-state">{{ $t('billing.loading') }}</p>
    <p v-else-if="loadError" class="bl-state bl-state--err">{{ loadError }}</p>

    <template v-else>
      <p v-if="flash" class="bl-flash" role="status">{{ flash }}</p>
      <p v-if="actionError" class="bl-state bl-state--err" role="alert">{{ actionError }}</p>
      <p v-if="lockedFeatureMessage" class="bl-flash">{{ lockedFeatureMessage }}</p>
      <p v-if="!subscription.billingConfigured" class="bl-flash">{{ $t('billing.notConfigured') }}</p>

      <!-- Plan vigente de la empresa: viene de la base, que solo cambia con
           eventos verificados de la pasarela. -->
      <section class="bl-card bl-current" data-test="current-plan">
        <div class="bl-current-head">
          <h2 class="bl-card-title">{{ $t('billing.current.title') }}</h2>
          <span class="bl-badge">{{ planName(subscription.plan) }}</span>
        </div>
        <p class="bl-hint">{{ statusText }}</p>
        <p v-if="subscription.status === 'past_due'" class="bl-warning" role="alert">
          {{ $t('billing.current.pastDue') }}
        </p>

        <ul class="bl-usage">
          <li v-for="resource in RESOURCES" :key="resource" class="bl-usage-row">
            <span class="bl-usage-label">{{ $t(`billing.resources.${resource}`) }}</span>
            <span class="bl-usage-value">{{ usageText(resource) }}</span>
            <span
              v-if="subscription.limits[resource] !== null"
              class="bl-usage-bar"
              :class="{ 'is-full': usageRatio(resource) >= 1 }"
              aria-hidden="true"
            >
              <span class="bl-usage-fill" :style="{ width: `${Math.min(usageRatio(resource), 1) * 100}%` }" />
            </span>
          </li>
        </ul>

        <div v-if="subscription.canManage && subscription.hasBillingAccount" class="bl-current-actions">
          <button
            type="button"
            class="bl-btn bl-btn--ghost"
            :disabled="busy !== null || !subscription.billingConfigured"
            @click="manage"
          >
            {{ busy === 'portal' ? $t('billing.actions.redirecting') : $t('billing.actions.manage') }}
          </button>
        </div>
        <p v-if="!subscription.canManage" class="bl-hint bl-hint--last">{{ $t('billing.ownerOnly') }}</p>
      </section>

      <div class="bl-interval" role="group" :aria-label="$t('billing.interval.label')">
        <button
          v-for="option in INTERVALS"
          :key="option"
          type="button"
          class="bl-interval-btn"
          :class="{ 'is-active': interval === option }"
          :aria-pressed="interval === option"
          @click="interval = option"
        >
          {{ $t(`billing.interval.${option}`) }}
        </button>
        <span class="bl-interval-note">{{ $t('billing.interval.yearlyNote') }}</span>
      </div>

      <div class="bl-plans">
        <article
          v-for="plan in plans"
          :key="plan.code"
          class="bl-card bl-plan"
          :class="{ 'is-current': plan.code === subscription.plan }"
          :data-test="`plan-${plan.code}`"
        >
          <h2 class="bl-card-title">{{ planName(plan.code) }}</h2>
          <p class="bl-hint">{{ $t(`billing.plans.${plan.code}.tagline`) }}</p>
          <p class="bl-price">
            <span class="bl-price-amount">{{ formatPrice(plan.prices[interval]) }}</span>
            <span class="bl-price-period">{{ $t(`billing.interval.per.${interval}`) }}</span>
          </p>

          <ul class="bl-list">
            <li v-for="resource in RESOURCES" :key="resource">{{ limitText(plan, resource) }}</li>
          </ul>
          <ul class="bl-list bl-list--features">
            <li>{{ includesText(plan) }}</li>
            <li v-for="feature in addedFeatures(plan)" :key="feature">{{ $t(`billing.modules.${feature}`) }}</li>
          </ul>

          <div v-if="subscription.canManage" class="bl-plan-action">
            <button
              v-if="actionFor(plan)"
              type="button"
              class="bl-btn"
              :disabled="busy !== null || !subscription.billingConfigured"
              @click="select(plan)"
            >
              {{ busy === plan.code ? $t('billing.actions.processing') : actionLabel(plan) }}
            </button>
            <p v-else class="bl-hint bl-hint--last">{{ passiveLabel(plan) }}</p>
          </div>
        </article>
      </div>
    </template>
  </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import TestModeBanner from '../components/billing/TestModeBanner.vue'
import { useAuthStore } from '../stores/auth'
import { changePlan, getPlans, getSubscription, openPortal, startCheckout } from '../services/billing.js'

const RESOURCES = ['members', 'projects', 'products']
const INTERVALS = ['month', 'year']
// Tras volver del Checkout el plan llega por el webhook, no por la redirección:
// se consulta unas cuantas veces hasta que la base lo refleje.
const POLL_ATTEMPTS = 5
const POLL_INTERVAL_MS = 2000

const { t, te, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const loadError = ref(null)
const actionError = ref(null)
const flash = ref(null)
const busy = ref(null)
const plans = ref([])
const subscription = ref(null)
const interval = ref('month')
let pollTimer = null

const planName = (code) => t(`billing.plans.${code}.name`)

const formatPrice = (cents) =>
  new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    cents / 100
  )

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(value)) : ''

const statusText = computed(() => {
  const sub = subscription.value
  if (sub.plan === 'free') return t('billing.current.free')
  if (sub.cancelAtPeriodEnd) return t('billing.current.endsOn', { date: formatDate(sub.currentPeriodEnd) })
  return t('billing.current.renews', {
    date: formatDate(sub.currentPeriodEnd),
    interval: t(`billing.interval.${sub.interval ?? 'month'}`).toLowerCase(),
  })
})

const lockedFeatureMessage = computed(() => {
  const feature = route.query.feature
  if (!feature || !te(`billing.modules.${feature}`)) return null
  const plan = plans.value.find((candidate) => candidate.features.includes(feature))
  if (!plan) return null
  return t('billing.gate.feature', { module: t(`billing.modules.${feature}`), plan: planName(plan.code) })
})

const usageRatio = (resource) => {
  const limit = subscription.value.limits[resource]
  return limit ? subscription.value.usage[resource] / limit : 0
}

const usageText = (resource) => {
  const used = subscription.value.usage[resource]
  const limit = subscription.value.limits[resource]
  return limit === null ? t('billing.usage.unlimited', { used }) : t('billing.usage.of', { used, limit })
}

const limitText = (plan, resource) =>
  plan.limits[resource] === null
    ? t(`billing.limits.unlimited.${resource}`)
    : t(`billing.limits.${resource}`, { count: plan.limits[resource] })

// Cada plan lista solo lo que agrega sobre el anterior.
const addedFeatures = (plan) => {
  const previous = plans.value.find((candidate) => candidate.rank === plan.rank - 1)
  return plan.features.filter((feature) => !previous?.features.includes(feature))
}

const includesText = (plan) => {
  const previous = plans.value.find((candidate) => candidate.rank === plan.rank - 1)
  return previous ? t('billing.features.everythingIn', { plan: planName(previous.code) }) : t('billing.features.base')
}

const isPaid = (code) => code !== 'free'

// 'checkout' para pasar de Gratis a un plan pagado, 'change' entre planes
// pagados, null cuando no hay acción (plan actual o volver a Gratis, que se
// hace cancelando en el portal).
const actionFor = (plan) => {
  const current = subscription.value
  if (!isPaid(plan.code)) return null
  if (!isPaid(current.plan)) return 'checkout'
  if (plan.code === current.plan && interval.value === current.interval) return null
  return 'change'
}

const actionLabel = (plan) =>
  actionFor(plan) === 'checkout'
    ? t('billing.actions.subscribe', { plan: planName(plan.code) })
    : t('billing.actions.change', { plan: planName(plan.code) })

const passiveLabel = (plan) =>
  plan.code === subscription.value.plan ? t('billing.actions.current') : t('billing.actions.downgradeHint')

async function refresh() {
  subscription.value = await getSubscription()
  if (isPaid(subscription.value.plan) && subscription.value.interval) interval.value = subscription.value.interval
}

function pollUntil(predicate, attempt = 0) {
  if (attempt >= POLL_ATTEMPTS) return
  pollTimer = setTimeout(async () => {
    try {
      await refresh()
      if (predicate(subscription.value)) {
        await authStore.loadAccessContext()
        return
      }
    } catch {
      // Un fallo puntual no corta la espera: el siguiente intento lo reintenta.
    }
    pollUntil(predicate, attempt + 1)
  }, POLL_INTERVAL_MS)
}

async function run(key, action) {
  busy.value = key
  actionError.value = null
  flash.value = null
  try {
    await action()
  } catch (error) {
    actionError.value = error.message || t('billing.errors.generic')
  } finally {
    busy.value = null
  }
}

function select(plan) {
  const kind = actionFor(plan)
  return run(plan.code, async () => {
    if (kind === 'checkout') {
      const url = await startCheckout({ plan: plan.code, interval: interval.value })
      window.location.assign(url)
      return
    }
    await changePlan({ plan: plan.code, interval: interval.value })
    flash.value = t('billing.changed')
    pollUntil((sub) => sub.plan === plan.code && sub.interval === interval.value)
  })
}

function manage() {
  return run('portal', async () => {
    window.location.assign(await openPortal())
  })
}

onMounted(async () => {
  try {
    const [catalog] = await Promise.all([getPlans(), refresh()])
    plans.value = catalog.plans
  } catch (error) {
    loadError.value = error.message || t('billing.loadError')
  } finally {
    loading.value = false
  }

  const checkout = route.query.checkout
  if (checkout === 'success' || checkout === 'cancel') {
    flash.value = t(`billing.checkout.${checkout}`)
    // La URL de regreso no debe quedarse: recargarla repetiría el aviso.
    void router.replace({ query: { ...route.query, checkout: undefined } })
    if (checkout === 'success') pollUntil((sub) => isPaid(sub.plan))
  }
})

onBeforeUnmount(() => clearTimeout(pollTimer))
</script>

<style scoped>
.billing {
  max-width: 1040px;
  /* Bajo la barra fija de 56px. */
  margin: 56px auto 0;
  padding: var(--k-space-6) var(--k-space-5) var(--k-space-7);
}

.bl-head { margin-bottom: var(--k-space-5); }
.bl-title {
  margin: 0 0 var(--k-space-2);
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  color: var(--k-color-text);
}
.bl-sub,
.bl-state,
.bl-flash {
  margin: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  color: var(--k-text-muted);
}
.bl-banner { margin-bottom: var(--k-space-5); }
.bl-state--err { color: var(--k-state-error-text); }
.bl-flash,
.bl-state--err { margin-bottom: var(--k-space-4); }
.bl-flash { color: var(--k-color-text); }

.bl-card {
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
  padding: var(--k-space-5);
}
.bl-card-title {
  margin: 0 0 var(--k-space-2);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-large);
  color: var(--k-color-text);
}
.bl-hint {
  margin: 0 0 var(--k-space-4);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}
.bl-hint--last { margin-bottom: 0; }
.bl-warning {
  margin: 0 0 var(--k-space-4);
  padding: var(--k-space-3) var(--k-space-4);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-alert-warning-text);
  background: var(--k-alert-warning-bg);
  border: var(--k-border-width) solid var(--k-alert-warning-border);
}

.bl-current { margin-bottom: var(--k-space-6); }
.bl-current-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--k-space-3);
}
.bl-badge {
  padding: var(--k-space-1) var(--k-space-3);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  color: var(--k-color-primary);
  border: var(--k-border-width) solid var(--k-color-primary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.bl-current-actions { margin-top: var(--k-space-4); }

.bl-usage { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--k-space-3); }
.bl-usage-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--k-space-1) var(--k-space-3);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
}
.bl-usage-label { color: var(--k-text-soft); }
.bl-usage-value { color: var(--k-color-text); }
.bl-usage-bar {
  grid-column: 1 / -1;
  height: 4px;
  background: var(--k-shade-6);
}
.bl-usage-fill { display: block; height: 100%; background: var(--k-color-primary); }
.bl-usage-bar.is-full .bl-usage-fill { background: var(--k-state-error-text); }

.bl-interval {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--k-space-2);
  margin-bottom: var(--k-space-4);
}
.bl-interval-btn {
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-4);
  background: none;
  border: var(--k-border-width) solid var(--k-shade-7);
  color: var(--k-text-muted);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  cursor: pointer;
  transition: var(--k-transition-ui);
}
.bl-interval-btn.is-active { color: var(--k-color-primary); border-color: var(--k-color-primary); }
.bl-interval-note {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  color: var(--k-text-muted);
}

.bl-plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--k-space-4);
}
.bl-plan { display: flex; flex-direction: column; }
.bl-plan.is-current { border-color: var(--k-color-primary); }
.bl-price { margin: 0 0 var(--k-space-4); font-family: var(--k-font-sans); color: var(--k-color-text); }
.bl-price-amount { font-size: var(--k-font-size-heading-2); }
.bl-price-period { margin-left: var(--k-space-1); font-size: var(--k-font-size-caption-lg); color: var(--k-text-muted); }

.bl-list {
  margin: 0 0 var(--k-space-4);
  padding-left: var(--k-space-5);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-color-text);
  display: grid;
  gap: var(--k-space-1);
}
.bl-list--features { color: var(--k-text-soft); }
.bl-plan-action { margin-top: auto; }

.bl-btn {
  width: 100%;
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-4);
  background: var(--k-color-primary);
  border: var(--k-border-width) solid var(--k-color-primary);
  color: var(--k-color-bg);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  cursor: pointer;
  transition: var(--k-transition-ui);
}
.bl-btn--ghost { width: auto; background: none; color: var(--k-color-primary); }
.bl-btn:disabled { opacity: var(--k-state-disabled-opacity); cursor: not-allowed; }
.bl-btn:not(:disabled):hover { filter: brightness(var(--k-state-hover-brightness)); }

@media (max-width: 600px) {
  .billing { padding: var(--k-space-5) var(--k-space-4) var(--k-space-6); }
}
</style>
