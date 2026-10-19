<template>
  <div class="onboarding-root">
    <div class="onboarding-layout">

      <!-- Left: branding / explanation -->
      <div class="onboarding-left">
        <img src="@/assets/img/kontrol.png" alt="Kontrol" class="ob-logo" />
        <h1 class="ob-headline">{{ t('onboarding.welcome') }}<br />Kontrol</h1>
        <p class="ob-tagline">{{ t('onboarding.tagline') }}</p>
        <ul class="ob-features">
          <li>
            <span class="ob-dot"></span>
            {{ t('onboarding.features.projects') }}
          </li>
          <li>
            <span class="ob-dot"></span>
            {{ t('onboarding.features.team') }}
          </li>
          <li>
            <span class="ob-dot"></span>
            {{ t('onboarding.features.inventory') }}
          </li>
        </ul>
      </div>

      <!-- Right: create empresa form -->
      <div class="onboarding-right">
        <div class="ob-card">
          <h2 class="ob-card-title">{{ t('onboarding.form.title') }}</h2>
          <p class="ob-card-sub">{{ t('onboarding.form.subtitle') }}</p>

          <form class="ob-form" @submit.prevent="submit">

            <FormField :label="t('onboarding.form.name')" :required="true">
              <input
                v-model="form.nombre"
                type="text"
                :placeholder="t('onboarding.form.namePlaceholder')"
                required
                :disabled="loading"
              />
            </FormField>

            <FormField :label="t('onboarding.form.industry')">
              <input
                v-model="form.industria"
                type="text"
                :placeholder="t('onboarding.form.industryPlaceholder')"
                :disabled="loading"
              />
            </FormField>

            <div class="ob-row">
              <FormField :label="t('onboarding.form.phone')">
                <input
                  v-model="form.telefono"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  :disabled="loading"
                />
              </FormField>
              <FormField :label="t('onboarding.form.address')">
                <input
                  v-model="form.direccion"
                  type="text"
                  :placeholder="t('onboarding.form.addressPlaceholder')"
                  :disabled="loading"
                />
              </FormField>
            </div>

            <p v-if="error" class="ob-error">{{ error }}</p>

            <Button
              class="ob-submit"
              type="submit"
              :disabled="loading"
              back-color="var(--k-color-primary)"
              hover-back="var(--k-color-primary-2)"
            >
              <span v-if="loading" class="ob-spinner" />
              {{ loading ? t('onboarding.form.submitting') : t('onboarding.form.submit') }}
            </Button>

          </form>

          <p class="ob-footer-note">{{ t('onboarding.footerNote') }}</p>
        </div>

        <Button
          class="ob-logout"
          :label="t('onboarding.signOut')"
          back-color="transparent"
          hover-back="transparent"
          @click="logout"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { apiFetch as requestApi } from '@/services/api.js'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/UI/Button/Button.vue'
import FormField from '@/components/common/FormField.vue'

const { t }     = useI18n()
const router    = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error   = ref(null)

const form = reactive({
  nombre:   '',
  industria: '',
  telefono:  '',
  direccion: '',
})

async function submit() {
  error.value   = null
  loading.value = true

  try {
    const res = await requestApi('/api/companies', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre:    form.nombre.trim(),
        industria: form.industria.trim() || undefined,
        telefono:  form.telefono.trim()  || undefined,
        direccion: form.direccion.trim() || undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      error.value = data.message || `Error ${res.status}`
      return
    }

    // Reload empresas — the new one will be auto-selected
    await authStore.loadEmpresas()
    router.push({ name: 'dashboard' })
  } catch {
    error.value = t('onboarding.form.networkError')
  } finally {
    loading.value = false
  }
}

function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.onboarding-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--k-font-sans);
  color: var(--k-color-text);
  padding: 40px 24px;
}

.onboarding-layout {
  display: flex;
  gap: 80px;
  max-width: 1000px;
  width: 100%;
  align-items: center;
}

/* ── Left ── */
.onboarding-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ob-logo {
  width: 40px;
  height: 40px;
}

.ob-headline {
  font-family: var(--k-font-display);
  font-size: 52px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--k-color-text);
}

.ob-tagline {
  font-size: var(--k-font-size-body-main);
  color: var(--k-text-muted);
  line-height: 1.7;
  max-width: 380px;
}

.ob-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.ob-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--k-font-size-body-small);
  color: var(--k-text-dim);
}

.ob-dot {
  width: 6px;
  height: 6px;
  background: var(--k-color-primary);
  flex-shrink: 0;
}

/* ── Right ── */
.onboarding-right {
  flex: none;
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ob-card {
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
  padding: 36px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ob-card-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  font-weight: 400;
  color: var(--k-color-text);
}

.ob-card-sub {
  font-size: var(--k-font-size-body-small);
  color: var(--k-text-dim);
  margin-top: -12px;
}

.ob-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ob-form input {
  background: var(--k-shade-1);
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  padding: 10px 12px;
  outline: none;
  transition: var(--k-transition-ui);
  width: 100%;
  min-width: 0;
}

.ob-form input:focus {
  border-color: var(--k-color-primary);
  background: var(--k-form-input-focus-bg);
}

.ob-form input::placeholder { color: var(--k-text-placeholder); }

.ob-form input:disabled {
  opacity: var(--k-state-disabled-opacity);
  cursor: not-allowed;
}

/* minmax(0, 1fr): con `1fr` a secas la columna no baja del ancho mínimo
   del <input> (size=20) y Address se salía de la tarjeta. */
.ob-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ob-error {
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-state-error-text);
}

.btn.ob-submit {
  border-radius: 0;
  color: var(--k-form-btn-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  font-weight: var(--k-font-weight-semibold);
  padding: 12px 24px;
  gap: 8px;
}

.ob-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(var(--k-color-black-rgb), 0.3);
  border-top-color: var(--k-form-btn-text);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.ob-footer-note {
  font-size: var(--k-font-size-caption);
  color: var(--k-text-faint);
  line-height: 1.6;
  padding-top: 8px;
  border-top: var(--k-border-width) solid var(--k-shade-4);
}

.btn.ob-logout {
  color: var(--k-text-faint);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-regular);
  padding: 4px;
}

.btn.ob-logout:hover:not(:disabled) {
  color: var(--k-text-muted);
  box-shadow: none;
}

/* ── Responsive ── */
@media (max-width: 820px) {
  .onboarding-layout {
    flex-direction: column;
    gap: 40px;
  }
  .onboarding-right {
    width: 100%;
  }
  .ob-headline {
    font-size: 40px;
  }
}

@media (max-width: 480px) {
  .ob-card { padding: 24px; }
  .ob-row  { grid-template-columns: 1fr; }
}
</style>
