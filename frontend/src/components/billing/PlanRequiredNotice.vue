<template>
  <!-- PAY-1 — Aviso global cuando el backend responde 403 por plan. Lo dispara
       services/http.js con el evento `api:plan-required`. -->
  <div v-if="notice" class="plan-notice" role="alert">
    <p class="pn-title">{{ title }}</p>
    <p class="pn-body">{{ body }}</p>
    <div class="pn-actions">
      <RouterLink class="pn-link" :to="{ name: 'billing' }" @click="dismiss">{{ $t('billing.gate.cta') }}</RouterLink>
      <button type="button" class="pn-close" @click="dismiss">{{ $t('billing.gate.dismiss') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const { t, te } = useI18n()
const authStore = useAuthStore()
const notice = ref(null)

const planName = (code) => (code ? t(`billing.plans.${code}.name`) : '')

const title = computed(() =>
  notice.value?.code === 'PLAN_LIMIT_REACHED' ? t('billing.gate.limitTitle') : t('billing.gate.featureTitle')
)

const body = computed(() => {
  const value = notice.value
  if (!value) return ''
  if (value.code === 'PLAN_LIMIT_REACHED') {
    const key = `billing.gate.limit.${value.resource}`
    return te(key) ? t(key, { limit: value.limit }) : t('billing.gate.limitGeneric')
  }
  const moduleKey = `billing.modules.${value.feature}`
  return t('billing.gate.feature', {
    module: te(moduleKey) ? t(moduleKey) : value.feature,
    plan: planName(value.requiredPlan),
  })
})

function dismiss() {
  notice.value = null
}

function onPlanRequired(event) {
  notice.value = event.detail
  // El plan pudo cambiar desde que se cargó el contexto (p. ej. canceló otro
  // owner o venció el período): se refresca para que la interfaz no mienta.
  void authStore.loadAccessContext()
}

onMounted(() => window.addEventListener('api:plan-required', onPlanRequired))
onBeforeUnmount(() => window.removeEventListener('api:plan-required', onPlanRequired))
</script>

<style scoped>
.plan-notice {
  position: fixed;
  right: var(--k-space-5);
  bottom: var(--k-space-5);
  z-index: 60;
  max-width: 360px;
  padding: var(--k-space-4) var(--k-space-5);
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-color-primary);
}
.pn-title {
  margin: 0 0 var(--k-space-2);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  color: var(--k-color-text);
}
.pn-body {
  margin: 0 0 var(--k-space-3);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}
.pn-actions { display: flex; align-items: center; gap: var(--k-space-4); }
.pn-link {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-color-primary);
  text-decoration: none;
}
.pn-link:hover { text-decoration: underline; }
.pn-close {
  min-height: var(--k-target-min-size);
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}
@media (max-width: 480px) {
  .plan-notice { left: var(--k-space-4); right: var(--k-space-4); max-width: none; }
}
</style>
