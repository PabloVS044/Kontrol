<template>
  <Teleport to="body">
    <section
      v-if="visible"
      ref="bannerRef"
      class="storage-banner"
      role="region"
      :aria-label="t('storageConsent.ariaLabel')"
      tabindex="-1"
      @keydown.esc="decision && closePanel()"
    >
      <h2 class="storage-banner-title">{{ t('storageConsent.title') }}</h2>
      <p>{{ t('storageConsent.essential') }}</p>
      <p>{{ t('storageConsent.preferences') }}</p>

      <StorageConsentControls />

      <div class="storage-banner-footer">
        <RouterLink to="/legal/cookies" class="storage-banner-link">
          {{ t('storageConsent.policyLink') }}
        </RouterLink>
        <button v-if="decision" type="button" class="storage-banner-close" @click="closePanel">
          {{ t('storageConsent.close') }}
        </button>
      </div>
    </section>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useStorageConsent } from '../composables/useStorageConsent.js'
import StorageConsentControls from './StorageConsentControls.vue'

/**
 * Aviso de almacenamiento en el navegador (L-3).
 *
 * Aparece en la primera visita, en cualquier ruta y con o sin sesión, hasta que
 * el usuario acepta o rechaza las preferencias. No bloquea la página: lo
 * imprescindible funciona sin responder, y mientras no responde no se guarda
 * ninguna preferencia. Se vuelve a abrir desde el pie de página
 * ("Preferencias de cookies") para cambiar la decisión.
 *
 * Va fuera de #app (Teleport) para seguir siendo usable cuando el aviso de
 * Términos deja la app inerte.
 */

const { t } = useI18n()
const { decision, panelOpen, closePanel } = useStorageConsent()

const bannerRef = ref(null)
const visible = computed(() => decision.value === null || panelOpen.value)

// Al reabrirlo a propósito, el foco va al aviso para que el teclado y el
// lector de pantalla lo encuentren. En la primera visita no se roba el foco.
watch(panelOpen, async (open) => {
  if (!open) return
  await nextTick()
  bannerRef.value?.focus()
})
</script>

<style scoped>
/* Por encima del aviso de Términos (10000), para poder decidir aunque esté
   abierto. */
.storage-banner {
  position: fixed;
  left: var(--k-space-4);
  bottom: var(--k-space-4);
  z-index: 10001;
  width: calc(100% - 2 * var(--k-space-4));
  max-width: 440px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--k-space-3);
  padding: var(--k-space-5);
  background: color-mix(in srgb, var(--k-color-bg-2) 92%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--k-color-border);
  border-radius: var(--k-radius-lg);
  box-shadow: var(--k-shadow-modal);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  line-height: 1.5;
  color: var(--k-text-muted);
  text-align: left;
}

.storage-banner:focus {
  outline: none;
}

.storage-banner:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
}

.storage-banner p {
  margin: 0;
}

.storage-banner-title {
  margin: 0;
  font-size: var(--k-font-size-body-main);
  font-weight: var(--k-font-weight-bold);
  color: var(--k-color-text);
}

.storage-banner-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--k-space-3);
}

.storage-banner-link {
  color: var(--k-color-primary);
  font-weight: var(--k-font-weight-semibold);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.storage-banner-close {
  padding: 0;
  background: none;
  border: none;
  font: inherit;
  color: var(--k-text-soft);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.storage-banner-link:focus-visible,
.storage-banner-close:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
  border-radius: var(--k-radius-sm);
}
</style>
