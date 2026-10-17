<template>
  <main class="nf-root">
    <section class="nf-card" aria-labelledby="nf-title">
      <img src="@/assets/img/kontrol.png" alt="Kontrol" class="nf-logo" />
      <p class="nf-code" aria-hidden="true">404</p>
      <h1 id="nf-title" class="nf-title">{{ t('notFound.title') }}</h1>
      <p class="nf-text">{{ t('notFound.description') }}</p>
      <p class="nf-path">{{ route.fullPath }}</p>
      <div class="nf-actions">
        <RouterLink :to="home" class="nf-btn nf-btn--primary">{{ t('notFound.home') }}</RouterLink>
        <button v-if="canGoBack" type="button" class="nf-btn nf-btn--ghost" @click="router.back()">
          {{ t('notFound.back') }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Con sesión, al inicio de la app (los guards del router mandan a onboarding
// a quien aún no tiene empresa); sin sesión, a la landing.
const home = computed(() => {
  if (!authStore.isLoggedIn) return { name: 'landing' }
  return authStore.isSuperUser ? { name: 'admin-dashboard' } : { name: 'dashboard' }
})

// vue-router guarda la ruta anterior en history.state.back. Si se llegó a la
// 404 desde fuera (enlace roto, URL escrita a mano), «Volver» sacaría al
// usuario de la app, así que no se ofrece.
const canGoBack = computed(() => Boolean(window.history.state?.back))
</script>

<style scoped>
.nf-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--k-space-6) var(--k-space-5);
  font-family: var(--k-font-sans);
  color: var(--k-color-text);
}

.nf-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--k-space-3);
  max-width: 480px;
  text-align: center;
}

/* Sin preflight de Tailwind: <h1> y <p> traen el margen por defecto del
   navegador (1em, y en el código son 160px). El espaciado lo da el gap. */
.nf-card > * {
  margin: 0;
}

.nf-logo {
  width: 40px;
  height: 40px;
  margin-bottom: var(--k-space-5);
}

.nf-code {
  font-family: var(--k-font-display);
  font-size: clamp(96px, 18vw, 160px);
  line-height: 1;
  color: var(--k-color-primary);
  letter-spacing: var(--k-tracking-tight);
  margin-bottom: var(--k-space-5);
}

.nf-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-display-2);
  font-weight: 400;
  line-height: 1.15;
}

.nf-text {
  font-size: var(--k-font-size-body-large);
  line-height: 1.6;
  color: var(--k-text-muted);
}

.nf-path {
  max-width: 100%;
  padding: var(--k-space-1) var(--k-space-3);
  border: var(--k-border-width) solid var(--k-color-border);
  border-radius: var(--k-radius-sm);
  font-family: var(--k-font-mono);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-dim);
  overflow-wrap: anywhere;
}

.nf-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--k-space-3);
  margin-top: var(--k-space-5);
}

.nf-btn {
  padding: var(--k-space-3) var(--k-space-5);
  border-radius: var(--k-radius-sm);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: var(--k-transition-ui);
}

.nf-btn--primary {
  background: var(--k-color-primary);
  border: var(--k-border-width) solid var(--k-color-primary);
  color: var(--k-form-btn-text);
}

.nf-btn--primary:hover {
  background: var(--k-color-primary-2);
  border-color: var(--k-color-primary-2);
}

.nf-btn--ghost {
  background: transparent;
  border: var(--k-border-width) solid var(--k-color-border);
  color: var(--k-color-text);
}

.nf-btn--ghost:hover {
  border-color: var(--k-color-primary);
  color: var(--k-color-primary);
}

@media (max-width: 480px) {
  .nf-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>
