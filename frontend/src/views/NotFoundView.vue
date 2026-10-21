<template>
  <main class="nf-root">
    <section class="nf-card" aria-labelledby="nf-title">
      <!-- «4 K 4»: el logo 3D del login ocupa el lugar del cero. -->
      <div class="nf-code" role="img" :aria-label="t('notFound.codeLabel')">
        <span class="nf-digit" data-text="4" aria-hidden="true">4</span>
        <KontrolLogo3D
          class="nf-logo3d"
          width="var(--nf-logo-size)"
          height="var(--nf-logo-size)"
          :intensity="0.6"
          aria-hidden="true"
        />
        <span class="nf-digit nf-digit--late" data-text="4" aria-hidden="true">4</span>
      </div>

      <h1 id="nf-title" class="nf-title">{{ t('notFound.title') }}</h1>
      <p class="nf-text">{{ t('notFound.description') }}</p>

      <p class="nf-path">
        <XCircleIcon class="nf-path-icon" :size="14" aria-hidden="true" />
        <span class="visually-hidden">{{ t('notFound.missingPath') }}</span>
        <s class="nf-path-url">{{ route.fullPath }}</s>
      </p>

      <div class="nf-actions">
        <RouterLink :to="home" class="nf-btn nf-btn--primary">{{ t('notFound.home') }}</RouterLink>
        <Button
          v-if="canGoBack"
          class="nf-btn nf-btn--ghost"
          :label="t('notFound.back')"
          back-color="transparent"
          hover-back="transparent"
          @click="router.back()"
        />
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { XCircleIcon } from 'lucide-vue-next'
import KontrolLogo3D from '@/components/UI/KontrolLogo3D/KontrolLogo3D.vue'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/UI/Button/Button.vue'

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
  --nf-digit-size: clamp(96px, 16vw, 176px);
  --nf-logo-size: clamp(140px, 22vw, 250px);

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
  max-width: 560px;
  text-align: center;
}

/* Sin preflight de Tailwind: <h1> y <p> traen el margen por defecto del
   navegador. El espaciado lo da el gap. */
.nf-card > * {
  margin: 0;
}

/* ── 4 K 4 ─────────────────────────────────────────────── */
.nf-code {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--k-space-3);
}

/* El modelo ocupa ~70 % de su lienzo; el margen negativo junta los 4 con la K. */
.nf-logo3d {
  flex: none;
  margin: 0 calc(var(--nf-logo-size) * -0.12);
}

.nf-digit {
  position: relative;
  font-family: var(--k-font-display);
  font-size: var(--nf-digit-size);
  line-height: 1;
  color: var(--k-color-primary);
  /* Las cifras de Playfair se dibujan en la parte baja de la caja de línea:
     el centro del «4» queda 0.22em por debajo del centro de la caja (medido
     con measureText), y el modelo 3D sí está centrado en la suya. Subirlas
     alinea los tres centros. */
  transform: translateY(-0.22em);
}

/* Glitch: dos copias del dígito, una en el rojo de error y otra en el dorado
   oscuro, que se desplazan y recortan en ráfagas cortas. Casi todo el ciclo
   el número se ve limpio; el fallo aparece y se va. */
.nf-digit::before,
.nf-digit::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.nf-digit::before {
  color: var(--k-state-error-text);
  animation: nf-glitch-a 4.2s steps(1) infinite;
}

.nf-digit::after {
  color: var(--k-color-primary-2);
  animation: nf-glitch-b 4.2s steps(1) infinite;
}

/* El segundo 4 falla en otro momento que el primero. */
.nf-digit--late::before,
.nf-digit--late::after {
  animation-delay: -1.7s;
}

@keyframes nf-glitch-a {
  0%,
  84%,
  100% {
    opacity: 0;
    transform: none;
    clip-path: inset(0 0 0 0);
  }
  86% {
    opacity: 0.95;
    transform: translate(-10px, 3px);
    clip-path: inset(12% 0 58% 0);
  }
  89% {
    opacity: 0.95;
    transform: translate(9px, -3px);
    clip-path: inset(62% 0 8% 0);
  }
  92% {
    opacity: 0.85;
    transform: translate(-7px, 0);
    clip-path: inset(36% 0 40% 0);
  }
}

@keyframes nf-glitch-b {
  0%,
  85%,
  100% {
    opacity: 0;
    transform: none;
    clip-path: inset(0 0 0 0);
  }
  87% {
    opacity: 0.9;
    transform: translate(10px, -2px);
    clip-path: inset(48% 0 22% 0);
  }
  90% {
    opacity: 0.9;
    transform: translate(-9px, 3px);
    clip-path: inset(6% 0 70% 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nf-digit::before,
  .nf-digit::after {
    display: none;
  }
}

/* ── Texto ─────────────────────────────────────────────── */
.nf-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-display-2);
  font-weight: 400;
  line-height: 1.15;
}

.nf-text {
  max-width: 440px;
  font-size: var(--k-font-size-body-large);
  line-height: 1.6;
  color: var(--k-text-muted);
}

/* La ruta pedida, tachada y marcada en rojo: es la que no existe. */
.nf-path {
  display: inline-flex;
  align-items: center;
  gap: var(--k-space-2);
  max-width: 100%;
  padding: var(--k-space-1) var(--k-space-3);
  border: var(--k-border-width) solid var(--k-state-error-text);
  border-radius: var(--k-radius-sm);
  font-family: var(--k-font-mono);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-state-error-text);
}

.nf-path-icon {
  flex: none;
}

.nf-path-url {
  color: var(--k-text-dim);
  text-decoration-color: var(--k-state-error-text);
  overflow-wrap: anywhere;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ── Acciones ──────────────────────────────────────────── */
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
.btn.nf-btn--ghost {
  min-height: 0;
  padding: var(--k-space-3) var(--k-space-5);
  border: var(--k-border-width) solid var(--k-color-border);
  border-radius: var(--k-radius-sm);
  color: var(--k-color-text);
  font-weight: var(--k-font-weight-semibold);
}
.btn.nf-btn--ghost:hover:not(:disabled) {
  border-color: var(--k-color-primary);
  color: var(--k-color-primary);
  box-shadow: none;
}

@media (max-width: 480px) {
  .nf-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>
